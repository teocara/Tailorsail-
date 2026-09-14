import { describe, expect, it } from "vitest";
import {
  ExtractedListingSchema,
  ItinerarySchema,
  ReadinessProgrammeSchema,
  TripFinderSchema,
} from "@/lib/ai/schemas";
import { toTripFilters } from "@/lib/ai/trip-finder";

/**
 * These schemas are the barrier between a model's output and the database.
 * The tests below are all variations on one question: does an implausible
 * generation get rejected, or does it get written?
 */

const day = (over: Record<string, unknown> = {}) => ({
  dayNumber: 1,
  title: "Split to Milna",
  fromPort: "Split",
  toPort: "Milna",
  nauticalMiles: 22,
  description:
    "A gentle first leg to shake the boat down. The maestral fills in around midday, giving a beam reach across the Brac channel with plenty of time to practise before the approach.",
  highlight: "First beam reach of the week",
  ...over,
});

describe("ItinerarySchema", () => {
  it("accepts a plausible day", () => {
    expect(ItinerarySchema.safeParse({ days: [day(), day({ dayNumber: 2 }), day({ dayNumber: 3 })] }).success).toBe(true);
  });

  it("rejects an implausible day sail", () => {
    // 400nm is a delivery passage, not a day of a holiday.
    expect(
      ItinerarySchema.safeParse({ days: [day({ nauticalMiles: 400 })] }).success,
    ).toBe(false);
  });

  it("rejects a one-line description that would render as filler", () => {
    expect(
      ItinerarySchema.safeParse({ days: [day({ description: "Nice sail." })] })
        .success,
    ).toBe(false);
  });

  it("rejects an itinerary too short to be a trip", () => {
    expect(ItinerarySchema.safeParse({ days: [day()] }).success).toBe(false);
  });

  it("rejects a non-integer day number", () => {
    expect(
      ItinerarySchema.safeParse({ days: [day({ dayNumber: 1.5 })] }).success,
    ).toBe(false);
  });
});

describe("ReadinessProgrammeSchema", () => {
  const task = (over: Record<string, unknown> = {}) => ({
    phase: "PREPARE",
    title: "Agree your bora bailout harbours",
    body: "Read the wind briefing with whoever is skippering and pick two harbours you would run to if the bora fills in overnight. Agree them before you leave rather than at 3am.",
    weeksBefore: 4,
    ...over,
  });

  it("accepts a full programme", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => task({ weeksBefore: i }));
    expect(ReadinessProgrammeSchema.safeParse({ tasks }).success).toBe(true);
  });

  it("rejects a phase the UI cannot render", () => {
    const tasks = Array.from({ length: 8 }, () => task({ phase: "ONBOARD" }));
    expect(ReadinessProgrammeSchema.safeParse({ tasks }).success).toBe(false);
  });

  it("rejects a programme too thin to be worth the name", () => {
    expect(
      ReadinessProgrammeSchema.safeParse({ tasks: [task(), task()] }).success,
    ).toBe(false);
  });
});

describe("ExtractedListingSchema", () => {
  const listing = () => ({
    operator: {
      name: "Adriatic Blue Charter",
      type: "CHARTER_COMPANY",
      homePort: "Split",
      about:
        "Family-run charter operation based in ACI Marina Split, running a fleet of eight monohulls and two catamarans since 2009.",
      licenceRef: "HR-CH-4471",
      insuranceExpiresAt: "2027-03-31",
    },
    boat: {
      name: "Maestral",
      model: "Bavaria Cruiser 46",
      type: "MONOHULL",
      lengthM: 14.27,
      cabins: 4,
      berths: 8,
      heads: 2,
      builtYear: 2019,
      refitYear: 2024,
      amenities: ["Bimini", "Chart plotter", "Bow thruster"],
    },
    suggestedTrip: {
      name: "Central Dalmatia week",
      summary:
        "A seven-day loop from Split taking in Brac, Hvar and Vis, built around the afternoon maestral.",
      format: "WHOLE_BOAT",
      skipper: "SKIPPERED",
      skillLevel: "FIRST_TIMER",
      durationDays: 7,
      startPort: "Split",
      endPort: "Split",
    },
    verificationGaps: [
      "We still need a copy of your safety equipment declaration for Maestral.",
    ],
    proposedTier: "PREFERRED",
    tierRationale:
      "Ten-boat fleet in a cruising ground where we are currently thin, and they volunteered flexibility on shoulder-season weeks.",
  });

  it("accepts a complete extraction", () => {
    expect(ExtractedListingSchema.safeParse(listing()).success).toBe(true);
  });

  it("allows nulls where the operator genuinely did not say", () => {
    const l = listing();
    l.operator.licenceRef = null as unknown as string;
    l.operator.insuranceExpiresAt = null as unknown as string;
    expect(ExtractedListingSchema.safeParse(l).success).toBe(true);
  });

  it("rejects a boat length that is not a real charter yacht", () => {
    const l = listing();
    l.boat.lengthM = 240;
    expect(ExtractedListingSchema.safeParse(l).success).toBe(false);
  });

  it("rejects an invented tier value", () => {
    const l = listing();
    l.proposedTier = "PLATINUM" as never;
    expect(ExtractedListingSchema.safeParse(l).success).toBe(false);
  });
});

describe("TripFinderSchema and toTripFilters", () => {
  const result = (over: Record<string, unknown> = {}) => ({
    filters: {
      destinationSlug: "dalmatia",
      regionSlug: null,
      month: 8,
      skillLevel: "FIRST_TIMER",
      format: null,
      skipper: "SKIPPERED",
      boatType: null,
      maxPricePerPersonEur: 1200,
      minBerthsAvailable: 6,
      crewOnly: null,
      ...over,
    },
    rationale: "Looking for a beginner-friendly skippered week in Dalmatia in August for six.",
  });

  it("converts nulls to undefined so absent filters don't narrow the search", () => {
    const filters = toTripFilters(TripFinderSchema.parse(result()));

    expect(filters.destinationSlug).toBe("dalmatia");
    expect(filters.month).toBe(8);
    expect(filters.minBerthsAvailable).toBe(6);
    // Nulls must not become filters — `format: null` would match nothing.
    expect(filters.format).toBeUndefined();
    expect(filters.regionSlug).toBeUndefined();
    expect(filters.crewOnly).toBeUndefined();
  });

  it("converts a euro budget to cents", () => {
    const filters = toTripFilters(TripFinderSchema.parse(result()));
    expect(filters.maxPricePerPersonCents).toBe(120000);
  });

  it("rejects a month outside the calendar", () => {
    expect(TripFinderSchema.safeParse(result({ month: 13 })).success).toBe(false);
  });

  it("requires a rationale so the UI can always explain the interpretation", () => {
    const r = result();
    expect(
      TripFinderSchema.safeParse({ filters: r.filters, rationale: "" }).success,
    ).toBe(false);
  });
});
