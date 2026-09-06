import { mkdirSync, writeFileSync } from "node:fs";
import { db } from "../lib/db";
import { buildTripWhere, TRIP_LIST_SELECT } from "../lib/trips";
import type { TripIndex, TripIndexEntry } from "../lib/trip-index";

/**
 * Write the trip catalogue the static build filters in the browser.
 *
 * Runs before `next build` in the export, and is the only place the client's
 * copy of the catalogue comes from. Two decisions are made here rather than in
 * the browser:
 *
 * - **Which operators are sellable.** `buildTripWhere({})` is the same gate the
 *   server query uses, so an operator whose insurance has lapsed is absent from
 *   this file for exactly the reason they are absent from search. Whether a
 *   certificate is current is not a judgement to ship to a client.
 * - **Which fields exist at all.** `TRIP_LIST_SELECT` is the same projection
 *   `findTrips` reads, so this file carries no cost or margin data — the same
 *   guarantee, enforced by the same select.
 *
 * Everything left over is arithmetic the browser can safely redo, and does,
 * through the shared functions in lib/trip-filters.ts.
 */
async function main() {
  const now = new Date();

  const trips = await db.trip.findMany({
    // No filters: the facets are applied client-side. The gate this *does*
    // apply is verification and having a future departure at all.
    where: buildTripWhere({}, now),
    select: TRIP_LIST_SELECT,
  });

  const entries: TripIndexEntry[] = trips.map((trip) => ({
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
    regionSlug: trip.destination.region.slug,
    boat: {
      name: trip.boat.name,
      model: trip.boat.model,
      type: trip.boat.type,
      lengthM: trip.boat.lengthM,
      cabins: trip.boat.cabins,
      berths: trip.boat.berths,
    },
    operator: trip.boat.operator,
    // Only departures that have not sailed. Past ones would be dead weight in
    // a file every visitor downloads.
    departures: trip.departures
      .filter((d) => d.startDate >= now)
      .map((d) => ({
        id: d.id,
        startDate: d.startDate.toISOString(),
        endDate: d.endDate.toISOString(),
        berthsTotal: d.berthsTotal,
        berthsBooked: d.berthsBooked,
        sellPriceCents: d.sellPriceCents,
      })),
  }));

  const index: TripIndex = { builtAt: now.toISOString(), trips: entries };
  const json = JSON.stringify(index);

  mkdirSync("public", { recursive: true });
  writeFileSync("public/trip-index.json", json);

  const departures = entries.reduce((n, t) => n + t.departures.length, 0);
  console.log(
    `trip-index.json — ${entries.length} trips, ${departures} departures, ` +
      `${(json.length / 1024).toFixed(0)} KB`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
