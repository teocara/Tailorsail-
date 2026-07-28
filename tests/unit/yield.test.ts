import { describe, expect, it } from "vitest";
import {
  BASE_MARGIN,
  computeSellPrice,
  daysUntil,
  occupancyRatio,
  selectRules,
  type DepartureCommercials,
  type DepartureSignals,
  type PricingRuleInput,
} from "@/lib/pricing/yield";

const NOW = new Date("2026-04-01T00:00:00Z");

const commercials: DepartureCommercials = {
  netRateCents: 200000,
  marginFloorPct: 0.12,
  marginCeilingPct: 0.42,
};

const signals: DepartureSignals = {
  destinationId: "dest-dalmatia",
  startDate: new Date("2026-08-08T00:00:00Z"),
  berthsTotal: 8,
  berthsBooked: 2,
  demandIndex: 1.0,
};

const rule = (over: Partial<PricingRuleInput>): PricingRuleInput => ({
  id: "r1",
  name: "rule",
  kind: "SEASON",
  destinationId: null,
  thresholdMin: 0,
  thresholdMax: 100,
  multiplier: 1,
  active: true,
  ...over,
});

describe("signal helpers", () => {
  it("computes days until departure", () => {
    expect(daysUntil(new Date("2026-04-11T00:00:00Z"), NOW)).toBe(10);
  });

  it("computes occupancy and survives a zero-berth departure", () => {
    expect(occupancyRatio(signals)).toBeCloseTo(0.25);
    expect(occupancyRatio({ ...signals, berthsTotal: 0 })).toBe(0);
  });
});

describe("selectRules", () => {
  it("fires at most one rule per kind", () => {
    const rules = [
      rule({ id: "s1", kind: "SEASON", thresholdMin: 7, thresholdMax: 9, multiplier: 1.2 }),
      rule({ id: "s2", kind: "SEASON", thresholdMin: 8, thresholdMax: 10, multiplier: 1.3 }),
    ];
    const applied = selectRules(rules, signals, NOW);
    expect(applied).toHaveLength(1);
  });

  it("prefers a destination-scoped rule over a global one", () => {
    const rules = [
      rule({ id: "global", kind: "SEASON", thresholdMin: 7, thresholdMax: 9, multiplier: 1.1 }),
      rule({
        id: "scoped",
        kind: "SEASON",
        destinationId: "dest-dalmatia",
        thresholdMin: 7,
        thresholdMax: 9,
        multiplier: 1.35,
      }),
    ];
    const applied = selectRules(rules, signals, NOW);
    expect(applied).toHaveLength(1);
    expect(applied[0].id).toBe("scoped");
  });

  it("ignores inactive rules and rules for other destinations", () => {
    const rules = [
      rule({ id: "off", thresholdMin: 7, thresholdMax: 9, multiplier: 2, active: false }),
      rule({
        id: "elsewhere",
        destinationId: "dest-ibiza",
        thresholdMin: 7,
        thresholdMax: 9,
        multiplier: 2,
      }),
    ];
    expect(selectRules(rules, signals, NOW)).toHaveLength(0);
  });

  it("treats bands as inclusive-min, exclusive-max so neighbours don't overlap", () => {
    const rules = [
      rule({ id: "low", kind: "OCCUPANCY", thresholdMin: 0, thresholdMax: 0.25, multiplier: 0.95 }),
      rule({ id: "high", kind: "OCCUPANCY", thresholdMin: 0.25, thresholdMax: 1.01, multiplier: 1.15 }),
    ];
    // occupancy is exactly 0.25 → the upper band owns the boundary.
    const applied = selectRules(rules, signals, NOW);
    expect(applied[0].id).toBe("high");
  });
});

describe("computeSellPrice", () => {
  it("applies the base margin when no rules match", () => {
    const result = computeSellPrice(commercials, signals, [], NOW);
    // 200000 * 1.24 = 248000, charm-rounded up to the next €x9.
    expect(result.rawPriceCents).toBe(Math.round(200000 * (1 + BASE_MARGIN)));
    expect(result.priceCents).toBeGreaterThanOrEqual(result.rawPriceCents);
    expect(result.appliedRules).toHaveLength(0);
    expect(result.clamped).toBe(false);
  });

  it("compounds multipliers across different rule kinds", () => {
    const rules = [
      rule({ id: "peak", kind: "SEASON", thresholdMin: 7, thresholdMax: 9, multiplier: 1.2 }),
      rule({ id: "late", kind: "LEAD_TIME", thresholdMin: 0, thresholdMax: 200, multiplier: 1.1 }),
    ];
    const result = computeSellPrice(commercials, signals, rules, NOW);

    expect(result.appliedRules).toHaveLength(2);
    expect(result.rawPriceCents).toBe(
      Math.round(200000 * 1.24 * 1.2 * 1.1),
    );
  });

  it("applies the destination demand index", () => {
    const flat = computeSellPrice(commercials, signals, [], NOW);
    const hot = computeSellPrice(
      commercials,
      { ...signals, demandIndex: 1.15 },
      [],
      NOW,
    );
    expect(hot.rawPriceCents).toBeGreaterThan(flat.rawPriceCents);
  });

  it("clamps to the floor and flags it rather than selling below cost of service", () => {
    const rules = [
      rule({ id: "dump", kind: "SEASON", thresholdMin: 7, thresholdMax: 9, multiplier: 0.4 }),
    ];
    const result = computeSellPrice(commercials, signals, rules, NOW);

    expect(result.clamped).toBe(true);
    expect(result.clampReason).toBe("FLOOR");
    expect(result.marginPct).toBeGreaterThanOrEqual(commercials.marginFloorPct);
  });

  it("clamps to the ceiling and flags it rather than taxing the repeat rate", () => {
    const rules = [
      rule({ id: "gouge", kind: "SEASON", thresholdMin: 7, thresholdMax: 9, multiplier: 3 }),
    ];
    const result = computeSellPrice(commercials, signals, rules, NOW);

    expect(result.clamped).toBe(true);
    expect(result.clampReason).toBe("CEILING");
    // Charm rounding may nudge a few euro past the ceiling; never more than €10.
    const ceilingPrice = commercials.netRateCents / (1 - commercials.marginCeilingPct);
    expect(result.priceCents).toBeLessThan(ceilingPrice + 1000);
  });

  it("reports margin as a share of sell price, matching the ops dashboard", () => {
    const result = computeSellPrice(commercials, signals, [], NOW);
    expect(result.marginCents).toBe(result.priceCents - commercials.netRateCents);
    expect(result.marginPct).toBeCloseTo(
      result.marginCents / result.priceCents,
      10,
    );
  });

  it("is deterministic for the same inputs", () => {
    const a = computeSellPrice(commercials, signals, [], NOW);
    const b = computeSellPrice(commercials, signals, [], NOW);
    expect(a).toEqual(b);
  });

  it("refuses an inverted margin band instead of producing nonsense", () => {
    expect(() =>
      computeSellPrice(
        { ...commercials, marginFloorPct: 0.5, marginCeilingPct: 0.2 },
        signals,
        [],
        NOW,
      ),
    ).toThrow(/floor/);
  });
});
