import { db } from "@/lib/db";
import { openTask, PRIORITY } from "@/lib/ops";
import { insuranceState } from "@/lib/verification";
import { formatCents } from "@/lib/money";

/**
 * The nightly sweep that keeps the ops queue honest.
 *
 * This is the difference between "we have a dashboard" and "the company
 * notices things". Nobody is going to remember to check whether an operator's
 * insurance expires next month, or that a July departure in Ibiza is still
 * empty at three weeks out. The sweep finds them and turns each into a task
 * with the action already decided.
 *
 * Deliberately deterministic — it needs no API key and must keep running when
 * the model is unavailable. Claude enriches these tasks with drafts elsewhere;
 * the *finding* is plain SQL and arithmetic.
 */

export interface TriageSummary {
  expiringDocuments: number;
  lowOccupancy: number;
  distressedInventory: number;
  slowOperators: number;
  unreviewedContent: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export async function runTriage(now: Date = new Date()): Promise<TriageSummary> {
  const summary: TriageSummary = {
    expiringDocuments: 0,
    lowOccupancy: 0,
    distressedInventory: 0,
    slowOperators: 0,
    unreviewedContent: 0,
  };

  // --- Insurance and safety documents -------------------------------------
  const operators = await db.operator.findMany({
    where: { status: { in: ["VERIFIED", "PENDING"] } },
  });

  for (const operator of operators) {
    const state = insuranceState(operator, now);

    if (state === "EXPIRING" || state === "LAPSED") {
      const expiry = operator.insuranceExpiresAt!;
      const lapsed = state === "LAPSED";

      await openTask({
        kind: "EXPIRING_DOCUMENT",
        priority: lapsed ? PRIORITY.URGENT : PRIORITY.HIGH,
        title: `${operator.name} — insurance ${lapsed ? "lapsed" : "expiring"}`,
        subjectType: "operator",
        subjectId: operator.id,
        aiSummary: lapsed
          ? `Cover expired ${expiry.toISOString().slice(0, 10)}. This operator's trips are already hidden from search, so every day this stays open is lost inventory.`
          : `Cover expires ${expiry.toISOString().slice(0, 10)} (${daysBetween(now, expiry)} days). Their trips drop out of search automatically on that date.`,
        aiRecommendation: lapsed
          ? "Chase the renewal certificate today; restore listings the moment it lands."
          : "Request the renewal certificate now so there is no gap in availability.",
      });
      summary.expiringDocuments += 1;
    }

    // A safety declaration older than a year is stale rather than urgent.
    if (
      operator.safetyDeclarationAt &&
      daysBetween(operator.safetyDeclarationAt, now) > 365
    ) {
      await openTask({
        kind: "EXPIRING_DOCUMENT",
        priority: PRIORITY.NORMAL,
        title: `${operator.name} — safety declaration due for renewal`,
        subjectType: "operator",
        subjectId: operator.id,
        aiSummary: `Last declaration ${operator.safetyDeclarationAt.toISOString().slice(0, 10)}, over a year old. The trust badge has already downgraded to a caution.`,
        aiRecommendation: "Send the annual safety declaration form for re-signature.",
      });
      summary.expiringDocuments += 1;
    }

    // Slow responders cost us bookings and generate concierge work.
    if (operator.responseTimeHours > 48 && operator.status === "VERIFIED") {
      await openTask({
        kind: "OPERATOR_APPROVAL",
        priority: PRIORITY.LOW,
        title: `${operator.name} — slow to respond (${Math.round(operator.responseTimeHours)}h)`,
        subjectType: "operator",
        subjectId: operator.id,
        aiSummary: `Median reply time is ${Math.round(operator.responseTimeHours)}h. We absorb this as concierge work, and it shows on their public profile as a caution.`,
        aiRecommendation:
          "Agree a response-time expectation, or route their bookings through us rather than direct.",
      });
      summary.slowOperators += 1;
    }
  }

  // --- Inventory at risk ---------------------------------------------------
  const horizon = new Date(now.getTime() + 120 * DAY_MS);

  const departures = await db.departure.findMany({
    where: { startDate: { gte: now, lte: horizon } },
    include: {
      trip: {
        select: {
          name: true,
          destination: { select: { name: true } },
          boat: { select: { operator: { select: { name: true } } } },
        },
      },
    },
  });

  for (const departure of departures) {
    const daysOut = daysBetween(now, departure.startDate);
    const free = departure.berthsTotal - departure.berthsBooked;
    if (free <= 0) continue;

    const occupancy =
      departure.berthsTotal > 0
        ? departure.berthsBooked / departure.berthsTotal
        : 0;

    const label = `${departure.trip.name} — ${departure.startDate.toISOString().slice(0, 10)}`;

    // Close and empty: this is the buy-side opportunity. An unsold week is
    // worth far less to the operator than to us, so it's worth an offer.
    if (daysOut <= 28 && occupancy < 0.4) {
      await openTask({
        kind: "RATE_OPPORTUNITY",
        priority: PRIORITY.HIGH,
        title: `Distressed: ${label}`,
        subjectType: "departure",
        subjectId: departure.id,
        aiSummary: `${departure.trip.destination.name}, ${daysOut} days out, ${departure.berthsBooked}/${departure.berthsTotal} sold. Current net rate ${formatCents(departure.netRateCents)} with ${departure.trip.boat.operator.name}.`,
        aiRecommendation:
          "Offer a reduced net rate to take the week off their hands, then reprice to move it.",
      });
      summary.distressedInventory += 1;
      continue;
    }

    // Further out but tracking badly: a pricing problem, not a buying one.
    if (daysOut > 28 && daysOut <= 75 && occupancy < 0.35) {
      await openTask({
        kind: "LOW_OCCUPANCY",
        priority: PRIORITY.LOW,
        title: `Slow seller: ${label}`,
        subjectType: "departure",
        subjectId: departure.id,
        aiSummary: `${departure.trip.destination.name}, ${daysOut} days out, only ${departure.berthsBooked}/${departure.berthsTotal} sold.`,
        aiRecommendation:
          "Consider a price step down, or bundle a course to raise the value rather than cutting the headline.",
      });
      summary.lowOccupancy += 1;
    }
  }

  // --- Generated content still awaiting a human pass -----------------------
  const unreviewedDays = await db.itineraryDay.count({
    where: { source: "AI_GENERATED", reviewedAt: null },
  });
  const unreviewedTasks = await db.readinessTask.count({
    where: { source: "AI_GENERATED", reviewedAt: null },
  });

  if (unreviewedDays + unreviewedTasks > 0) {
    await openTask({
      kind: "CONTENT_REVIEW",
      priority: PRIORITY.LOW,
      title: `${unreviewedDays + unreviewedTasks} generated items awaiting review`,
      subjectType: "content",
      subjectId: "unreviewed",
      aiSummary: `${unreviewedDays} itinerary days and ${unreviewedTasks} readiness tasks are AI-generated and have not been read by a human.`,
      aiRecommendation:
        "Spot-check the destination-specific claims — permits, winds, approaches — then mark reviewed.",
    });
    summary.unreviewedContent = unreviewedDays + unreviewedTasks;
  }

  return summary;
}
