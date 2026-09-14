import { db } from "@/lib/db";
import {
  computeSellPrice,
  describeComputation,
  type PricingRuleInput,
} from "@/lib/pricing/yield";
import { openTask, PRIORITY } from "@/lib/ops";
import { formatCents } from "@/lib/money";

/**
 * Reprice every future departure.
 *
 * Run on a schedule (`npm run yield:run`) or on demand from the ops console.
 *
 * Two rules govern what it may do on its own.
 *
 * First, it can only ever publish a price inside the margin guardrails. When
 * the rules want to go beyond one, the guardrail wins and the clamped price is
 * published — that price is inside the band by construction, so it is safe.
 * What escalates is not the clamp itself but *strain*: if the rules wanted to
 * go more than MATERIAL_STRAIN past the bound, a person should know demand or
 * cost has moved. Escalating every routine clamp would put dozens of rows in
 * front of two people every morning and bury the handful that matter.
 *
 * Second, it never touches a booking. The commercial snapshot frozen at
 * booking time is what that customer owes and what we earned, whatever the
 * price does afterwards.
 */
export interface YieldRunResult {
  considered: number;
  changed: number;
  clamped: number;
  escalated: number;
  raised: number;
  lowered: number;
}

/**
 * How far past a guardrail the rules must want to go before a human hears
 * about it. Below this, the clamp is the system working as designed.
 */
const MATERIAL_STRAIN = 0.15;

export async function runYield(now: Date = new Date()): Promise<YieldRunResult> {
  const rules = await db.pricingRule.findMany({ where: { active: true } });

  const ruleInputs: PricingRuleInput[] = rules.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    destinationId: r.destinationId,
    thresholdMin: r.thresholdMin,
    thresholdMax: r.thresholdMax,
    multiplier: r.multiplier,
    active: r.active,
  }));

  const departures = await db.departure.findMany({
    where: { startDate: { gte: now } },
    include: {
      trip: {
        select: {
          name: true,
          destinationId: true,
          destination: { select: { name: true, demandIndex: true } },
        },
      },
    },
  });

  const result: YieldRunResult = {
    considered: departures.length,
    changed: 0,
    clamped: 0,
    escalated: 0,
    raised: 0,
    lowered: 0,
  };

  for (const departure of departures) {
    const computation = computeSellPrice(
      {
        netRateCents: departure.netRateCents,
        marginFloorPct: departure.marginFloorPct,
        marginCeilingPct: departure.marginCeilingPct,
      },
      {
        destinationId: departure.trip.destinationId,
        startDate: departure.startDate,
        berthsTotal: departure.berthsTotal,
        berthsBooked: departure.berthsBooked,
        demandIndex: departure.trip.destination.demandIndex,
      },
      ruleInputs,
      now,
    );

    const previous = departure.sellPriceCents;

    if (computation.clamped) {
      result.clamped += 1;

      // A clamped price is safe to publish — by construction it sits inside the
      // margin band. The guardrail doing its routine job is not news, and
      // raising a task every night for every departure whose rules mildly
      // exceed the ceiling would bury the five things that actually need a
      // person. Only material strain gets escalated.
      const strain =
        Math.abs(computation.rawPriceCents - computation.priceCents) /
        computation.priceCents;

      if (strain > MATERIAL_STRAIN) {
        result.escalated += 1;
        await openTask({
          kind: "PRICE_OUT_OF_BAND",
          priority: PRIORITY.NORMAL,
          title: `${departure.trip.name} — ${departure.startDate.toISOString().slice(0, 10)} is straining the margin ${computation.clampReason?.toLowerCase()}`,
          subjectType: "departure",
          subjectId: departure.id,
          aiSummary: `The rules wanted ${formatCents(computation.rawPriceCents)}, which is ${(strain * 100).toFixed(0)}% beyond the ${computation.clampReason?.toLowerCase()}; published at ${formatCents(computation.priceCents)} (${(computation.marginPct * 100).toFixed(1)}% margin). Occupancy ${departure.berthsBooked}/${departure.berthsTotal}.`,
          aiRecommendation:
            computation.clampReason === "FLOOR"
              ? "The rules want to discount well below our cost of service. Renegotiate the net rate, or accept that this departure will sell slowly at a price that covers us."
              : "The rules want to price well above our ceiling — demand is outrunning what we bought. Raising the ceiling here is a deliberate decision, not an automatic one, and the repeat rate is what it costs.",
        });
      }
    }

    if (computation.priceCents === previous) continue;

    await db.$transaction([
      db.departure.update({
        where: { id: departure.id },
        data: {
          sellPriceCents: computation.priceCents,
          priceUpdatedAt: now,
        },
      }),
      db.priceHistory.create({
        data: {
          departureId: departure.id,
          sellPriceCents: computation.priceCents,
          netRateCents: departure.netRateCents,
          effectiveFrom: now,
          reason: describeComputation(computation),
        },
      }),
    ]);

    result.changed += 1;
    if (computation.priceCents > previous) result.raised += 1;
    else result.lowered += 1;
  }

  return result;
}
