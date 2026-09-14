import { generate, HOUSE_CONTEXT, type AiResult } from "./client";
import { briefingBlock, type DestinationBriefing } from "./destination-context";
import {
  ConciergeReplySchema,
  type ConciergeCategory,
  type ConciergeReply,
} from "./schemas";

/**
 * The concierge: AI drafts every reply, and a deterministic gate decides
 * whether it may send.
 *
 * The gate matters more than the drafting. A support inbox run by two people
 * can only work if routine questions answer themselves, but "routine" has to
 * be defined by us in code, not judged by the model in the moment. So the
 * model classifies and drafts; this module decides. A category that commits
 * Tailorsail to money, a contractual outcome, or anything touching safety is
 * never auto-sendable regardless of how confident the model is.
 */

/**
 * The only categories a machine may answer unattended. Everything absent from
 * this set escalates — including OTHER, because "we couldn't classify it" is
 * the least safe moment to be sending unattended mail.
 */
const AUTO_SENDABLE: ReadonlySet<ConciergeCategory> = new Set([
  "WEATHER_AND_CONDITIONS",
  "PACKING_AND_KIT",
  "ITINERARY_AND_ROUTE",
  "SKILL_AND_EXPERIENCE",
  "WHATS_INCLUDED",
  "LOGISTICS_AND_ARRIVAL",
]);

/**
 * Confidence floor for auto-sending. Set high deliberately: the cost of a
 * needless escalation is thirty seconds of a founder's time, and the cost of a
 * confidently wrong unattended reply is the trust the whole brand is sold on.
 */
export const AUTO_SEND_CONFIDENCE = 0.82;

export type ConciergeDecision =
  | { action: "AUTO_SEND"; reply: ConciergeReply }
  | { action: "ESCALATE"; reply: ConciergeReply; escalationReason: string };

/**
 * Decide what happens to a drafted reply. Pure and synchronous so the policy
 * can be exhaustively tested without touching the model.
 */
export function routeReply(reply: ConciergeReply): ConciergeDecision {
  if (!AUTO_SENDABLE.has(reply.category)) {
    return {
      action: "ESCALATE",
      reply,
      escalationReason: `${reply.category} always goes to a human.`,
    };
  }

  // The model can always add caution; it can never remove it.
  if (reply.needsHuman) {
    return {
      action: "ESCALATE",
      reply,
      escalationReason: reply.reason || "The assistant asked for a human.",
    };
  }

  if (reply.confidence < AUTO_SEND_CONFIDENCE) {
    return {
      action: "ESCALATE",
      reply,
      escalationReason: `Confidence ${reply.confidence.toFixed(2)} is below the ${AUTO_SEND_CONFIDENCE} auto-send threshold.`,
    };
  }

  return { action: "AUTO_SEND", reply };
}

export interface ConciergeContext {
  destination: DestinationBriefing;
  trip: {
    name: string;
    format: string;
    skipper: string;
    skillLevel: string;
    durationDays: number;
    startPort: string;
    endPort: string;
  };
  boat: { name: string; model: string; type: string; lengthM: number; berths: number };
  operator: { name: string; verificationHeadline: string };
  booking: {
    reference: string;
    berths: number;
    startDate: Date;
    endDate: Date;
    status: string;
  };
  /** Customer-safe price lines only — built by buildCustomerQuote. */
  priceLines: { label: string; amountCents: number; payableAt: string }[];
  totalAllInCents: number;
  itinerary: { dayNumber: number; title: string; fromPort: string; toPort: string }[];
  readiness: { phase: string; title: string; body: string }[];
  history: { author: string; body: string }[];
}

function euro(cents: number): string {
  return `€${(cents / 100).toFixed(0)}`;
}

/**
 * Draft a reply to the traveller's latest message.
 *
 * Note what goes into the prompt: the customer-visible quote lines, never the
 * net rate. The model cannot leak commercial data it was never given.
 */
export async function draftConciergeReply(input: {
  context: ConciergeContext;
  message: string;
}): Promise<AiResult<ConciergeReply>> {
  const { context, message } = input;
  const { trip, boat, operator, booking, destination } = context;

  const priceBlock = context.priceLines
    .map((l) => `- ${l.label}: ${euro(l.amountCents)} (payable at ${l.payableAt.toLowerCase()})`)
    .join("\n");

  const itineraryBlock = context.itinerary
    .map((d) => `Day ${d.dayNumber}: ${d.title} — ${d.fromPort} to ${d.toPort}`)
    .join("\n");

  const readinessBlock = context.readiness
    .map((t) => `[${t.phase}] ${t.title}: ${t.body}`)
    .join("\n");

  const historyBlock =
    context.history.length > 0
      ? context.history.map((m) => `${m.author}: ${m.body}`).join("\n\n")
      : "(no previous messages)";

  return generate({
    feature: "concierge",
    effort: "medium",
    maxTokens: 4000,
    // Cached prefix — the policy and the destination briefing are identical
    // across every message on every booking in this cruising ground.
    cachedSystem: `${HOUSE_CONTEXT}

${briefingBlock(destination)}

You are the Tailorsail concierge, replying to a traveller who has already
booked. You write as Tailorsail, not as the operator.

Classify the message into exactly one category, then draft the reply you would
send if you were allowed to send it. A human reviews anything that needs
reviewing — your job is to be accurate and useful, not to be cautious about
whether to answer.

Set needsHuman = true whenever any of these are true, no matter how confident
you feel about the rest:
- Answering would commit Tailorsail to a price, a refund, a credit, or a date change.
- The traveller is upset, or is describing something that went wrong.
- The question touches injury, illness, medication, allergies, pregnancy, or anyone's fitness to sail.
- Answering correctly needs a fact you have not been given. Do not fill the gap.

Style:
- Warm, direct, specific. A knowledgeable friend who happens to know this coastline, not a support macro.
- Two to five sentences for a simple question. Answer first, context after.
- Use the traveller's actual booking — their dates, their boat, their route — rather than generalities.
- Never invent a detail about the boat, the marina, or the operator. If you were not told it, say you will confirm it.

The reason field is for the human reviewer, not the traveller.`,
    system: `BOOKING ${booking.reference} (${booking.status})
Trip: ${trip.name} — ${trip.durationDays} days, ${trip.format}, ${trip.skipper}, suits ${trip.skillLevel}
Route: ${trip.startPort} to ${trip.endPort}
Dates: ${booking.startDate.toISOString().slice(0, 10)} to ${booking.endDate.toISOString().slice(0, 10)}
Party: ${booking.berths} berths booked
Boat: ${boat.name}, ${boat.lengthM}m ${boat.model} (${boat.type}), sleeps ${boat.berths}
Operator: ${operator.name} — ${operator.verificationHeadline}

WHAT THEY ARE PAYING (this is the complete list; there is nothing else)
${priceBlock}
Total all-in: ${euro(context.totalAllInCents)}

ITINERARY
${itineraryBlock}

READINESS PROGRAMME
${readinessBlock}

CONVERSATION SO FAR
${historyBlock}`,
    prompt: message,
    schema: ConciergeReplySchema,
  });
}

/** Human-readable label for the transcript UI. */
export function categoryLabel(category: ConciergeCategory): string {
  const labels: Record<ConciergeCategory, string> = {
    WEATHER_AND_CONDITIONS: "Weather & conditions",
    PACKING_AND_KIT: "Packing & kit",
    ITINERARY_AND_ROUTE: "Itinerary & route",
    SKILL_AND_EXPERIENCE: "Skill & experience",
    WHATS_INCLUDED: "What's included",
    LOGISTICS_AND_ARRIVAL: "Logistics & arrival",
    PRICE_OR_PAYMENT: "Price or payment",
    CANCELLATION_OR_REFUND: "Cancellation or refund",
    SAFETY_OR_MEDICAL: "Safety or medical",
    COMPLAINT: "Complaint",
    BOOKING_CHANGE: "Booking change",
    OTHER: "Uncategorised",
  };
  return labels[category];
}

/** Exposed for tests and for the ops console's policy explainer. */
export function isAutoSendable(category: ConciergeCategory): boolean {
  return AUTO_SENDABLE.has(category);
}
