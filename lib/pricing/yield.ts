import { toCharmPrice } from "@/lib/money";

/**
 * The revenue-management engine.
 *
 * Deliberately deterministic: given the same departure, rules and clock it
 * always returns the same price. That is what makes it unit-testable, what
 * lets `/ops` show a live preview before a rule change is saved, and what
 * keeps every price movement explainable after the fact. Claude narrates its
 * output (see lib/ai/pricing-advisor.ts) but never computes it — the arithmetic
 * of what a customer owes is not a place for a probabilistic model.
 *
 * Signals are all properties of the *departure* — season, lead time, how full
 * the boat is, how much demand the cruising ground carries. None of them are
 * properties of the shopper. Personalised willingness-to-pay pricing is a
 * different thing with different legal and reputational exposure, and it is
 * not what this engine does.
 */

export type PricingRuleKind =
  | "SEASON"
  | "LEAD_TIME"
  | "OCCUPANCY"
  | "DAY_OF_WEEK";

export interface PricingRuleInput {
  id: string;
  name: string;
  kind: PricingRuleKind;
  /** Null applies globally; otherwise scoped to one destination. */
  destinationId: string | null;
  thresholdMin: number;
  thresholdMax: number;
  multiplier: number;
  active: boolean;
}

export interface DepartureSignals {
  destinationId: string;
  startDate: Date;
  berthsTotal: number;
  berthsBooked: number;
  /** Destination-level demand multiplier. 1.0 is neutral. */
  demandIndex: number;
}

export interface DepartureCommercials {
  netRateCents: number;
  marginFloorPct: number;
  marginCeilingPct: number;
}

export interface AppliedRule {
  id: string;
  name: string;
  kind: PricingRuleKind;
  multiplier: number;
}

export interface PriceComputation {
  priceCents: number;
  /** Achieved margin as a fraction of the sell price. */
  marginPct: number;
  marginCents: number;
  appliedRules: AppliedRule[];
  /** The uncapped price before floor/ceiling clamping and charm rounding. */
  rawPriceCents: number;
  /**
   * True when the guardrails bit. The caller must not silently publish a
   * clamped price — `yield-run` turns these into a PRICE_OUT_OF_BAND ops task
   * so a human sees that the rules wanted to go somewhere they weren't allowed.
   */
  clamped: boolean;
  clampReason: "FLOOR" | "CEILING" | null;
}

/** Base markup applied before any rule multipliers. */
export const BASE_MARGIN = 0.24;

export function daysUntil(start: Date, now: Date): number {
  const ms = start.getTime() - now.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function occupancyRatio(signals: DepartureSignals): number {
  if (signals.berthsTotal <= 0) return 0;
  return signals.berthsBooked / signals.berthsTotal;
}

/** Inclusive-min, exclusive-max, so adjacent bands don't both fire. */
function inBand(value: number, min: number, max: number): boolean {
  return value >= min && value < max;
}

/**
 * Select the rules that apply to this departure. At most one rule per kind
 * fires — bands within a kind are meant to be non-overlapping, and if a
 * misconfigured pair does overlap we take the first rather than compounding
 * two season multipliers on top of each other.
 */
export function selectRules(
  rules: PricingRuleInput[],
  signals: DepartureSignals,
  now: Date,
): AppliedRule[] {
  const scoped = rules.filter(
    (r) =>
      r.active &&
      (r.destinationId === null || r.destinationId === signals.destinationId),
  );

  const month = signals.startDate.getUTCMonth() + 1;
  const lead = daysUntil(signals.startDate, now);
  const occupancy = occupancyRatio(signals);
  const dow = signals.startDate.getUTCDay();

  const valueFor = (kind: PricingRuleKind): number => {
    switch (kind) {
      case "SEASON":
        return month;
      case "LEAD_TIME":
        return lead;
      case "OCCUPANCY":
        return occupancy;
      case "DAY_OF_WEEK":
        return dow;
    }
  };

  const kinds: PricingRuleKind[] = [
    "SEASON",
    "LEAD_TIME",
    "OCCUPANCY",
    "DAY_OF_WEEK",
  ];

  const applied: AppliedRule[] = [];
  for (const kind of kinds) {
    // Destination-specific rules win over global ones for the same kind.
    const candidates = scoped
      .filter((r) => r.kind === kind && inBand(valueFor(kind), r.thresholdMin, r.thresholdMax))
      .sort((a, b) => (a.destinationId === null ? 1 : 0) - (b.destinationId === null ? 1 : 0));

    const match = candidates[0];
    if (match) {
      applied.push({
        id: match.id,
        name: match.name,
        kind: match.kind,
        multiplier: match.multiplier,
      });
    }
  }

  return applied;
}

/**
 * Compute the sell price for a departure.
 *
 *   price = netRate x (1 + BASE_MARGIN) x rule multipliers x demandIndex
 *
 * then clamped into [marginFloorPct, marginCeilingPct] and rounded up to a
 * charm price. Margin is expressed as a fraction of the *sell* price (a
 * retail gross margin), not as a markup on cost, because that's the number
 * the ops dashboard reports and the one the floor and ceiling are set in.
 */
export function computeSellPrice(
  commercials: DepartureCommercials,
  signals: DepartureSignals,
  rules: PricingRuleInput[],
  now: Date = new Date(),
): PriceComputation {
  const { netRateCents, marginFloorPct, marginCeilingPct } = commercials;

  if (marginFloorPct >= marginCeilingPct) {
    throw new Error("computeSellPrice: margin floor must be below ceiling");
  }

  const appliedRules = selectRules(rules, signals, now);

  const ruleMultiplier = appliedRules.reduce((acc, r) => acc * r.multiplier, 1);
  const rawPriceCents = Math.round(
    netRateCents * (1 + BASE_MARGIN) * ruleMultiplier * signals.demandIndex,
  );

  // Convert the margin guardrails into price bounds. With margin as a share of
  // sell price, price = cost / (1 - margin).
  const floorPrice = Math.ceil(netRateCents / (1 - marginFloorPct));
  const ceilingPrice = Math.floor(netRateCents / (1 - marginCeilingPct));

  let priceCents = rawPriceCents;
  let clamped = false;
  let clampReason: "FLOOR" | "CEILING" | null = null;

  if (priceCents < floorPrice) {
    priceCents = floorPrice;
    clamped = true;
    clampReason = "FLOOR";
  } else if (priceCents > ceilingPrice) {
    priceCents = ceilingPrice;
    clamped = true;
    clampReason = "CEILING";
  }

  // Charm rounding only ever rounds up, so it cannot push us back below the
  // floor. It can nudge just past the ceiling by <€10, which we accept rather
  // than publishing a price ending in 3.
  priceCents = toCharmPrice(priceCents);

  const marginCents = priceCents - netRateCents;
  const marginPct = priceCents > 0 ? marginCents / priceCents : 0;

  return {
    priceCents,
    marginPct,
    marginCents,
    appliedRules,
    rawPriceCents,
    clamped,
    clampReason,
  };
}

/**
 * Human-readable reason string, stored on every PriceHistory row. Written here
 * rather than by the AI so the audit trail exists even with no API key.
 */
export function describeComputation(result: PriceComputation): string {
  const parts = result.appliedRules.map(
    (r) => `${r.name} x${r.multiplier.toFixed(2)}`,
  );
  const base = parts.length > 0 ? parts.join(", ") : "base margin only";
  if (result.clamped) {
    return `${base} — clamped to margin ${result.clampReason?.toLowerCase()}`;
  }
  return base;
}
