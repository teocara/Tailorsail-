import { describe, expect, it } from "vitest";
import {
  attachRate,
  blendedTakeRate,
  marginByDimension,
  marginFor,
  summarise,
  type BookingSnapshot,
} from "@/lib/pricing/margin";
import { formatCents, splitCents, toCharmPrice } from "@/lib/money";

const booking = (over: Partial<BookingSnapshot>): BookingSnapshot => ({
  id: "b1",
  createdAt: new Date("2026-05-01T00:00:00Z"),
  berths: 6,
  netRateCents: 200000,
  sellPriceCents: 280000,
  extrasCents: 0,
  addOnsCents: 0,
  addOnsNetCents: 0,
  totalCents: 280000,
  marginCents: 80000,
  destinationId: "d-dalmatia",
  destinationName: "Dalmatia",
  operatorId: "o-1",
  operatorName: "Adriatic Charters",
  acquisition: "ALLOTMENT",
  isCrewTrip: false,
  ...over,
});

describe("marginFor", () => {
  it("nets add-on cost off add-on revenue", () => {
    const b = booking({ addOnsCents: 60000, addOnsNetCents: 25000 });
    // (280000 + 60000) - (200000 + 25000)
    expect(marginFor(b)).toBe(115000);
  });
});

describe("summarise", () => {
  it("computes take rate as margin over revenue", () => {
    const s = summarise([
      booking({ sellPriceCents: 300000, netRateCents: 210000 }),
      booking({ id: "b2", sellPriceCents: 200000, netRateCents: 160000 }),
    ]);

    expect(s.revenueCents).toBe(500000);
    expect(s.costCents).toBe(370000);
    expect(s.marginCents).toBe(130000);
    expect(s.takeRate).toBeCloseTo(0.26);
    expect(s.aovCents).toBe(250000);
  });

  it("returns zeroes rather than NaN on an empty set", () => {
    const s = summarise([]);
    expect(s.takeRate).toBe(0);
    expect(s.aovCents).toBe(0);
    expect(Number.isNaN(s.takeRate)).toBe(false);
  });
});

describe("attachRate", () => {
  it("measures the share of bookings that bought an upsell", () => {
    const bookings = [
      booking({ id: "a", addOnsCents: 24000 }),
      booking({ id: "b", addOnsCents: 0 }),
      booking({ id: "c", addOnsCents: 45000 }),
      booking({ id: "d", addOnsCents: 0 }),
    ];
    expect(attachRate(bookings)).toBe(0.5);
  });

  it("is zero, not NaN, with no bookings", () => {
    expect(attachRate([])).toBe(0);
  });
});

describe("date ranges", () => {
  it("scopes the take rate to the requested window", () => {
    const bookings = [
      booking({ id: "in", createdAt: new Date("2026-05-10T00:00:00Z"), sellPriceCents: 300000, netRateCents: 200000 }),
      booking({ id: "out", createdAt: new Date("2026-01-10T00:00:00Z"), sellPriceCents: 300000, netRateCents: 299000 }),
    ];

    const scoped = blendedTakeRate(bookings, {
      from: new Date("2026-05-01T00:00:00Z"),
      to: new Date("2026-05-31T00:00:00Z"),
    });

    // Only the May booking counts: 100000 / 300000.
    expect(scoped).toBeCloseTo(1 / 3);
  });
});

describe("marginByDimension", () => {
  const bookings = [
    booking({ id: "1", destinationId: "d-ibiza", destinationName: "Ibiza", sellPriceCents: 400000, netRateCents: 250000 }),
    booking({ id: "2", destinationId: "d-ibiza", destinationName: "Ibiza", sellPriceCents: 300000, netRateCents: 220000 }),
    booking({ id: "3", destinationId: "d-dalmatia", destinationName: "Dalmatia", sellPriceCents: 280000, netRateCents: 240000 }),
  ];

  it("groups and sorts richest-first", () => {
    const rows = marginByDimension(bookings, "destination");
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe("Ibiza");
    expect(rows[0].marginCents).toBe(230000);
    expect(rows[1].label).toBe("Dalmatia");
  });

  it("splits the Crew line from core so the sub-brand's economics are visible", () => {
    const rows = marginByDimension(
      [...bookings, booking({ id: "4", isCrewTrip: true, sellPriceCents: 90000, netRateCents: 55000 })],
      "line",
    );
    const keys = rows.map((r) => r.key);
    expect(keys).toContain("crew");
    expect(keys).toContain("core");
  });
});

describe("money helpers", () => {
  it("splits cents without losing the remainder", () => {
    const parts = splitCents(1001, 3);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1001);
    expect(parts).toEqual([334, 334, 333]);
  });

  it("rounds up to a charm price and never down", () => {
    expect(toCharmPrice(124700)).toBe(124900);
    expect(toCharmPrice(124900)).toBe(124900);
    expect(toCharmPrice(124901)).toBe(125900);
  });

  it("formats cents as whole euro", () => {
    expect(formatCents(129900)).toBe("€1,299");
  });
});
