import Link from "next/link";
import { db } from "@/lib/db";
import { KIND_LABEL, openTasks } from "@/lib/ops";
import { loadInventoryHealth } from "@/lib/ops-queries";
import {
  approveHostApplication,
  markContentReviewed,
  resolveOpsTask,
  runTriageNow,
  runYieldNow,
} from "@/app/actions/ops";
import { Button, Card, Container, Pill, Section, Stat } from "@/components/ui";
import type { OpsTaskKind } from "@prisma/client";
import { perRequest } from "@/lib/render-mode";
import { IS_STATIC, liveAction } from "@/lib/static-mode";

export const metadata = { title: "Ops queue" };

const TONE: Record<OpsTaskKind, "critical" | "caution" | "accent" | "neutral"> =
  {
    EXPIRING_DOCUMENT: "critical",
    ESCALATED_MESSAGE: "caution",
    BOOKING_EXCEPTION: "caution",
    OPERATOR_APPROVAL: "accent",
    RATE_OPPORTUNITY: "accent",
    PRICE_OUT_OF_BAND: "neutral",
    LOW_OCCUPANCY: "neutral",
    CONTENT_REVIEW: "neutral",
  };

/**
 * The queue.
 *
 * One prioritised list containing everything that needs a person, each item
 * carrying the context, the recommendation and — where there is something to
 * send — a draft. This screen is the entire reason the company can be run by
 * two people: they work one list rather than watching six inboxes.
 */
export default async function OpsQueuePage() {
  await perRequest();
  const [tasks, health, recentlyDone] = await Promise.all([
    openTasks(),
    loadInventoryHealth(),
    db.opsTask.findMany({
      where: { status: { in: ["DONE", "DISMISSED"] } },
      orderBy: { resolvedAt: "desc" },
      take: 5,
    }),
  ]);

  // Subject lookups so each row can link to the thing it is about.
  const bookingIds = tasks
    .filter((t) => t.subjectType === "booking")
    .map((t) => t.subjectId);
  const applicationIds = tasks
    .filter((t) => t.subjectType === "hostApplication")
    .map((t) => t.subjectId);

  const [bookings, applications] = await Promise.all([
    bookingIds.length
      ? db.bookingRequest.findMany({
          where: { id: { in: bookingIds } },
          select: { id: true, reference: true },
        })
      : [],
    applicationIds.length
      ? db.hostApplication.findMany({
          where: { id: { in: applicationIds } },
          select: { id: true, contactName: true },
        })
      : [],
  ]);

  const bookingRef = new Map(bookings.map((b) => [b.id, b.reference]));
  const applicationSet = new Set(applications.map((a) => a.id));

  return (
    <Section className="!py-8">
      <Container>
        {/* --------------------------------------------------- Health strip */}
        <Card className="p-6">
          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label="Future departures"
              value={String(health.totalFuture)}
              hint={`${health.soldBerths} berths sold`}
            />
            <Stat
              label="Committed berths"
              value={String(health.committedBerths)}
              hint="Allotment we carry the risk on"
            />
            <Stat
              label="Filling slowly"
              value={String(health.emptyish)}
              hint="Under 35% inside 60 days"
            />
            <Stat
              label="Distressed"
              value={String(health.distressed)}
              hint="Bought below rack rate"
            />
            <Stat
              label="Outside margin band"
              value={String(health.belowFloor + health.aboveCeiling)}
              hint={`${health.belowFloor} below floor`}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-5">
            <form action={liveAction(runYieldNow)}>
              <Button type="submit" disabled={IS_STATIC} variant="secondary">
                Run yield engine
              </Button>
            </form>
            <form action={liveAction(runTriageNow)}>
              <Button type="submit" disabled={IS_STATIC} variant="secondary">
                Run triage sweep
              </Button>
            </form>
            <form action={liveAction(markContentReviewed)}>
              <Button type="submit" disabled={IS_STATIC} variant="quiet">
                Mark generated content reviewed
              </Button>
            </form>
          </div>
        </Card>

        {/* ---------------------------------------------------------- Queue */}
        <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl">
          {tasks.length === 0
            ? "Nothing needs you right now"
            : `${tasks.length} ${tasks.length === 1 ? "item" : "items"} need you`}
        </h2>

        {tasks.length === 0 ? (
          <Card className="mt-4 p-8 text-sm text-[var(--color-ink-muted)]">
            The queue is empty. Run the triage sweep to re-check documents,
            occupancy and pricing.
          </Card>
        ) : (
          <div className="mt-4 space-y-4">
            {tasks.map((task) => {
              const reference = bookingRef.get(task.subjectId);
              const isApplication = applicationSet.has(task.subjectId);

              return (
                <Card key={task.id} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={TONE[task.kind]}>
                          {KIND_LABEL[task.kind]}
                        </Pill>
                        <span className="text-xs text-[var(--color-ink-muted)]">
                          priority {task.priority}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{task.title}</p>
                    </div>

                    {reference ? (
                      <Link
                        href={`/bookings/${reference}`}
                        className="shrink-0 text-sm text-[var(--accent-strong)] hover:underline"
                      >
                        {reference} →
                      </Link>
                    ) : null}
                  </div>

                  {task.aiSummary ? (
                    <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                      {task.aiSummary}
                    </p>
                  ) : null}

                  {task.aiRecommendation ? (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Suggested:</span>{" "}
                      <span className="text-[var(--color-ink-muted)]">
                        {task.aiRecommendation}
                      </span>
                    </p>
                  ) : null}

                  {task.aiDraft ? (
                    <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-sunk)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                        Draft — edit before sending
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {task.aiDraft}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-4">
                    {isApplication ? (
                      <form action={liveAction(approveHostApplication)}>
                        <input
                          type="hidden"
                          name="applicationId"
                          value={task.subjectId}
                        />
                        <input type="hidden" name="taskId" value={task.id} />
                        <Button type="submit" disabled={IS_STATIC}>
                          Approve &amp; create operator
                        </Button>
                      </form>
                    ) : null}

                    <form action={liveAction(resolveOpsTask)}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="action" value="done" />
                      <Button
                        type="submit"
                        disabled={IS_STATIC}
                        variant="secondary"
                      >
                        Mark done
                      </Button>
                    </form>

                    <form action={liveAction(resolveOpsTask)}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="action" value="dismiss" />
                      <Button
                        type="submit"
                        disabled={IS_STATIC}
                        variant="quiet"
                      >
                        Dismiss
                      </Button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* --------------------------------------------------------- Recent */}
        {recentlyDone.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              Recently closed
            </h2>
            <ul className="mt-3 space-y-2">
              {recentlyDone.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white px-4 py-3 text-sm"
                >
                  <span>
                    <span className="text-[var(--color-ink-muted)]">
                      {KIND_LABEL[task.kind]} ·{" "}
                    </span>
                    {task.title}
                  </span>
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    {task.resolution ?? task.status.toLowerCase()}
                    {task.resolvedBy ? ` — ${task.resolvedBy}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
