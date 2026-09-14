import { splitCents } from "@/lib/money";
import type {
  AddOnInput,
  CustomerQuote,
  PriceComponentInput,
  QuoteLine,
} from "./types";

/**
 * Build the customer-facing quote for a departure.
 *
 * This is the single gate between our commercial data and anything a traveller
 * can see. It takes the base charter price, the trip's price components and any
 * selected add-ons, and returns only what the customer pays. Internal
 * components are dropped here; net rate and margin are never parameters, so
 * there is nothing to leak.
 *
 * The all-in total is the product promise: it is what you will actually pay,
 * including the amounts the marina collects on arrival. Two things are
 * deliberately excluded from it — the refundable deposit (you get it back) and
 * optional extras you did not select.
 */
export function buildCustomerQuote(params: {
  /** Base charter price for the whole departure, in cents. */
  sellPriceCents: number;
  components: PriceComponentInput[];
  addOns?: AddOnInput[];
  berths: number;
}): CustomerQuote {
  const { sellPriceCents, components, berths } = params;
  const addOns = params.addOns ?? [];

  if (!Number.isInteger(berths) || berths < 1) {
    throw new Error("buildCustomerQuote: berths must be a positive integer");
  }
  if (!Number.isInteger(sellPriceCents) || sellPriceCents < 0) {
    throw new Error(
      "buildCustomerQuote: sellPriceCents must be a non-negative integer",
    );
  }

  const lines: QuoteLine[] = [
    {
      label: "Charter",
      kind: "INCLUDED",
      payableAt: "BOOKING",
      amountCents: sellPriceCents,
      perPerson: false,
    },
  ];

  // Internal cost rows never make it past this filter.
  const visible = components
    .filter((c) => c.visibility === "CUSTOMER")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const component of visible) {
    lines.push({
      label: component.label,
      kind: component.kind,
      payableAt: component.payableAt,
      amountCents: component.perPerson
        ? component.amountCents * berths
        : component.amountCents,
      perPerson: component.perPerson,
      note: component.note ?? null,
    });
  }

  for (const addOn of addOns) {
    const quantity = addOn.quantity ?? 1;
    const units = addOn.perPerson ? berths * quantity : quantity;
    lines.push({
      label: addOn.name,
      kind: "OPTIONAL",
      payableAt: "BOOKING",
      amountCents: addOn.sellPriceCents * units,
      perPerson: addOn.perPerson,
    });
  }

  const sum = (predicate: (line: QuoteLine) => boolean) =>
    lines.reduce((acc, line) => (predicate(line) ? acc + line.amountCents : acc), 0);

  const dueAtBookingCents = sum(
    (l) =>
      l.payableAt === "BOOKING" &&
      (l.kind === "INCLUDED" || l.kind === "MANDATORY_EXTRA"),
  );

  const dueAtMarinaCents = sum(
    (l) =>
      l.payableAt === "MARINA" &&
      (l.kind === "INCLUDED" || l.kind === "MANDATORY_EXTRA"),
  );

  const refundableDepositCents = sum((l) => l.kind === "REFUNDABLE_DEPOSIT");
  const optionalExtrasCents = sum((l) => l.kind === "OPTIONAL");

  const totalAllInCents =
    dueAtBookingCents + dueAtMarinaCents + optionalExtrasCents;

  // Remainder-safe so the displayed per-person figure multiplies back to the
  // total instead of being a cent or two short.
  const perPersonCents = splitCents(totalAllInCents, berths)[0];

  return {
    currency: "EUR",
    berths,
    lines,
    dueAtBookingCents,
    dueAtMarinaCents,
    refundableDepositCents,
    optionalExtrasCents,
    totalAllInCents,
    perPersonCents,
  };
}

/**
 * Whether a struck-through "was" price may lawfully be displayed.
 *
 * EU Omnibus (Directive 2019/2161) requires an announced price reduction to
 * reference the *lowest* price applied in the 30 days before the reduction.
 * We therefore never store a marketing "was" value — we derive it from prices
 * we actually charged, and return null when the claim isn't supportable.
 */
export function referencePriceCents(
  history: { sellPriceCents: number; effectiveFrom: Date }[],
  currentPriceCents: number,
  now: Date = new Date(),
): number | null {
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const priorPrices = history
    .filter((h) => h.effectiveFrom >= windowStart && h.effectiveFrom <= now)
    .map((h) => h.sellPriceCents);

  if (priorPrices.length === 0) return null;

  const lowestPrior = Math.min(...priorPrices);

  // Only a genuine reduction against the 30-day low can be advertised.
  return lowestPrior > currentPriceCents ? lowestPrior : null;
}
