/**
 * Prisma selects for customer-facing routes.
 *
 * `buildCustomerQuote` gates the *charter* price, but it does not gate every
 * query — courses, add-ons and departures are read directly by pages, and a
 * bare `findMany()` returns the whole row including `netRateCents`. That is how
 * our cost on a course reached the homepage's RSC payload despite the pricing
 * tests passing: the leak was never in the pricing path.
 *
 * So these are the counterpart to that gate. Any public route reading one of
 * these models uses the select from here rather than writing its own, which
 * makes "did this new page leak cost?" a question about one file instead of a
 * question about every page.
 *
 * The rule: if a field represents what Tailorsail pays or earns, it does not
 * appear below.
 */

/** Course fields for a card or teaser. */
export const COURSE_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  summary: true,
  level: true,
  format: true,
  durationHours: true,
  priceCents: true,
  certification: true,
} as const;

/** Course fields for the detail page. Adds the syllabus and its destination. */
export const COURSE_DETAIL_SELECT = {
  ...COURSE_CARD_SELECT,
  syllabus: true,
  destination: { select: { slug: true, name: true } },
} as const;

/** Course fields with the destination attached, for listing pages. */
export const COURSE_LIST_SELECT = {
  ...COURSE_CARD_SELECT,
  destination: { select: { slug: true, name: true } },
} as const;

/** Add-on fields for the booking form. `netRateCents` is deliberately absent. */
export const ADDON_PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  category: true,
  sellPriceCents: true,
  perPerson: true,
} as const;

/** Departure fields safe to read on a customer surface. */
export const DEPARTURE_PUBLIC_SELECT = {
  id: true,
  tripId: true,
  startDate: true,
  endDate: true,
  berthsTotal: true,
  berthsBooked: true,
  sellPriceCents: true,
} as const;

/**
 * Field names that must never appear in a customer-facing payload. Used by the
 * regression test that walks every public route.
 */
export const FORBIDDEN_PUBLIC_FIELDS = [
  "netRateCents",
  "marginCents",
  "marginFloorPct",
  "marginCeilingPct",
  "addOnsNetCents",
  "commercialTier",
  "netRateDiscountPct",
  "allotmentBerths",
  "Operator net rate",
] as const;
