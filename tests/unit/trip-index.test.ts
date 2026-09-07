import { describe, expect, it } from "vitest";
import {
  leadDeparture,
  matchesFacets,
  type DepartureLike,
  type FacetFields,
} from "@/lib/trip-filters";
import { filterTripIndex, type TripIndex } from "@/lib/trip-index";

/**
 * The client-side half of trip search.
 *
 * These are the pure tests. The one that actually protects the "single search
 * path" claim — that `filterTripIndex` and `findTrips` return the same trips —
 * needs a seeded database and lives in `scripts/verify-trip-index.ts`, which
 * runs as part of `build:static` so the export cannot ship a drifted index.
 *
 * What is worth testing here is the logic that had no equivalent before: the
 * facet predicates hand-written to mirror SQL, and the arithmetic both paths
 * now share.
 */

const NOW = new Date("2026-07-01T00:00:00Z");

function facets(over: Partial<FacetFields> = {}): FacetFields {
  return {
    skillLevel: "COMPETENT_CREW",
    format: "WHOLE_BOAT",
    skipper: "SKIPPERED",
    isCrewTrip: false,
    boat: { type: "MONOHULL" },
    destination: { slug: "dalmatia" },
    regionSlug: "croatia",
    ...over,
  };
}

function departure(over: Partial<DepartureLike> = {}): DepartureLike {
  return {
    id: "d1",
    startDate: new Date("2026-08-01T00:00:00Z"),
    endDate: new Date("2026-08-08T00:00:00Z"),
    berthsTotal: 8,
    berthsBooked: 0,
    sellPriceCents: 800000,
    ...over,
  };
}

describe("matchesFacets", () => {
  it("treats skill as a ladder, the same way the query does", () => {
    // A skipper can take a first-timer trip. The reverse is the bug this
    // exists to prevent, and the one that silently hides most of the catalogue.
    expect(
      matchesFacets(facets({ skillLevel: "FIRST_TIMER" }), {
        skillLevel: "SKIPPER",
      }),
    ).toBe(true);
    expect(
      matchesFacets(facets({ skillLevel: "SKIPPER" }), {
        skillLevel: "FIRST_TIMER",
      }),
    ).toBe(false);
  });

  it("scopes by destination and by region independently", () => {
    expect(
      matchesFacets(facets(), { destinationSlug: "dalmatia" }),
    ).toBe(true);
    expect(matchesFacets(facets(), { destinationSlug: "kvarner" })).toBe(false);
    expect(matchesFacets(facets(), { regionSlug: "croatia" })).toBe(true);
    expect(matchesFacets(facets(), { regionSlug: "italy" })).toBe(false);
  });

  it("matches format, skipper and boat type exactly", () => {
    expect(matchesFacets(facets(), { format: "WHOLE_BOAT" })).toBe(true);
    expect(matchesFacets(facets(), { format: "CABIN_CHARTER" })).toBe(false);
    expect(matchesFacets(facets(), { skipper: "BAREBOAT" })).toBe(false);
    expect(matchesFacets(facets(), { boatType: "CATAMARAN" })).toBe(false);
  });

  it("lets crewOnly win over excludeCrew, as the query does", () => {
    const crew = facets({ isCrewTrip: true });
    expect(matchesFacets(crew, { crewOnly: true, excludeCrew: true })).toBe(true);
    expect(matchesFacets(crew, { excludeCrew: true })).toBe(false);
    expect(matchesFacets(facets(), { crewOnly: true })).toBe(false);
  });

  it("passes everything when no facets are set", () => {
    expect(matchesFacets(facets(), {})).toBe(true);
  });
});

describe("leadDeparture", () => {
  it("ignores departures that have already sailed", () => {
    const lead = leadDeparture(
      [departure({ startDate: new Date("2026-01-01T00:00:00Z") })],
      {},
      NOW,
    );
    expect(lead).toBeNull();
  });

  it("ignores sold-out departures", () => {
    expect(
      leadDeparture([departure({ berthsBooked: 8 })], {}, NOW),
    ).toBeNull();
  });

  it("leads with the cheapest per person, not the cheapest total", () => {
    // 800000/8 = 100000 each; 600000/4 = 150000 each. The bigger boat wins on
    // a per-person basis even though its total is higher.
    const lead = leadDeparture(
      [
        departure({ id: "small", berthsTotal: 4, sellPriceCents: 600000 }),
        departure({ id: "big", berthsTotal: 8, sellPriceCents: 800000 }),
      ],
      {},
      NOW,
    );
    expect(lead?.departureId).toBe("big");
    expect(lead?.perPersonFromCents).toBe(100000);
  });

  it("requires one departure to satisfy month and party size together", () => {
    // August has no space; the roomy departure is in September. Neither
    // satisfies both, so the trip does not qualify — splitting the conditions
    // across two departures would promise a week that cannot be booked.
    const departures = [
      departure({
        id: "aug",
        startDate: new Date("2026-08-01T00:00:00Z"),
        berthsBooked: 7,
      }),
      departure({
        id: "sep",
        startDate: new Date("2026-09-01T00:00:00Z"),
        berthsBooked: 0,
      }),
    ];
    expect(
      leadDeparture(departures, { month: 8, minBerthsAvailable: 4 }, NOW),
    ).toBeNull();
    expect(
      leadDeparture(departures, { month: 9, minBerthsAvailable: 4 }, NOW)
        ?.departureId,
    ).toBe("sep");
  });

  it("drops the trip when its cheapest departure is over the ceiling", () => {
    const departures = [departure({ sellPriceCents: 800000 })]; // 100000 each
    expect(
      leadDeparture(departures, { maxPricePerPersonCents: 90000 }, NOW),
    ).toBeNull();
    expect(
      leadDeparture(departures, { maxPricePerPersonCents: 100000 }, NOW),
    ).not.toBeNull();
  });
});

describe("filterTripIndex", () => {
  const index: TripIndex = {
    builtAt: NOW.toISOString(),
    trips: [
      {
        id: "t1",
        slug: "dalmatia-week",
        name: "Dalmatia week",
        summary: "",
        format: "WHOLE_BOAT",
        skipper: "SKIPPERED",
        skillLevel: "FIRST_TIMER",
        durationDays: 7,
        startPort: "Split",
        endPort: "Split",
        isCrewTrip: false,
        heroFrom: "#000",
        heroTo: "#fff",
        destination: { slug: "dalmatia", name: "Dalmatia", regionName: "Croatia" },
        regionSlug: "croatia",
        boat: {
          name: "Maestral",
          model: "Bavaria 46",
          type: "MONOHULL",
          lengthM: 14,
          cabins: 4,
          berths: 8,
        },
        operator: {
          slug: "adriatic-blue",
          name: "Adriatic Blue",
          ratingAvg: 4.8,
          reviewCount: 20,
        },
        departures: [
          {
            id: "d1",
            startDate: "2026-08-01T00:00:00.000Z",
            endDate: "2026-08-08T00:00:00.000Z",
            berthsTotal: 8,
            berthsBooked: 2,
            sellPriceCents: 800000,
          },
        ],
      },
    ],
  };

  it("revives ISO dates into the Date objects the cards format", () => {
    const [trip] = filterTripIndex(index, {}, NOW);
    expect(trip.lead?.startDate).toBeInstanceOf(Date);
    expect(trip.lead?.startDate.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("does not carry index-only fields onto the list item", () => {
    const [trip] = filterTripIndex(index, {}, NOW);
    expect(trip).not.toHaveProperty("departures");
    expect(trip).not.toHaveProperty("regionSlug");
  });

  it("applies facets and the lead calculation together", () => {
    expect(filterTripIndex(index, { destinationSlug: "kvarner" }, NOW)).toEqual(
      [],
    );
    expect(filterTripIndex(index, { minBerthsAvailable: 7 }, NOW)).toEqual([]);
    expect(
      filterTripIndex(index, { minBerthsAvailable: 6 }, NOW),
    ).toHaveLength(1);
  });

  it("drops trips whose departures have all sailed since the build", () => {
    // The index is a snapshot. A viewer opening it a year later must not be
    // shown a week that has already happened.
    const later = new Date("2027-01-01T00:00:00Z");
    expect(filterTripIndex(index, {}, later)).toEqual([]);
  });

  it("carries no cost or margin field into the browser", () => {
    const serialised = JSON.stringify(index);
    for (const field of [
      "netRateCents",
      "marginCents",
      "marginFloorPct",
      "marginCeilingPct",
      "commercialTier",
      "netRateDiscountPct",
      "allotmentBerths",
    ]) {
      expect(serialised).not.toContain(field);
    }
  });
});
