import { readFileSync } from "node:fs";
import { db } from "../lib/db";
import { findTrips } from "../lib/trips";
import { filterTripIndex, type TripIndex } from "../lib/trip-index";
import type { TripFilters, TripSort } from "../lib/trip-filters";

/**
 * The drift guard.
 *
 * `lib/trips.ts` claims to be the single trip-search path, and the static build
 * puts a second one next to it: the browser filtering `trip-index.json`. The
 * arithmetic is shared, but the facet predicates that `buildTripWhere` pushes
 * into SQL have a hand-written twin in `matchesFacets`, and a claim of "one
 * search path" survives only as long as the two agree.
 *
 * So this runs both over the seeded database across a matrix of filters and
 * compares the results — the actual slugs, in order. It runs as part of
 * `build:static`, which means the export cannot ship an index that disagrees
 * with the query it is standing in for.
 *
 * It lives here rather than in tests/unit because it needs a database, and the
 * unit suite is deliberately pure.
 */

const SORTS: TripSort[] = ["recommended", "price-asc", "price-desc", "date"];

async function main() {
  const now = new Date();

  const index = JSON.parse(
    readFileSync("public/trip-index.json", "utf8"),
  ) as TripIndex;

  const destinations = await db.destination.findMany({
    select: { slug: true, region: { select: { slug: true } } },
  });

  /** Every filter shape the UI or the search parser can actually produce. */
  const matrix: TripFilters[] = [
    {},
    { crewOnly: true },
    { excludeCrew: true },
    ...destinations.map((d) => ({ destinationSlug: d.slug })),
    ...destinations.map((d) => ({ regionSlug: d.region.slug })),
    ...[5, 6, 7, 8, 9, 10].map((month) => ({ month })),
    ...(["FIRST_TIMER", "COMPETENT_CREW", "SKIPPER"] as const).map(
      (skillLevel) => ({ skillLevel }),
    ),
    ...(["WHOLE_BOAT", "CABIN_CHARTER", "FLOTILLA"] as const).map((format) => ({
      format,
    })),
    ...(["SKIPPERED", "BAREBOAT"] as const).map((skipper) => ({ skipper })),
    ...(["MONOHULL", "CATAMARAN", "GULET"] as const).map((boatType) => ({
      boatType,
    })),
    ...[1, 2, 4, 6, 8, 10].map((minBerthsAvailable) => ({
      minBerthsAvailable,
    })),
    ...[20000, 50000, 80000, 150000].map((maxPricePerPersonCents) => ({
      maxPricePerPersonCents,
    })),
    ...SORTS.map((sort) => ({ sort })),
    // Combinations, where a predicate that is individually right can still
    // compose wrongly — the skill ladder against a format, say.
    { destinationSlug: destinations[0]?.slug, month: 8, skillLevel: "FIRST_TIMER" },
    { skillLevel: "SKIPPER", format: "WHOLE_BOAT", skipper: "BAREBOAT" },
    { crewOnly: true, month: 7, minBerthsAvailable: 1 },
    { regionSlug: destinations[0]?.region.slug, boatType: "CATAMARAN" },
    { excludeCrew: true, maxPricePerPersonCents: 90000, sort: "price-asc" },
    { month: 9, minBerthsAvailable: 4, sort: "date" },
    { skillLevel: "COMPETENT_CREW", maxPricePerPersonCents: 60000 },
    { limit: 3 },
    { limit: 3, sort: "price-desc" },
  ];

  let checked = 0;
  const failures: string[] = [];

  for (const filters of matrix) {
    const fromDb = await findTrips(filters, now);
    const fromIndex = filterTripIndex(index, filters, now);

    const a = fromDb.map((t) => t.slug);
    const b = fromIndex.map((t) => t.slug);
    checked++;

    if (JSON.stringify(a) !== JSON.stringify(b)) {
      failures.push(
        `${JSON.stringify(filters)}\n    query: ${a.join(", ") || "(none)"}\n    index: ${b.join(", ") || "(none)"}`,
      );
      continue;
    }

    // Same trips is not enough — the card quotes a price, and leading with a
    // departure the customer cannot get is the failure that matters.
    for (let i = 0; i < fromDb.length; i++) {
      const x = fromDb[i].lead;
      const y = fromIndex[i].lead;
      if (
        x?.departureId !== y?.departureId ||
        x?.perPersonFromCents !== y?.perPersonFromCents
      ) {
        failures.push(
          `${JSON.stringify(filters)} — lead departure differs on ${fromDb[i].slug}\n` +
            `    query: ${x?.departureId} @ ${x?.perPersonFromCents}\n` +
            `    index: ${y?.departureId} @ ${y?.perPersonFromCents}`,
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error(
      `\ntrip index disagrees with findTrips on ${failures.length} of ${checked} filter sets:\n`,
    );
    for (const f of failures) console.error(`  ${f}\n`);
    process.exit(1);
  }

  console.log(
    `trip index matches findTrips across ${checked} filter sets, ${index.trips.length} trips.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
