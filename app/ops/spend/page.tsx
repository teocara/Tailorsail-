import { db } from "@/lib/db";
import { isConfigured, MODEL } from "@/lib/ai/client";
import { loadSpendSummary } from "@/lib/ops-queries";
import { formatPct } from "@/lib/money";
import { AiNotice, Card, Container, Section, Stat } from "@/components/ui";
import { perRequest } from "@/lib/render-mode";

export const metadata = { title: "AI spend" };

const FEATURE_LABEL: Record<string, string> = {
  "generate-itinerary": "Itinerary generation",
  "generate-readiness": "Readiness programmes",
  "parse-listing": "Operator listing extraction",
  concierge: "Concierge replies",
  "trip-finder": "Natural-language search",
  "rate-negotiator": "Rate proposals",
  "pricing-advisor": "Price change narration",
};

/**
 * AI spend, from the AiRun row every generation writes.
 *
 * A company that runs its operations on a model needs to see what that costs
 * without standing up an observability stack, and this is that. The number
 * worth watching is the cache hit rate — the destination briefings sit behind
 * a cache breakpoint, so a hit rate that collapses almost always means someone
 * made the supposedly-stable prefix not stable.
 */
export default async function SpendPage() {
  await perRequest();
  const [summary, bookings] = await Promise.all([
    loadSpendSummary(),
    db.bookingRequest.count(),
  ]);

  const totalTokens =
    summary.inputTokens + summary.outputTokens + summary.cacheReadTokens;

  return (
    <Section className="!py-8">
      <Container>
        {!isConfigured() ? (
          <div className="mb-6">
            <AiNotice>
              <strong className="font-medium">No API key configured.</strong>{" "}
              Every AI feature is running from committed content or its
              deterministic fallback, so there is nothing to meter. Set{" "}
              <code>ANTHROPIC_API_KEY</code> and this fills in.
            </AiNotice>
          </div>
        ) : null}

        <Card className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Calls" value={String(summary.calls)} hint={MODEL} />
            <Stat
              label="Failures"
              value={String(summary.failures)}
              hint={
                summary.calls > 0
                  ? formatPct(summary.failures / summary.calls)
                  : "—"
              }
            />
            <Stat
              label="Tokens"
              value={totalTokens.toLocaleString("en-GB")}
              hint="input + output + cache reads"
            />
            <Stat
              label="Cache hit rate"
              value={formatPct(summary.cacheHitRate)}
              hint="Share of input served from cache"
            />
            <Stat
              label="Calls per booking"
              value={bookings > 0 ? (summary.calls / bookings).toFixed(1) : "—"}
              hint={`${bookings} bookings`}
            />
          </div>
        </Card>

        {summary.byFeature.length > 0 ? (
          <Card className="mt-6 overflow-hidden">
            <div className="border-b border-[var(--color-line)] px-5 py-4">
              <p className="font-[family-name:var(--font-display)] text-lg">
                By feature
              </p>
            </div>
            <div className="scroll-x">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                    <th className="px-5 py-2 font-medium">Feature</th>
                    <th className="px-3 py-2 text-right font-medium">Calls</th>
                    <th className="px-3 py-2 text-right font-medium">In</th>
                    <th className="px-3 py-2 text-right font-medium">Cached</th>
                    <th className="px-3 py-2 text-right font-medium">Out</th>
                    <th className="px-3 py-2 text-right font-medium">Fails</th>
                    <th className="px-5 py-2 text-right font-medium">
                      Latency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byFeature.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-t border-[var(--color-line)]"
                    >
                      <td className="px-5 py-2.5">
                        {FEATURE_LABEL[row.feature] ?? row.feature}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {row.calls}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {row.inputTokens.toLocaleString("en-GB")}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {row.cacheReadTokens.toLocaleString("en-GB")}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {row.outputTokens.toLocaleString("en-GB")}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {row.failures}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
                        {row.avgLatencyMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="mt-6 p-8 text-sm text-[var(--color-ink-muted)]">
            No AI calls recorded yet.
          </Card>
        )}

        <Card className="mt-6 p-6">
          <p className="font-[family-name:var(--font-display)] text-lg">
            Where the money goes, and why it stays small
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--color-ink-muted)]">
            <li>
              <strong className="font-medium text-[var(--color-ink)]">
                Content is generated once, not per view.
              </strong>{" "}
              Itineraries and readiness programmes are properties of the trip,
              so they are generated offline, reviewed by a person, and
              committed. A million page views cost nothing.
            </li>
            <li>
              <strong className="font-medium text-[var(--color-ink)]">
                The expensive half of each prompt is cached.
              </strong>{" "}
              The house rules and the destination briefing are byte-identical
              across every call for a cruising ground, so they sit behind a
              cache breakpoint and are read back at a fraction of the price.
            </li>
            <li>
              <strong className="font-medium text-[var(--color-ink)]">
                Effort is matched to the job.
              </strong>{" "}
              Search parsing runs at low effort; itinerary generation runs at
              high. Using one setting everywhere is the easiest way to overpay.
            </li>
            <li>
              <strong className="font-medium text-[var(--color-ink)]">
                Arithmetic is never a model call.
              </strong>{" "}
              Pricing, margin and triage are deterministic code. The model
              explains them; it does not compute them.
            </li>
          </ul>
        </Card>
      </Container>
    </Section>
  );
}
