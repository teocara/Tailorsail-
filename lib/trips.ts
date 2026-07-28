import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * The single trip-search path.
 *
 * Every surface that lists trips goes through `findTrips` — the faceted /trips
 * page, /crew, destination pages, homepage rows, and the natural-language
 * finder (which parses free text into these same filters). One builder means
 * one place where "which trips are sellable" is decided, so an operator whose
 * insurance lapsed disappears everywhere at once instead of everywhere except
 * the one query somebody forgot.
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

/**
 * Build the Prisma `where` for a filter set. Extracted from the query so it
 * can be unit-tested without a database.
 */
export function buildTripWhere(
  filters: TripFilters,
  now: Date = new Date(),
): Prisma.TripWhereInput {
  const where: Prisma.TripWhereInput = {};
  const and: Prisma.TripWhereInput[] = [];

  if (filters.destinationSlug) {
    and.push({ destination: { slug: filters.destinationSlug } });
  }
  if (filters.regionSlug) {
    and.push({ destination: { region: { slug: filters.regionSlug } } });
  }
  if (filters.skillLevel) {
    and.push({ skillLevel: { in: skillsAtOrBelow(filters.skillLevel) } });
  }
  if (filters.format) and.push({ format: filters.format });
  if (filters.skipper) and.push({ skipper: filters.skipper });
  if (filters.boatType) and.push({ boat: { type: filters.boatType } });

  if (filters.crewOnly) and.push({ isCrewTrip: true });
  else if (filters.excludeCrew) and.push({ isCrewTrip: false });

  // Only sell operators who are actually verified and currently insured. This
  // mirrors lib/verification.ts#isBookable at the query layer.
  and.push({
    boat: {
      operator: {
        status: "VERIFIED",
        OR: [
          { insuranceExpiresAt: null },
          { insuranceExpiresAt: { gte: now } },
        ],
      },
    },
  });

  // A trip is only listable if it has a future departure that still has space,
  // and that departure must satisfy the month/berths filters together — hence
  // a single `some` rather than separate conditions that could be satisfied by
  // two different departures.
  // Month and berths-remaining are applied after fetch in `findTrips`: Prisma
  // on SQLite cannot compare two columns (berthsTotal vs berthsBooked) inside
  // a filter, and applying month here would let one departure satisfy the date
  // while a different one satisfies the space.
  and.push({ departures: { some: { startDate: { gte: now } } } });

  if (and.length > 0) where.AND = and;
  return where;
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
  operator: { slug: string; name: string; ratingAvg: number; reviewCount: number };
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

/**
 * Fetch trips matching the filters.
 *
 * Selects explicitly rather than returning whole rows: `netRateCents`,
 * `marginFloorPct` and internal price components are simply not requested, so
 * they cannot reach a component even by accident.
 */
export async function findTrips(
  filters: TripFilters = {},
  now: Date = new Date(),
): Promise<TripListItem[]> {
  const trips = await db.trip.findMany({
    where: buildTripWhere(filters, now),
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      format: true,
      skipper: true,
      skillLevel: true,
      durationDays: true,
      startPort: true,
      endPort: true,
      isCrewTrip: true,
      heroFrom: true,
      heroTo: true,
      destination: {
        select: { slug: true, name: true, region: { select: { name: true } } },
      },
      boat: {
        select: {
          name: true,
          model: true,
          type: true,
          lengthM: true,
          cabins: true,
          berths: true,
          operator: {
            select: {
              slug: true,
              name: true,
              ratingAvg: true,
              reviewCount: true,
            },
          },
        },
      },
      departures: {
        where: { startDate: { gte: now } },
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          berthsTotal: true,
          berthsBooked: true,
          sellPriceCents: true,
          // netRateCents deliberately not selected.
        },
      },
    },
  });

  const items: TripListItem[] = [];

  for (const trip of trips) {
    let departures = trip.departures.filter(
      (d) => d.berthsTotal - d.berthsBooked > 0,
    );

    if (filters.month !== undefined) {
      departures = departures.filter(
        (d) => d.startDate.getUTCMonth() + 1 === filters.month,
      );
    }
    if (filters.minBerthsAvailable !== undefined) {
      const need = filters.minBerthsAvailable;
      departures = departures.filter(
        (d) => d.berthsTotal - d.berthsBooked >= need,
      );
    }

    if (departures.length === 0) continue;

    // Lead with the cheapest per-person departure — that's the number on the
    // card, so the card should not promise a price the customer can't get.
    const perPerson = (d: (typeof departures)[number]) =>
      Math.ceil(d.sellPriceCents / Math.max(1, d.berthsTotal));

    const cheapest = departures.reduce((best, d) =>
      perPerson(d) < perPerson(best) ? d : best,
    );

    const perPersonFromCents = perPerson(cheapest);

    if (
      filters.maxPricePerPersonCents !== undefined &&
      perPersonFromCents > filters.maxPricePerPersonCents
    ) {
      continue;
    }

    items.push({
      id: trip.id,
      slug: trip.slug,
      name: trip.name,
      summary: trip.summary,
      format: trip.format,
      skipper: trip.skipper,
      skillLevel: trip.skillLevel,
      durationDays: trip.durationDays,
      startPort: trip.startPort,
      endPort: trip.endPort,
      isCrewTrip: trip.isCrewTrip,
      heroFrom: trip.heroFrom,
      heroTo: trip.heroTo,
      destination: {
        slug: trip.destination.slug,
        name: trip.destination.name,
        regionName: trip.destination.region.name,
      },
      boat: {
        name: trip.boat.name,
        model: trip.boat.model,
        type: trip.boat.type,
        lengthM: trip.boat.lengthM,
        cabins: trip.boat.cabins,
        berths: trip.boat.berths,
      },
      operator: trip.boat.operator,
      lead: {
        departureId: cheapest.id,
        startDate: cheapest.startDate,
        endDate: cheapest.endDate,
        berthsFree: cheapest.berthsTotal - cheapest.berthsBooked,
        sellPriceCents: cheapest.sellPriceCents,
        perPersonFromCents,
      },
    });
  }

  return sortTrips(items, filters.sort).slice(0, filters.limit ?? 60);
}

export function sortTrips(
  items: TripListItem[],
  sort: TripSort = "recommended",
): TripListItem[] {
  const sorted = [...items];
  switch (sort) {
    case "price-asc":
      return sorted.sort(
        (a, b) => (a.lead?.perPersonFromCents ?? 0) - (b.lead?.perPersonFromCents ?? 0),
      );
    case "price-desc":
      return sorted.sort(
        (a, b) => (b.lead?.perPersonFromCents ?? 0) - (a.lead?.perPersonFromCents ?? 0),
      );
    case "date":
      return sorted.sort(
        (a, b) =>
          (a.lead?.startDate.getTime() ?? 0) - (b.lead?.startDate.getTime() ?? 0),
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
    skillLevel: enumOf("skill", ["FIRST_TIMER", "COMPETENT_CREW", "SKIPPER"] as const),
    format: enumOf("format", ["WHOLE_BOAT", "CABIN_CHARTER", "FLOTILLA"] as const),
    skipper: enumOf("skipper", ["SKIPPERED", "BAREBOAT"] as const),
    boatType: enumOf("boat", ["MONOHULL", "CATAMARAN", "GULET"] as const),
    maxPricePerPersonCents: maxEuro !== undefined ? maxEuro * 100 : undefined,
    minBerthsAvailable: num("berths"),
    sort: enumOf("sort", ["recommended", "price-asc", "price-desc", "date"] as const),
  };
}

/** Inverse of the above — used to build shareable URLs from AI-parsed filters. */
export function searchParamsFromFilters(filters: TripFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.destinationSlug) params.set("destination", filters.destinationSlug);
  if (filters.regionSlug) params.set("region", filters.regionSlug);
  if (filters.month !== undefined) params.set("month", String(filters.month));
  if (filters.skillLevel) params.set("skill", filters.skillLevel);
  if (filters.format) params.set("format", filters.format);
  if (filters.skipper) params.set("skipper", filters.skipper);
  if (filters.boatType) params.set("boat", filters.boatType);
  if (filters.maxPricePerPersonCents !== undefined) {
    params.set("maxPrice", String(Math.round(filters.maxPricePerPersonCents / 100)));
  }
  if (filters.minBerthsAvailable !== undefined) {
    params.set("berths", String(filters.minBerthsAvailable));
  }
  if (filters.sort) params.set("sort", filters.sort);
  return params;
}
