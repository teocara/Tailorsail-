import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  leadDeparture,
  skillsAtOrBelow,
  sortTrips,
  type TripFilters,
  type TripListItem,
} from "@/lib/trip-filters";

/**
 * The single trip-search path.
 *
 * Every surface that lists trips goes through `findTrips` — the faceted /trips
 * page, /crew, destination pages, homepage rows, and the natural-language
 * finder (which parses free text into these same filters). One builder means
 * one place where "which trips are sellable" is decided, so an operator whose
 * insurance lapsed disappears everywhere at once instead of everywhere except
 * the one query somebody forgot.
 *
 * The pure half — the filter shape, the lead-departure arithmetic, the sorts,
 * the searchParams mapping — lives in `lib/trip-filters.ts` so the static
 * build's client-side facets can share it rather than reimplement it, and is
 * re-exported here so this module stays the one import site.
 */

export * from "@/lib/trip-filters";

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
        OR: [{ insuranceExpiresAt: null }, { insuranceExpiresAt: { gte: now } }],
      },
    },
  });

  // A trip is only listable if it has a future departure that still has space.
  // The space, month and party-size conditions are applied together afterwards
  // by `leadDeparture` — see the note there for why they cannot be pushed into
  // SQLite, and why splitting them across departures would be wrong.
  and.push({ departures: { some: { startDate: { gte: now } } } });

  if (and.length > 0) where.AND = and;
  return where;
}

/** The customer-safe projection every trip listing reads. */
export const TRIP_LIST_SELECT = {
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
    select: {
      slug: true,
      name: true,
      region: { select: { slug: true, name: true } },
    },
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
} as const;

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
    select: TRIP_LIST_SELECT,
  });

  const items: TripListItem[] = [];

  for (const trip of trips) {
    const lead = leadDeparture(trip.departures, filters, now);
    if (!lead) continue;

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
      lead,
    });
  }

  return sortTrips(items, filters.sort).slice(0, filters.limit ?? 60);
}
