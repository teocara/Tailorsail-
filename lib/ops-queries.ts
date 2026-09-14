import { db } from "@/lib/db";
import type { BookingSnapshot } from "@/lib/pricing/margin";

/**
 * Data loaders for the ops console.
 *
 * These are the only place that reads cost and margin out of the database.
 * Keeping them in one module — separate from `lib/trips.ts`, which serves the
 * public site and deliberately never selects a net rate — makes the boundary
 * visible: if a query here ever appeared in a customer-facing route, that
 * would be obvious in review rather than buried in a select.
 */

/** Load every booking as a snapshot for the margin analytics. */
export async function loadBookingSnapshots(): Promise<BookingSnapshot[]> {
  const bookings = await db.bookingRequest.findMany({
    where: { status: { in: ["REQUESTED", "CONFIRMED"] } },
    include: {
      addOns: true,
      departure: {
        include: {
          trip: {
            include: {
              destination: { select: { id: true, name: true } },
              boat: {
                include: { operator: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    createdAt: b.createdAt,
    berths: b.berths,
    netRateCents: b.netRateCents,
    sellPriceCents: b.sellPriceCents,
    extrasCents: b.extrasCents,
    addOnsCents: b.addOnsCents,
    addOnsNetCents: b.addOns.reduce((acc, a) => acc + a.netRateCents, 0),
    totalCents: b.totalCents,
    marginCents: b.marginCents,
    destinationId: b.departure.trip.destination.id,
    destinationName: b.departure.trip.destination.name,
    operatorId: b.departure.trip.boat.operator.id,
    operatorName: b.departure.trip.boat.operator.name,
    acquisition: b.departure.acquisition,
    isCrewTrip: b.departure.trip.isCrewTrip,
  }));
}

export interface InventoryHealth {
  totalFuture: number;
  emptyish: number;
  distressed: number;
  belowFloor: number;
  aboveCeiling: number;
  committedBerths: number;
  soldBerths: number;
}

/**
 * Inventory health at a glance.
 *
 * `committedBerths` is the number we have bought and are carrying the risk on.
 * That figure is the merchant model's actual exposure, and it is the one that
 * should make a founder uncomfortable if it runs ahead of sales.
 */
export async function loadInventoryHealth(
  now: Date = new Date(),
): Promise<InventoryHealth> {
  const departures = await db.departure.findMany({
    where: { startDate: { gte: now } },
    select: {
      berthsTotal: true,
      berthsBooked: true,
      netRateCents: true,
      sellPriceCents: true,
      marginFloorPct: true,
      marginCeilingPct: true,
      acquisition: true,
      startDate: true,
    },
  });

  let emptyish = 0;
  let belowFloor = 0;
  let aboveCeiling = 0;
  let committedBerths = 0;
  let soldBerths = 0;

  for (const d of departures) {
    const occupancy = d.berthsTotal > 0 ? d.berthsBooked / d.berthsTotal : 0;
    const margin =
      d.sellPriceCents > 0
        ? (d.sellPriceCents - d.netRateCents) / d.sellPriceCents
        : 0;

    const daysOut = Math.floor(
      (d.startDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (daysOut <= 60 && occupancy < 0.35) emptyish += 1;
    if (margin < d.marginFloorPct - 0.001) belowFloor += 1;
    if (margin > d.marginCeilingPct + 0.02) aboveCeiling += 1;
    if (d.acquisition === "ALLOTMENT") committedBerths += d.berthsTotal;
    soldBerths += d.berthsBooked;
  }

  return {
    totalFuture: departures.length,
    emptyish,
    distressed: departures.filter((d) => d.acquisition === "DISTRESSED").length,
    belowFloor,
    aboveCeiling,
    committedBerths,
    soldBerths,
  };
}

export interface SpendSummary {
  calls: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheHitRate: number;
  byFeature: {
    feature: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    failures: number;
    avgLatencyMs: number;
  }[];
}

/**
 * AI spend, from the AiRun table every generation writes to.
 *
 * A company running its operations on a model needs to see what that costs
 * without standing up an observability stack. Cache hit rate is the number
 * worth watching: the destination briefings sit behind a cache breakpoint, so
 * a hit rate that collapses usually means somebody made the "stable" prefix
 * not stable.
 */
export async function loadSpendSummary(): Promise<SpendSummary> {
  const runs = await db.aiRun.findMany({ orderBy: { createdAt: "desc" } });

  const byFeatureMap = new Map<string, typeof runs>();
  for (const run of runs) {
    const list = byFeatureMap.get(run.feature) ?? [];
    list.push(run);
    byFeatureMap.set(run.feature, list);
  }

  const inputTokens = runs.reduce((a, r) => a + r.inputTokens, 0);
  const cacheReadTokens = runs.reduce((a, r) => a + r.cacheReadTokens, 0);

  return {
    calls: runs.length,
    failures: runs.filter((r) => !r.ok).length,
    inputTokens,
    outputTokens: runs.reduce((a, r) => a + r.outputTokens, 0),
    cacheReadTokens,
    cacheHitRate:
      inputTokens + cacheReadTokens > 0
        ? cacheReadTokens / (inputTokens + cacheReadTokens)
        : 0,
    byFeature: [...byFeatureMap.entries()]
      .map(([feature, list]) => ({
        feature,
        calls: list.length,
        inputTokens: list.reduce((a, r) => a + r.inputTokens, 0),
        outputTokens: list.reduce((a, r) => a + r.outputTokens, 0),
        cacheReadTokens: list.reduce((a, r) => a + r.cacheReadTokens, 0),
        failures: list.filter((r) => !r.ok).length,
        avgLatencyMs: Math.round(
          list.reduce((a, r) => a + r.latencyMs, 0) / list.length,
        ),
      }))
      .sort((a, b) => b.calls - a.calls),
  };
}
