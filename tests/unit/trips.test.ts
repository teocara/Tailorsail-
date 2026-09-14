import { describe, expect, it } from "vitest";
import {
  buildTripWhere,
  filtersFromSearchParams,
  searchParamsFromFilters,
  skillsAtOrBelow,
  sortTrips,
  type TripListItem,
} from "@/lib/trips";

const NOW = new Date("2026-07-01T00:00:00Z");

/** Pull the AND clauses out of the generated where for inspection. */
const clauses = (where: ReturnType<typeof buildTripWhere>) =>
  (where.AND ?? []) as Record<string, unknown>[];

describe("skillsAtOrBelow", () => {
  it("treats skill as a ladder, not an exact match", () => {
    // A first-timer should see first-timer trips only...
    expect(skillsAtOrBelow("FIRST_TIMER")).toEqual(["FIRST_TIMER"]);
    // ...but a skipper can take anything.
    expect(skillsAtOrBelow("SKIPPER")).toEqual([
      "FIRST_TIMER",
      "COMPETENT_CREW",
      "SKIPPER",
    ]);
  });
});

describe("buildTripWhere", () => {
  it("always restricts to verified operators with live insurance", () => {
    const found = clauses(buildTripWhere({}, NOW)).find(
      (c) => "boat" in c && (c.boat as Record<string, unknown>).operator,
    );
    expect(found).toBeDefined();

    const operator = (found!.boat as { operator: Record<string, unknown> })
      .operator;
    expect(operator.status).toBe("VERIFIED");
    expect(operator.OR).toEqual([
      { insuranceExpiresAt: null },
      { insuranceExpiresAt: { gte: NOW } },
    ]);
  });

  it("always requires at least one future departure", () => {
    const found = clauses(buildTripWhere({}, NOW)).find((c) => "departures" in c);
    expect(found).toEqual({
      departures: { some: { startDate: { gte: NOW } } },
    });
  });

  it("filters skill as at-or-below rather than equal", () => {
    const found = clauses(
      buildTripWhere({ skillLevel: "COMPETENT_CREW" }, NOW),
    ).find((c) => "skillLevel" in c);

    expect(found).toEqual({
      skillLevel: { in: ["FIRST_TIMER", "COMPETENT_CREW"] },
    });
  });

  it("scopes by destination and region", () => {
    const byDest = clauses(
      buildTripWhere({ destinationSlug: "ibiza-formentera" }, NOW),
    );
    expect(byDest).toContainEqual({
      destination: { slug: "ibiza-formentera" },
    });

    const byRegion = clauses(buildTripWhere({ regionSlug: "italy" }, NOW));
    expect(byRegion).toContainEqual({
      destination: { region: { slug: "italy" } },
    });
  });

  it("includes only Crew trips for crewOnly and excludes them otherwise", () => {
    expect(clauses(buildTripWhere({ crewOnly: true }, NOW))).toContainEqual({
      isCrewTrip: true,
    });
    expect(clauses(buildTripWhere({ excludeCrew: true }, NOW))).toContainEqual({
      isCrewTrip: false,
    });
  });

  it("does not apply both crew clauses when given contradictory filters", () => {
    const c = clauses(buildTripWhere({ crewOnly: true, excludeCrew: true }, NOW));
    const crewClauses = c.filter((x) => "isCrewTrip" in x);
    expect(crewClauses).toHaveLength(1);
    expect(crewClauses[0]).toEqual({ isCrewTrip: true });
  });

  it("passes boat type through to the nested boat relation", () => {
    const c = clauses(buildTripWhere({ boatType: "CATAMARAN" }, NOW));
    expect(c).toContainEqual({ boat: { type: "CATAMARAN" } });
  });
});

const item = (over: Partial<TripListItem> = {}): TripListItem => ({
  id: "t1",
  slug: "t1",
  name: "Trip",
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
  boat: {
    name: "Bella",
    model: "Bavaria 46",
    type: "MONOHULL",
    lengthM: 14,
    cabins: 4,
    berths: 8,
    },
  operator: { slug: "op", name: "Op", ratingAvg: 4.5, reviewCount: 10 },
  lead: {
    departureId: "d1",
    startDate: new Date("2026-08-01T00:00:00Z"),
    endDate: new Date("2026-08-08T00:00:00Z"),
    berthsFree: 4,
    sellPriceCents: 320000,
    perPersonFromCents: 40000,
  },
  ...over,
});

describe("sortTrips", () => {
  const cheapLate = item({
    id: "cheap",
    lead: { ...item().lead!, perPersonFromCents: 20000, startDate: new Date("2026-09-01") },
  });
  const dearEarly = item({
    id: "dear",
    lead: { ...item().lead!, perPersonFromCents: 90000, startDate: new Date("2026-07-15") },
  });

  it("sorts by price ascending and descending", () => {
    expect(sortTrips([dearEarly, cheapLate], "price-asc")[0].id).toBe("cheap");
    expect(sortTrips([cheapLate, dearEarly], "price-desc")[0].id).toBe("dear");
  });

  it("sorts by soonest departure for date", () => {
    expect(sortTrips([cheapLate, dearEarly], "date")[0].id).toBe("dear");
  });

  it("ranks better-rated operators first under recommended", () => {
    const good = item({ id: "good", operator: { slug: "a", name: "A", ratingAvg: 4.9, reviewCount: 30 } });
    const ok = item({ id: "ok", operator: { slug: "b", name: "B", ratingAvg: 4.0, reviewCount: 30 } });
    expect(sortTrips([ok, good], "recommended")[0].id).toBe("good");
  });

  it("does not mutate the input array", () => {
    const input = [dearEarly, cheapLate];
    sortTrips(input, "price-asc");
    expect(input[0].id).toBe("dear");
  });
});

describe("search param round-trip", () => {
  it("parses params into filters", () => {
    const filters = filtersFromSearchParams({
      destination: "aeolian-islands",
      month: "8",
      skill: "FIRST_TIMER",
      maxPrice: "1200",
      berths: "6",
      sort: "price-asc",
    });

    expect(filters.destinationSlug).toBe("aeolian-islands");
    expect(filters.month).toBe(8);
    expect(filters.skillLevel).toBe("FIRST_TIMER");
    expect(filters.maxPricePerPersonCents).toBe(120000);
    expect(filters.minBerthsAvailable).toBe(6);
    expect(filters.sort).toBe("price-asc");
  });

  it("ignores values outside the allowed enum instead of trusting them", () => {
    const filters = filtersFromSearchParams({
      skill: "ADMIRAL",
      format: "; DROP TABLE trips",
      sort: "cheapest",
    });
    expect(filters.skillLevel).toBeUndefined();
    expect(filters.format).toBeUndefined();
    expect(filters.sort).toBeUndefined();
  });

  it("ignores non-numeric numbers", () => {
    const filters = filtersFromSearchParams({ month: "August", maxPrice: "cheap" });
    expect(filters.month).toBeUndefined();
    expect(filters.maxPricePerPersonCents).toBeUndefined();
  });

  it("takes the first value when a param is repeated", () => {
    const filters = filtersFromSearchParams({ destination: ["ibiza", "hvar"] });
    expect(filters.destinationSlug).toBe("ibiza");
  });

  it("round-trips filters back into params so AI search URLs are shareable", () => {
    const filters = {
      destinationSlug: "dalmatia",
      month: 8,
      skillLevel: "FIRST_TIMER" as const,
      maxPricePerPersonCents: 95000,
      minBerthsAvailable: 6,
    };
    const parsed = filtersFromSearchParams(
      Object.fromEntries(searchParamsFromFilters(filters)),
    );

    expect(parsed.destinationSlug).toBe(filters.destinationSlug);
    expect(parsed.month).toBe(filters.month);
    expect(parsed.skillLevel).toBe(filters.skillLevel);
    expect(parsed.maxPricePerPersonCents).toBe(filters.maxPricePerPersonCents);
    expect(parsed.minBerthsAvailable).toBe(filters.minBerthsAvailable);
  });
});
