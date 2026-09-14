/**
 * The parts of trip search that are pure.
 *
 * Split out of `lib/trips.ts` so the browser can use them: the static build
 * has no server to run `findTrips` on, so the facets and the search box filter
 * a prebuilt index client-side instead — and importing `lib/trips.ts` there
 * would drag Prisma into the bundle.
 *
 * The split is along the database line, not along a logical one. Everything
 * that decides *which trips qualify* and *what the lead departure is* lives
 * here and has exactly one implementation, used by both paths. `lib/trips.ts`
 * keeps the query and re-exports all of this, so nothing that already imported
 * from there had to change.
 */

export type TripSort = "recommended" | "price-asc" | "price-desc" | "date";

export interface TripFilters {
  destinationSlug?: string;
  regionSlug?: string;
  /** 1-12, matched against departure start month. */
  month?: number;
  skillLevel?: "FIRST_TIMER" | "COMPETENT_CREW" | "SKIPPER";
  format?: "WHOLE_BOAT" | "CABIN_CHARTER" | "FLOTILLA";
  skipper?: "SKIPPERED" | "BAREBOAT";
  boatType?: "MONOHULL" | "CATAMARAN" | "GULET";
  /** Ceiling on the per-person all-in price, in cents. */
  maxPricePerPersonCents?: number;
  /** Minimum berths still free on at least one departure. */
  minBerthsAvailable?: number;
  crewOnly?: boolean;
  /** Exclude Crew trips from the core catalogue. */
  excludeCrew?: boolean;
  sort?: TripSort;
  limit?: number;
}

/**
 * Skill is a ladder, not a set: a FIRST_TIMER trip is fine for a skipper, but
 * not the reverse. Filtering by "I am a first-timer" therefore means "trips at
 * or below this level", which is the opposite of a naive equality match and
 * the sort of thing that quietly hides most of the catalogue if you get it
 * backwards.
 */
const SKILL_ORDER = ["FIRST_TIMER", "COMPETENT_CREW", "SKIPPER"] as const;

export function skillsAtOrBelow(
  level: (typeof SKILL_ORDER)[number],
): (typeof SKILL_ORDER)[number][] {
  const idx = SKILL_ORDER.indexOf(level);
  return SKILL_ORDER.slice(0, idx + 1) as (typeof SKILL_ORDER)[number][];
}

export interface TripListItem {
  id: string;
  slug: string;
  name: string;
  summary: string;
  format: string;
  skipper: string;
  skillLevel: string;
  durationDays: number;
  startPort: string;
  endPort: string;
  isCrewTrip: boolean;
  heroFrom: string;
  heroTo: string;
  destination: { slug: string; name: string; regionName: string };
  boat: {
    name: string;
    model: string;
    type: string;
    lengthM: number;
    cabins: number;
    berths: number;
  };
  operator: {
    slug: string;
    name: string;
    ratingAvg: number;
    reviewCount: number;
  };
  /** Cheapest matching departure, already reduced to customer-safe fields. */
  lead: {
    departureId: string;
    startDate: Date;
    endDate: Date;
    berthsFree: number;
    /** Base charter price. Full all-in comes from buildCustomerQuote. */
    sellPriceCents: number;
    perPersonFromCents: number;
  } | null;
}

/** The departure fields the lead calculation needs. All customer-safe. */
export interface DepartureLike {
  id: string;
  startDate: Date;
  endDate: Date;
  berthsTotal: number;
  berthsBooked: number;
  sellPriceCents: number;
}

/**
 * Which departure a trip card leads with, or `null` if the trip does not
 * qualify at all.
 *
 * This is the half of trip search that is arithmetic rather than lookup —
 * space, month, party size, the cheapest option, the price ceiling — and it is
 * deliberately the half that both the server query and the browser index call,
 * because it is the half where being subtly wrong would show a price the
 * customer cannot actually get.
 *
 * Month and berths-remaining cannot be pushed into SQL anyway: SQLite cannot
 * compare `berthsTotal` against `berthsBooked` inside a filter, and applying
 * month there would let one departure satisfy the date while a different one
 * satisfied the space.
 */
export function leadDeparture(
  departures: readonly DepartureLike[],
  filters: TripFilters,
  now: Date,
): TripListItem["lead"] {
  let available = departures.filter(
    (d) => d.startDate >= now && d.berthsTotal - d.berthsBooked > 0,
  );

  if (filters.month !== undefined) {
    available = available.filter(
      (d) => d.startDate.getUTCMonth() + 1 === filters.month,
    );
  }
  if (filters.minBerthsAvailable !== undefined) {
    const need = filters.minBerthsAvailable;
    available = available.filter((d) => d.berthsTotal - d.berthsBooked >= need);
  }

  if (available.length === 0) return null;

  // Lead with the cheapest per-person departure — that's the number on the
  // card, so the card should not promise a price the customer can't get.
  const perPerson = (d: DepartureLike) =>
    Math.ceil(d.sellPriceCents / Math.max(1, d.berthsTotal));

  const cheapest = available.reduce((best, d) =>
    perPerson(d) < perPerson(best) ? d : best,
  );
  const perPersonFromCents = perPerson(cheapest);

  if (
    filters.maxPricePerPersonCents !== undefined &&
    perPersonFromCents > filters.maxPricePerPersonCents
  ) {
    return null;
  }

  return {
    departureId: cheapest.id,
    startDate: cheapest.startDate,
    endDate: cheapest.endDate,
    berthsFree: cheapest.berthsTotal - cheapest.berthsBooked,
    sellPriceCents: cheapest.sellPriceCents,
    perPersonFromCents,
  };
}

/** The trip fields the facet predicates read. */
export interface FacetFields {
  skillLevel: string;
  format: string;
  skipper: string;
  isCrewTrip: boolean;
  boat: { type: string };
  destination: { slug: string };
  regionSlug: string;
}

/**
 * The facet half of the filter — the part `buildTripWhere` pushes into SQL.
 *
 * Verification and "has a future departure" are deliberately absent: those are
 * applied when the index is built, because an operator's insurance status is
 * not something the browser should be deciding. Everything here is a plain
 * equality on a field the customer can already see.
 */
export function matchesFacets(trip: FacetFields, filters: TripFilters): boolean {
  if (
    filters.destinationSlug &&
    trip.destination.slug !== filters.destinationSlug
  ) {
    return false;
  }
  if (filters.regionSlug && trip.regionSlug !== filters.regionSlug) return false;
  if (
    filters.skillLevel &&
    !skillsAtOrBelow(filters.skillLevel).includes(
      trip.skillLevel as (typeof SKILL_ORDER)[number],
    )
  ) {
    return false;
  }
  if (filters.format && trip.format !== filters.format) return false;
  if (filters.skipper && trip.skipper !== filters.skipper) return false;
  if (filters.boatType && trip.boat.type !== filters.boatType) return false;

  if (filters.crewOnly) {
    if (!trip.isCrewTrip) return false;
  } else if (filters.excludeCrew) {
    if (trip.isCrewTrip) return false;
  }

  return true;
}

export function sortTrips(
  items: TripListItem[],
  sort: TripSort = "recommended",
): TripListItem[] {
  const sorted = [...items];
  switch (sort) {
    case "price-asc":
      return sorted.sort(
        (a, b) =>
          (a.lead?.perPersonFromCents ?? 0) - (b.lead?.perPersonFromCents ?? 0),
      );
    case "price-desc":
      return sorted.sort(
        (a, b) =>
          (b.lead?.perPersonFromCents ?? 0) - (a.lead?.perPersonFromCents ?? 0),
      );
    case "date":
      return sorted.sort(
        (a, b) =>
          (a.lead?.startDate.getTime() ?? 0) -
          (b.lead?.startDate.getTime() ?? 0),
      );
    case "recommended":
    default:
      // Well-reviewed operators first, then soonest departure.
      return sorted.sort((a, b) => {
        const byRating = b.operator.ratingAvg - a.operator.ratingAvg;
        if (Math.abs(byRating) > 0.05) return byRating;
        return (
          (a.lead?.startDate.getTime() ?? 0) - (b.lead?.startDate.getTime() ?? 0)
        );
      });
  }
}

/** Parse `searchParams` into filters. Shared by /trips and /crew. */
export function filtersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): TripFilters {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const num = (key: string): number | undefined => {
    const raw = one(key);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const enumOf = <T extends string>(key: string, allowed: readonly T[]) => {
    const raw = one(key);
    return raw && (allowed as readonly string[]).includes(raw)
      ? (raw as T)
      : undefined;
  };

  const maxEuro = num("maxPrice");

  return {
    destinationSlug: one("destination"),
    regionSlug: one("region"),
    month: num("month"),
    skillLevel: enumOf("skill", [
      "FIRST_TIMER",
      "COMPETENT_CREW",
      "SKIPPER",
    ] as const),
    format: enumOf("format", [
      "WHOLE_BOAT",
      "CABIN_CHARTER",
      "FLOTILLA",
    ] as const),
    skipper: enumOf("skipper", ["SKIPPERED", "BAREBOAT"] as const),
    boatType: enumOf("boat", ["MONOHULL", "CATAMARAN", "GULET"] as const),
    maxPricePerPersonCents: maxEuro !== undefined ? maxEuro * 100 : undefined,
    minBerthsAvailable: num("berths"),
    sort: enumOf("sort", [
      "recommended",
      "price-asc",
      "price-desc",
      "date",
    ] as const),
  };
}

/** Inverse of the above — used to build shareable URLs from AI-parsed filters. */
export function searchParamsFromFilters(filters: TripFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.destinationSlug)
    params.set("destination", filters.destinationSlug);
  if (filters.regionSlug) params.set("region", filters.regionSlug);
  if (filters.month !== undefined) params.set("month", String(filters.month));
  if (filters.skillLevel) params.set("skill", filters.skillLevel);
  if (filters.format) params.set("format", filters.format);
  if (filters.skipper) params.set("skipper", filters.skipper);
  if (filters.boatType) params.set("boat", filters.boatType);
  if (filters.maxPricePerPersonCents !== undefined) {
    params.set(
      "maxPrice",
      String(Math.round(filters.maxPricePerPersonCents / 100)),
    );
  }
  if (filters.minBerthsAvailable !== undefined) {
    params.set("berths", String(filters.minBerthsAvailable));
  }
  if (filters.sort) params.set("sort", filters.sort);
  return params;
}
