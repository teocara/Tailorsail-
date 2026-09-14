import { describe, expect, it } from "vitest";
import { buildCustomerQuote, referencePriceCents } from "@/lib/pricing/quote";
import type { PriceComponentInput } from "@/lib/pricing/types";

const components: PriceComponentInput[] = [
  {
    label: "Skipper",
    amountCents: 120000,
    kind: "MANDATORY_EXTRA",
    payableAt: "BOOKING",
    visibility: "CUSTOMER",
    perPerson: false,
    order: 1,
  },
  {
    label: "Tourist tax",
    amountCents: 1400,
    kind: "MANDATORY_EXTRA",
    payableAt: "MARINA",
    visibility: "CUSTOMER",
    perPerson: true,
    order: 2,
  },
  {
    label: "End cleaning",
    amountCents: 18000,
    kind: "MANDATORY_EXTRA",
    payableAt: "MARINA",
    visibility: "CUSTOMER",
    perPerson: false,
    order: 3,
  },
  {
    label: "Security deposit",
    amountCents: 200000,
    kind: "REFUNDABLE_DEPOSIT",
    payableAt: "MARINA",
    visibility: "CUSTOMER",
    perPerson: false,
    order: 4,
  },
  {
    label: "Operator net rate",
    amountCents: 210000,
    kind: "INCLUDED",
    payableAt: "BOOKING",
    visibility: "INTERNAL",
    perPerson: false,
    order: 99,
  },
];

describe("buildCustomerQuote", () => {
  it("sums the all-in total from booking and marina amounts", () => {
    const quote = buildCustomerQuote({
      sellPriceCents: 320000,
      components,
      berths: 6,
    });

    expect(quote.dueAtBookingCents).toBe(320000 + 120000);
    // Tourist tax is per person: 1400 * 6 = 8400, plus 18000 cleaning.
    expect(quote.dueAtMarinaCents).toBe(8400 + 18000);
    expect(quote.totalAllInCents).toBe(440000 + 26400);
  });

  it("excludes the refundable deposit from the total", () => {
    const quote = buildCustomerQuote({
      sellPriceCents: 320000,
      components,
      berths: 6,
    });

    expect(quote.refundableDepositCents).toBe(200000);
    expect(quote.totalAllInCents).toBe(466400);
    // The deposit is held, not spent, so it must sit outside the all-in figure.
    expect(quote.totalAllInCents).toBe(
      quote.dueAtBookingCents + quote.dueAtMarinaCents + quote.optionalExtrasCents,
    );
    expect(quote.totalAllInCents).toBeLessThan(
      quote.totalAllInCents + quote.refundableDepositCents,
    );
  });

  it("excludes optional extras that were not selected", () => {
    const withOptional: PriceComponentInput[] = [
      ...components,
      {
        label: "Stand-up paddleboard",
        amountCents: 9000,
        kind: "OPTIONAL",
        payableAt: "BOOKING",
        visibility: "CUSTOMER",
        perPerson: false,
      },
    ];

    const quote = buildCustomerQuote({
      sellPriceCents: 320000,
      components: withOptional,
      berths: 6,
    });

    // The optional line is listed so the customer can see it exists...
    expect(quote.lines.some((l) => l.label === "Stand-up paddleboard")).toBe(true);
    // ...but it is tracked separately from the all-in commitment.
    expect(quote.optionalExtrasCents).toBe(9000);
    expect(quote.dueAtBookingCents).toBe(440000);
  });

  it("multiplies per-person components by berths and leaves others alone", () => {
    const four = buildCustomerQuote({
      sellPriceCents: 320000,
      components,
      berths: 4,
    });
    const eight = buildCustomerQuote({
      sellPriceCents: 320000,
      components,
      berths: 8,
    });

    const taxOf = (q: typeof four) =>
      q.lines.find((l) => l.label === "Tourist tax")!.amountCents;
    const skipperOf = (q: typeof four) =>
      q.lines.find((l) => l.label === "Skipper")!.amountCents;

    expect(taxOf(four)).toBe(1400 * 4);
    expect(taxOf(eight)).toBe(1400 * 8);
    // Skipper is per booking, not per head.
    expect(skipperOf(four)).toBe(120000);
    expect(skipperOf(eight)).toBe(120000);
  });

  it("divides per-person price so it multiplies back to the total", () => {
    // 466400 / 7 does not divide evenly — the remainder must not vanish.
    const quote = buildCustomerQuote({
      sellPriceCents: 320000,
      components,
      berths: 7,
    });

    expect(quote.perPersonCents * quote.berths).toBeGreaterThanOrEqual(
      quote.totalAllInCents,
    );
    expect(
      quote.perPersonCents * quote.berths - quote.totalAllInCents,
    ).toBeLessThan(quote.berths);
  });

  it("adds selected add-ons as optional extras", () => {
    const quote = buildCustomerQuote({
      sellPriceCents: 320000,
      components,
      berths: 4,
      addOns: [
        {
          id: "a1",
          name: "Competent Crew course",
          sellPriceCents: 24000,
          perPerson: true,
        },
        {
          id: "a2",
          name: "Provisioning pack",
          sellPriceCents: 45000,
          perPerson: false,
        },
      ],
    });

    expect(quote.optionalExtrasCents).toBe(24000 * 4 + 45000);
    expect(quote.totalAllInCents).toBe(
      quote.dueAtBookingCents + quote.dueAtMarinaCents + quote.optionalExtrasCents,
    );
  });

  it("never returns cost or margin data — the structural guarantee", () => {
    const quote = buildCustomerQuote({
      sellPriceCents: 320000,
      components,
      berths: 6,
    });

    const serialised = JSON.stringify(quote);

    // The internal component must not appear in any form.
    expect(serialised).not.toContain("Operator net rate");
    expect(serialised).not.toContain("netRate");
    expect(serialised).not.toContain("margin");
    expect(serialised).not.toContain("210000");

    expect(quote.lines.every((l) => l.label !== "Operator net rate")).toBe(true);
    expect(Object.keys(quote)).not.toContain("netRateCents");
    expect(Object.keys(quote)).not.toContain("marginCents");
  });

  it("rejects nonsense inputs rather than producing a silent wrong price", () => {
    expect(() =>
      buildCustomerQuote({ sellPriceCents: 100, components, berths: 0 }),
    ).toThrow(/berths/);
    expect(() =>
      buildCustomerQuote({ sellPriceCents: -1, components, berths: 2 }),
    ).toThrow(/sellPriceCents/);
  });
});

describe("referencePriceCents", () => {
  const now = new Date("2026-07-01T00:00:00Z");
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  it("returns the lowest price of the prior 30 days when it beats today's", () => {
    const was = referencePriceCents(
      [
        { sellPriceCents: 340000, effectiveFrom: daysAgo(20) },
        { sellPriceCents: 320000, effectiveFrom: daysAgo(10) },
      ],
      299900,
      now,
    );

    // Not the highest historical price — the lowest one, per Omnibus.
    expect(was).toBe(320000);
  });

  it("returns null when the current price is not actually a reduction", () => {
    const was = referencePriceCents(
      [{ sellPriceCents: 280000, effectiveFrom: daysAgo(5) }],
      299900,
      now,
    );
    expect(was).toBeNull();
  });

  it("ignores prices older than the 30-day window", () => {
    const was = referencePriceCents(
      [{ sellPriceCents: 500000, effectiveFrom: daysAgo(45) }],
      299900,
      now,
    );
    expect(was).toBeNull();
  });

  it("returns null with no history rather than inventing a was-price", () => {
    expect(referencePriceCents([], 299900, now)).toBeNull();
  });
});
