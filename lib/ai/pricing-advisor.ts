import { generate, HOUSE_CONTEXT, type AiResult } from "./client";
import { PriceNarrationSchema, type PriceNarration } from "./schemas";
import type { PriceComputation } from "@/lib/pricing/yield";

/**
 * Narrates a price move. Does not decide one.
 *
 * The split is deliberate and worth stating plainly: `lib/pricing/yield.ts`
 * computes what a customer owes, deterministically, from rules a human wrote.
 * This module explains that computation in a sentence a founder can act on.
 * Arithmetic that decides what someone pays does not belong in a probabilistic
 * model — but the judgement call of whether a +9% move is sensible on a
 * half-empty August week is exactly where a second opinion helps.
 *
 * So: the engine moves the price, this writes the note, and the human approves
 * anything the guardrails flagged.
 */
export async function narratePriceChange(input: {
  departure: {
    tripName: string;
    destinationName: string;
    startDate: Date;
    berthsTotal: number;
    berthsBooked: number;
  };
  previousPriceCents: number;
  computation: PriceComputation;
  today: Date;
}): Promise<AiResult<PriceNarration>> {
  const { departure, previousPriceCents, computation, today } = input;

  const daysOut = Math.floor(
    (departure.startDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  const occupancy = departure.berthsTotal
    ? Math.round((departure.berthsBooked / departure.berthsTotal) * 100)
    : 0;

  const deltaCents = computation.priceCents - previousPriceCents;
  const deltaPct =
    previousPriceCents > 0 ? (deltaCents / previousPriceCents) * 100 : 0;

  const rulesBlock =
    computation.appliedRules.length > 0
      ? computation.appliedRules
          .map((r) => `- ${r.name} (${r.kind}): x${r.multiplier.toFixed(2)}`)
          .join("\n")
      : "- none (base margin only)";

  return generate({
    feature: "pricing-advisor",
    effort: "low",
    maxTokens: 1500,
    cachedSystem: `${HOUSE_CONTEXT}

You explain automated price changes to the two people who run Tailorsail. They
know the business; they do not need pricing theory. They need to know whether
this specific move is sensible and whether it needs their attention.

Write:
- headline: one line stating the move and the single reason for it.
- explanation: two to four sentences. What drove it, and what it implies for this departure selling. Mention occupancy and days-to-departure where they matter.
- recommendation: APPLY when the move follows obviously from the signals. REVIEW when the guardrails clamped it, when the move is unusually large, or when the signals conflict. HOLD when applying it looks likely to hurt — for example pushing price up on a departure that is already struggling to sell.

Never recommend a price outside the margin guardrails; they exist to stop the
engine selling below our cost of service or taxing the repeat rate. If the
computation was clamped, say so and treat it as something a human should see.`,
    system: `Today: ${today.toISOString().slice(0, 10)}

DEPARTURE
${departure.tripName} — ${departure.destinationName}
Departs ${departure.startDate.toISOString().slice(0, 10)} (${daysOut} days out)
Sold: ${departure.berthsBooked}/${departure.berthsTotal} berths (${occupancy}%)

PRICE MOVE
Was: €${(previousPriceCents / 100).toFixed(0)}
Now: €${(computation.priceCents / 100).toFixed(0)}
Change: ${deltaCents >= 0 ? "+" : ""}€${(deltaCents / 100).toFixed(0)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)
Resulting margin: ${(computation.marginPct * 100).toFixed(1)}%
Guardrail: ${computation.clamped ? `CLAMPED at the ${computation.clampReason?.toLowerCase()}` : "not hit"}

RULES THAT FIRED
${rulesBlock}`,
    prompt: `Explain this price change.`,
    schema: PriceNarrationSchema,
  });
}
