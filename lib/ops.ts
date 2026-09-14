import { db } from "@/lib/db";
import type { OpsTaskKind } from "@prisma/client";

/**
 * The two-person work queue.
 *
 * Everything that needs human judgement lands here as an OpsTask carrying a
 * summary, a recommendation and a draft. The founders work one prioritised
 * list rather than watching six inboxes, which is the difference between this
 * company being runnable by two people and not.
 */

/**
 * Priority is a number so the queue can be sorted without a special case per
 * kind, but the bands are what actually matter — an uninsured operator with
 * live bookings must outrank a pricing suggestion no matter what else is open.
 */
export const PRIORITY = {
  /** Someone is exposed right now. */
  URGENT: 90,
  /** Money or a customer is waiting on us today. */
  HIGH: 70,
  /** Should happen this week. */
  NORMAL: 50,
  /** Worth doing when there's room. */
  LOW: 30,
} as const;

export const DEFAULT_PRIORITY: Record<OpsTaskKind, number> = {
  ESCALATED_MESSAGE: PRIORITY.HIGH,
  EXPIRING_DOCUMENT: PRIORITY.URGENT,
  BOOKING_EXCEPTION: PRIORITY.HIGH,
  OPERATOR_APPROVAL: PRIORITY.NORMAL,
  PRICE_OUT_OF_BAND: PRIORITY.NORMAL,
  RATE_OPPORTUNITY: PRIORITY.NORMAL,
  LOW_OCCUPANCY: PRIORITY.LOW,
  CONTENT_REVIEW: PRIORITY.LOW,
};

export interface OpenTaskInput {
  kind: OpsTaskKind;
  title: string;
  subjectType: string;
  subjectId: string;
  aiSummary?: string;
  aiRecommendation?: string;
  aiDraft?: string;
  priority?: number;
}

/**
 * Open a task, unless an identical one is already open.
 *
 * The dedupe is load-bearing: `triage` runs on a schedule and would otherwise
 * re-raise the same expiring-insurance task every night until someone acted on
 * it, which is how a useful queue becomes noise people stop reading.
 */
export async function openTask(input: OpenTaskInput) {
  const existing = await db.opsTask.findFirst({
    where: {
      kind: input.kind,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      status: "OPEN",
    },
  });

  if (existing) {
    return existing;
  }

  return db.opsTask.create({
    data: {
      kind: input.kind,
      title: input.title,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      aiSummary: input.aiSummary ?? "",
      aiRecommendation: input.aiRecommendation ?? "",
      aiDraft: input.aiDraft ?? "",
      priority: input.priority ?? DEFAULT_PRIORITY[input.kind],
    },
  });
}

export async function resolveTask(
  id: string,
  resolution: "DONE" | "DISMISSED",
  by: string,
  note?: string,
) {
  return db.opsTask.update({
    where: { id },
    data: {
      status: resolution,
      resolvedAt: new Date(),
      resolvedBy: by,
      resolution: note,
    },
  });
}

export async function openTasks() {
  return db.opsTask.findMany({
    where: { status: "OPEN" },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export const KIND_LABEL: Record<OpsTaskKind, string> = {
  OPERATOR_APPROVAL: "Operator approval",
  ESCALATED_MESSAGE: "Escalated message",
  BOOKING_EXCEPTION: "Booking exception",
  EXPIRING_DOCUMENT: "Expiring document",
  CONTENT_REVIEW: "Content review",
  RATE_OPPORTUNITY: "Rate opportunity",
  PRICE_OUT_OF_BAND: "Price out of band",
  LOW_OCCUPANCY: "Low occupancy",
};
