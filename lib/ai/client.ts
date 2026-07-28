import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { db } from "@/lib/db";

/**
 * The single entry point to Claude.
 *
 * Everything goes through `generate` so that three things are true without any
 * caller having to remember them:
 *
 *  1. Every call is metered into `AiRun`. A two-person company needs to see
 *     AI spend without standing up an observability stack, and this is it.
 *  2. Every failure is a value, not an exception. A model outage must degrade
 *     a page, never 500 it.
 *  3. Every output is schema-validated before it can reach the database.
 *     Structured outputs constrain generation, and Zod re-checks the result —
 *     a model that returns something unusable is a rejected run, not a
 *     half-written record.
 */

export const MODEL = "claude-opus-5";

/** Effort is the main cost lever. Classification is cheap, generation isn't. */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

let cached: Anthropic | null = null;

export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  if (!cached) cached = new Anthropic();
  return cached;
}

export interface AiFailure {
  ok: false;
  /**
   * `not_configured` is an expected state, not an error: the app ships with
   * pre-generated content and is meant to run without a key. Callers render a
   * setup notice for it and a softer "try again" for the rest.
   */
  reason: "not_configured" | "invalid_output" | "api_error";
  message: string;
}

export interface AiSuccess<T> {
  ok: true;
  data: T;
}

export type AiResult<T> = AiSuccess<T> | AiFailure;

export interface GenerateOptions<T extends z.ZodType> {
  /** Names the call in `AiRun`; keep stable so the spend view groups properly. */
  feature: string;
  /**
   * The stable half of the prompt — policy, destination briefing, anything
   * identical across calls for the same subject. Sent as a cached system block
   * so repeat calls read it at a fraction of the input price. Keep volatile
   * text (timestamps, ids) out of this or the cache never hits.
   */
  cachedSystem: string;
  /** The per-call half of the system prompt. Not cached. */
  system?: string;
  prompt: string;
  schema: T;
  effort?: Effort;
  maxTokens?: number;
}

/**
 * Run a structured generation. Returns validated data or a typed failure.
 */
export async function generate<T extends z.ZodType>(
  options: GenerateOptions<T>,
): Promise<AiResult<z.infer<T>>> {
  const {
    feature,
    cachedSystem,
    system,
    prompt,
    schema,
    effort = "high",
    maxTokens = 16000,
  } = options;

  if (!isConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "ANTHROPIC_API_KEY is not set. Seeded content is shown instead; set a key to enable live generation.",
    };
  }

  const started = Date.now();

  try {
    const response = await client().messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      // Adaptive thinking: Claude decides how much reasoning each call needs,
      // which suits a workload spanning one-line classification and full
      // itinerary generation.
      thinking: { type: "adaptive" },
      output_config: {
        effort,
        format: zodOutputFormat(schema),
      },
      system: [
        {
          type: "text",
          text: cachedSystem,
          cache_control: { type: "ephemeral" },
        },
        ...(system ? [{ type: "text" as const, text: system }] : []),
      ],
      messages: [{ role: "user", content: prompt }],
    });

    const usage = response.usage;

    await recordRun({
      feature,
      effort,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage?.cache_creation_input_tokens ?? 0,
      latencyMs: Date.now() - started,
      ok: true,
    });

    // Safety classifiers can decline a request with a 200 and an empty body.
    // Checking stop_reason before reading content is what stops that becoming
    // a confusing parse error further down.
    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        reason: "api_error",
        message: "The request was declined by safety classifiers.",
      };
    }

    const parsed = schema.safeParse(response.parsed_output);
    if (!parsed.success) {
      await recordRun({
        feature,
        effort,
        latencyMs: Date.now() - started,
        ok: false,
        error: `schema validation failed: ${parsed.error.message.slice(0, 400)}`,
      });
      return {
        ok: false,
        reason: "invalid_output",
        message: "The model returned output that did not match the schema.",
      };
    }

    return { ok: true, data: parsed.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordRun({
      feature,
      effort,
      latencyMs: Date.now() - started,
      ok: false,
      error: message.slice(0, 400),
    });
    return { ok: false, reason: "api_error", message };
  }
}

interface RunRecord {
  feature: string;
  effort: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}

/**
 * Metering must never be the reason a request fails, so a write failure here
 * is swallowed. Losing a spend row is cheap; losing a concierge reply is not.
 */
async function recordRun(record: RunRecord): Promise<void> {
  try {
    await db.aiRun.create({
      data: {
        feature: record.feature,
        model: MODEL,
        effort: record.effort,
        inputTokens: record.inputTokens ?? 0,
        outputTokens: record.outputTokens ?? 0,
        cacheReadTokens: record.cacheReadTokens ?? 0,
        cacheWriteTokens: record.cacheWriteTokens ?? 0,
        latencyMs: record.latencyMs,
        ok: record.ok,
        error: record.error,
      },
    });
  } catch {
    // Intentionally ignored — see above.
  }
}

/**
 * The house rules, prepended to every prompt as part of the cached prefix.
 * Written once here so the brand voice and the commercial boundaries are
 * consistent across every AI surface rather than restated per module.
 */
export const HOUSE_CONTEXT = `You are working for Tailorsail, which sells sailing holidays in Italy, Ibiza and Croatia.

How Tailorsail works:
- We contract charter capacity from local operators and resell it as a packaged holiday. We are the merchant of record, not an agent acting for the operator.
- Every price shown to a customer is the full amount payable, including anything the marina collects on arrival. There are no surprises at the dock.
- We verify operators from documents: charter licence, insurance certificate with an expiry date, and a safety equipment declaration. We do NOT physically inspect boats and must never imply that we do.
- Our preparation programme is location-specific. Advice for the Kvarner is not advice for Ibiza, and generic sailing filler is worse than nothing.

Absolute rules:
- Never disclose, estimate, or hint at what Tailorsail pays an operator, our margin, or our commercial terms. That information is internal.
- Never invent a discount, a "was" price, or a saving.
- Never promise a refund, a price change, a cancellation outcome, or anything about safety or medical matters. Those are decided by a human.
- Never state a fact about a specific location that is not supported by the briefing you were given. If the briefing does not cover it, say so plainly.`;
