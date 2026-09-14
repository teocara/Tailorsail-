/**
 * Margin analytics for the ops dashboard.
 *
 * Everything here reads the *frozen* commercial snapshot on a booking rather
 * than recomputing from current departure prices. A booking's economics are
 * whatever they were at the moment it was taken; a later yield run must not
 * retroactively rewrite what we think we earned.
 */

export interface BookingSnapshot {
  id: string;
  createdAt: Date;
  berths: number;
  netRateCents: number;
  sellPriceCents: number;
  extrasCents: number;
  addOnsCents: number;
  addOnsNetCents: number;
  totalCents: number;
  marginCents: number;
  destinationId: string;
  destinationName: string;
  operatorId: string;
  operatorName: string;
  acquisition: string;
  isCrewTrip: boolean;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export function inRange(date: Date, range?: DateRange): boolean {
  if (!range) return true;
  return date >= range.from && date <= range.to;
}

/**
 * Margin on a single booking: everything we charged, minus everything we owe
 * the operator and the add-on suppliers.
 */
export function marginFor(booking: BookingSnapshot): number {
  return (
    booking.sellPriceCents +
    booking.addOnsCents -
    booking.netRateCents -
    booking.addOnsNetCents
  );
}

export interface MarginSummary {
  bookings: number;
  berths: number;
  revenueCents: number;
  costCents: number;
  marginCents: number;
  /** Margin as a share of revenue — the blended take rate. */
  takeRate: number;
  /** Average order value across bookings. */
  aovCents: number;
}

export function summarise(bookings: BookingSnapshot[]): MarginSummary {
  const revenueCents = bookings.reduce(
    (acc, b) => acc + b.sellPriceCents + b.addOnsCents,
    0,
  );
  const costCents = bookings.reduce(
    (acc, b) => acc + b.netRateCents + b.addOnsNetCents,
    0,
  );
  const marginCents = revenueCents - costCents;

  return {
    bookings: bookings.length,
    berths: bookings.reduce((acc, b) => acc + b.berths, 0),
    revenueCents,
    costCents,
    marginCents,
    takeRate: revenueCents > 0 ? marginCents / revenueCents : 0,
    aovCents:
      bookings.length > 0 ? Math.round(revenueCents / bookings.length) : 0,
  };
}

export function blendedTakeRate(
  bookings: BookingSnapshot[],
  range?: DateRange,
): number {
  return summarise(bookings.filter((b) => inRange(b.createdAt, range))).takeRate;
}

/**
 * Share of bookings that bought at least one add-on. The single most useful
 * number for the price-maximisation side of the model: lifting attach is
 * more durable than lifting the headline, because it raises order value by
 * adding value rather than by charging more for the same thing.
 */
export function attachRate(
  bookings: BookingSnapshot[],
  range?: DateRange,
): number {
  const scoped = bookings.filter((b) => inRange(b.createdAt, range));
  if (scoped.length === 0) return 0;
  const withAddOns = scoped.filter((b) => b.addOnsCents > 0).length;
  return withAddOns / scoped.length;
}

export type MarginDimension =
  | "destination"
  | "operator"
  | "acquisition"
  | "line";

export interface DimensionRow extends MarginSummary {
  key: string;
  label: string;
}

function dimensionKey(
  booking: BookingSnapshot,
  dimension: MarginDimension,
): { key: string; label: string } {
  switch (dimension) {
    case "destination":
      return { key: booking.destinationId, label: booking.destinationName };
    case "operator":
      return { key: booking.operatorId, label: booking.operatorName };
    case "acquisition":
      return { key: booking.acquisition, label: booking.acquisition };
    case "line":
      return booking.isCrewTrip
        ? { key: "crew", label: "Tailorsail Crew" }
        : { key: "core", label: "Core" };
  }
}

/**
 * Margin broken down by one dimension, richest first. This is how the two
 * founders find out that (say) distressed inventory in the Aeolians is
 * carrying the whole quarter, or that one operator's tier is no longer worth
 * the allotment risk.
 */
export function marginByDimension(
  bookings: BookingSnapshot[],
  dimension: MarginDimension,
  range?: DateRange,
): DimensionRow[] {
  const scoped = bookings.filter((b) => inRange(b.createdAt, range));
  const groups = new Map<string, { label: string; items: BookingSnapshot[] }>();

  for (const booking of scoped) {
    const { key, label } = dimensionKey(booking, dimension);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(booking);
    } else {
      groups.set(key, { label, items: [booking] });
    }
  }

  return [...groups.entries()]
    .map(([key, { label, items }]) => ({
      key,
      label,
      ...summarise(items),
    }))
    .sort((a, b) => b.marginCents - a.marginCents);
}
