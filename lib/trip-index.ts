import {
  leadDeparture,
  matchesFacets,
  sortTrips,
  type DepartureLike,
  type TripFilters,
  type TripListItem,
} from "@/lib/trip-filters";

/**
 * The trip catalogue, as a file the browser can filter.
 *
 * The static build has no server, so `/trips` cannot run `findTrips` per
 * request. Instead the build writes every listable trip to
 * `public/trip-index.json` and the facets are applied in the browser.
 *
 * Two things are decided at build time and are *not* re-decided here:
 * operator verification, and the customer-safe projection. Whether an
 * operator's insurance is current is not a judgement to hand to a client, and
 * the fields that reach this file are the same ones `findTrips` selects — so
 * the index carries no cost or margin data for the same reason no page does.
 *
 * Everything else — space, month, party size, the cheapest departure, the
 * price ceiling, the sorts — runs through the *same* functions the server
 * query uses, from `lib/trip-filters.ts`. A unit test asserts the two paths
 * agree across a matrix of filters, because "one search path" stops being true
 * the moment they can drift.
 */

/** JSON has no Date, so the wire format carries ISO strings. */
export interface SerialisedDeparture {
  id: string;
  startDate: string;
  endDate: string;
  berthsTotal: number;
  berthsBooked: number;
  sellPriceCents: number;
}

export interface TripIndexEntry extends Omit<TripListItem, "lead"> {
  /** Not on TripListItem, which carries the region's name but not its slug. */
  regionSlug: string;
  departures: SerialisedDeparture[];
}

export interface TripIndex {
  /** When the catalogue was captured. Shown so a stale build is legible. */
  builtAt: string;
  trips: TripIndexEntry[];
}

function revive(d: SerialisedDeparture): DepartureLike {
  return {
    id: d.id,
    startDate: new Date(d.startDate),
    endDate: new Date(d.endDate),
    berthsTotal: d.berthsTotal,
    berthsBooked: d.berthsBooked,
    sellPriceCents: d.sellPriceCents,
  };
}

/**
 * Apply filters to the index. The client-side twin of `findTrips`.
 *
 * `now` is the *viewer's* clock, not the build's — a departure that was in the
 * future when the index was written may have sailed by the time someone opens
 * the page, and `leadDeparture` drops it for exactly the same reason the SQL
 * `startDate >= now` would have.
 */
export function filterTripIndex(
  index: TripIndex,
  filters: TripFilters = {},
  now: Date = new Date(),
): TripListItem[] {
  const items: TripListItem[] = [];

  for (const entry of index.trips) {
    if (!matchesFacets(entry, filters)) continue;

    const lead = leadDeparture(entry.departures.map(revive), filters, now);
    if (!lead) continue;

    const { departures: _departures, regionSlug: _regionSlug, ...rest } = entry;
    items.push({ ...rest, lead });
  }

  return sortTrips(items, filters.sort).slice(0, filters.limit ?? 60);
}
