/**
 * All money in this codebase is an integer number of euro cents. Nothing
 * anywhere should hold a float euro amount — rounding drift across a price
 * breakdown with a dozen components is how a marketplace ends up displaying a
 * total that doesn't match the sum of its rows.
 */

const EUR = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const EUR_PRECISE = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `129900` → `"€1,299"`. Whole euros; what the customer sees on cards. */
export function formatCents(cents: number): string {
  return EUR.format(Math.round(cents) / 100);
}

/** `129950` → `"€1,299.50"`. Used where the cents actually matter. */
export function formatCentsPrecise(cents: number): string {
  return EUR_PRECISE.format(Math.round(cents) / 100);
}

/** Basis-point-free percentage display: `0.184` → `"18.4%"`. */
export function formatPct(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/**
 * Split `cents` across `parts` people so the displayed per-person figures sum
 * back to the total. Naive division leaves up to `parts - 1` cents unaccounted
 * for, which surfaces as a per-person price that doesn't multiply back up.
 */
export function splitCents(cents: number, parts: number): number[] {
  if (parts <= 0) throw new Error("splitCents: parts must be positive");
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Round up to a charm price ending in 9 — €1,247 → €1,249. Applied at the end
 * of the yield calculation so the published price looks priced rather than
 * computed. Rounds up, never down, so it can only help margin.
 */
export function toCharmPrice(cents: number): number {
  const euros = Math.ceil(cents / 100);
  const lastDigit = euros % 10;
  const bump = lastDigit === 9 ? 0 : (9 - lastDigit + 10) % 10;
  return (euros + bump) * 100;
}
