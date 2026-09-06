import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { buildCustomerQuote } from "@/lib/pricing/quote";
import type { PriceComponentInput } from "@/lib/pricing/types";
import { isConfigured } from "@/lib/ai/client";
import { toggleReadiness } from "@/app/actions/booking";
import { sendConciergeMessage } from "@/app/actions/concierge";
import { PriceBreakdown } from "@/components/price-breakdown";
import {
  AiNotice,
  Button,
  Card,
  Container,
  Eyebrow,
  Pill,
  Section,
  formatDateRange,
} from "@/components/ui";
import { perRequest } from "@/lib/render-mode";
import { IS_STATIC, liveAction } from "@/lib/static-mode";

/**
 * Only the seeded bookings get a page in the static build.
 *
 * References are minted at booking time (`makeReference` in
 * app/actions/booking.ts), so there is no build-time-known set beyond what the
 * seed created — and with no server there can be no new bookings to name.
 */
export async function generateStaticParams() {
  // Export only. The server build returns nothing here so every path renders
  // on demand — otherwise a yield run would reprice a departure and this page
  // would keep serving the price from whenever it was last built.
  if (!IS_STATIC) return [];
  const bookings = await db.bookingRequest.findMany({
    select: { reference: true },
  });
  return bookings.map((b) => ({ reference: b.reference }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return { title: `Booking ${reference}` };
}

const PHASE_LABEL: Record<string, string> = {
  BOOK: "Now you've booked",
  PREPARE: "In the weeks before",
  PACK: "Packing",
  ARRIVE: "On arrival",
};

const PHASES = ["BOOK", "PREPARE", "PACK", "ARRIVE"] as const;

const AUTHOR_LABEL: Record<string, string> = {
  TRAVELER: "You",
  OPERATOR: "Operator",
  CONCIERGE_AI: "Tailorsail AI",
  CONCIERGE_HUMAN: "Tailorsail",
};

export default async function BookingPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  await perRequest();
  const { reference } = await params;

  const booking = await db.bookingRequest.findUnique({
    where: { reference },
    include: {
      user: true,
      addOns: { include: { addOn: true } },
      readiness: {
        include: { task: true },
        orderBy: { task: { weeksBefore: "desc" } },
      },
      thread: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      departure: {
        include: {
          trip: {
            include: {
              priceComponents: { orderBy: { order: "asc" } },
              destination: { select: { name: true, slug: true } },
              boat: {
                select: {
                  name: true,
                  model: true,
                  operator: { select: { name: true, slug: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!booking) notFound();

  const trip = booking.departure.trip;

  const components: PriceComponentInput[] = trip.priceComponents.map((c) => ({
    label: c.label,
    amountCents: c.amountCents,
    kind: c.kind,
    payableAt: c.payableAt,
    visibility: c.visibility,
    perPerson: c.perPerson,
    note: c.note,
    order: c.order,
  }));

  // Rebuilt from the frozen snapshot on the booking, not from the departure's
  // current price — the customer owes what they agreed to, whatever the yield
  // engine has done since.
  const quote = buildCustomerQuote({
    sellPriceCents: booking.sellPriceCents,
    components,
    addOns: booking.addOns.map((row) => ({
      id: row.addOnId,
      name: row.addOn.name,
      // Already multiplied by berths at booking time, so pass per-booking.
      sellPriceCents: row.sellPriceCents,
      perPerson: false,
    })),
    berths: booking.berths,
  });

  const done = booking.readiness.filter((r) => r.completedAt).length;
  const total = booking.readiness.length;

  const escalationPending = await db.opsTask.findFirst({
    where: {
      kind: "ESCALATED_MESSAGE",
      subjectId: booking.id,
      status: "OPEN",
    },
  });

  return (
    <Section>
      <Container>
        {/* -------------------------------------------------------- Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>Booking {booking.reference}</Eyebrow>
            <h1 className="mt-2 text-3xl">{trip.name}</h1>
            <p className="mt-1 text-[var(--color-ink-muted)]">
              {trip.destination.name} ·{" "}
              {formatDateRange(
                booking.departure.startDate,
                booking.departure.endDate,
              )}{" "}
              · {booking.berths} {booking.berths === 1 ? "person" : "people"} ·{" "}
              {trip.boat.name}
            </p>
          </div>
          <Pill tone={booking.status === "CONFIRMED" ? "positive" : "caution"}>
            {booking.status === "CONFIRMED"
              ? "Confirmed"
              : "Requested — we're confirming with the operator"}
          </Pill>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          {/* ------------------------------------------------ Left column */}
          <div className="min-w-0 space-y-10">
            {/* Readiness checklist */}
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Eyebrow>Getting ready</Eyebrow>
                  <h2 className="mt-1 text-2xl">
                    Your {trip.destination.name} programme
                  </h2>
                </div>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {done} of {total} done
                </p>
              </div>

              <div
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunk)]"
                role="progressbar"
                aria-valuenow={done}
                aria-valuemin={0}
                aria-valuemax={total}
              >
                <div
                  className="h-full rounded-full bg-[var(--accent-strong)] transition-all"
                  style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                />
              </div>

              <div className="mt-6 space-y-7">
                {PHASES.map((phase) => {
                  const rows = booking.readiness.filter(
                    (r) => r.task.phase === phase,
                  );
                  if (rows.length === 0) return null;

                  return (
                    <div key={phase}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                        {PHASE_LABEL[phase]}
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {rows.map((row) => (
                          <li key={row.id}>
                            <form action={liveAction(toggleReadiness)}>
                              <input type="hidden" name="id" value={row.id} />
                              <input
                                type="hidden"
                                name="reference"
                                value={booking.reference}
                              />
                              <button
                                type="submit"
                                disabled={IS_STATIC}
                                className={`flex w-full gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors ${
                                  row.completedAt
                                    ? "border-[var(--color-line)] bg-[var(--color-surface-sunk)]"
                                    : "border-[var(--color-line)] hover:border-[var(--accent-strong)]"
                                }`}
                              >
                                <span
                                  aria-hidden
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                                    row.completedAt
                                      ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-white"
                                      : "border-[var(--color-line)]"
                                  }`}
                                >
                                  {row.completedAt ? "✓" : ""}
                                </span>
                                <span className="flex-1">
                                  <span
                                    className={`block font-medium ${row.completedAt ? "text-[var(--color-ink-muted)] line-through" : ""}`}
                                  >
                                    {row.task.title}
                                  </span>
                                  <span className="mt-1 block text-sm text-[var(--color-ink-muted)]">
                                    {row.task.body}
                                  </span>
                                </span>
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Concierge thread */}
            <div>
              <Eyebrow>Concierge</Eyebrow>
              <h2 className="mt-1 text-2xl">Ask us anything</h2>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                One thread for the whole trip. Straightforward questions are
                answered immediately by our assistant and labelled as such.
                Anything involving money, changes to your booking, or safety
                goes to a person — we do not let a machine answer those.
              </p>

              <div className="mt-5 space-y-4">
                {(booking.thread?.messages ?? []).map((message) => {
                  const mine = message.authorRole === "TRAVELER";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-[var(--radius-card)] border p-4 ${
                          mine
                            ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]"
                            : "border-[var(--color-line)] bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xs font-semibold">
                            {AUTHOR_LABEL[message.authorRole]}
                          </span>
                          {message.authorRole === "CONCIERGE_AI" ? (
                            <Pill tone="neutral">Answered automatically</Pill>
                          ) : null}
                          <span className="text-xs text-[var(--color-ink-muted)]">
                            {message.createdAt.toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          {message.body}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {escalationPending ? (
                  <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-sunk)] p-4 text-sm text-[var(--color-ink-muted)]">
                    A human is picking this one up — we do not let the assistant
                    answer questions about money, changes or safety. You will
                    hear back shortly.
                  </div>
                ) : null}
              </div>

              <form action={liveAction(sendConciergeMessage)} className="mt-5">
                <input
                  type="hidden"
                  name="reference"
                  value={booking.reference}
                />
                <label htmlFor="body" className="sr-only">
                  Your message
                </label>
                <textarea
                  id="body"
                  name="body"
                  rows={3}
                  required
                  placeholder="Ask about the route, the weather, what to pack, anything…"
                  className="input"
                />
                <div className="mt-3 flex items-center justify-between gap-4">
                  {!isConfigured() ? (
                    <p className="text-xs text-[var(--color-ink-muted)]">
                      Without an API key every message goes straight to the
                      human queue — the escalation path, which is the one that
                      matters, works either way.
                    </p>
                  ) : (
                    <span />
                  )}
                  <Button type="submit" disabled={IS_STATIC}>
                    Send
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* ----------------------------------------------- Right column */}
          <div className="min-w-0 space-y-6 lg:sticky lg:top-6">
            <PriceBreakdown quote={quote} />

            <Card className="p-6">
              <h2 className="font-[family-name:var(--font-display)] text-lg">
                Your trip
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Reference" value={booking.reference} />
                <Row
                  label="Dates"
                  value={formatDateRange(
                    booking.departure.startDate,
                    booking.departure.endDate,
                  )}
                />
                <Row
                  label="Boat"
                  value={`${trip.boat.name} — ${trip.boat.model}`}
                />
                <Row label="Operator" value={trip.boat.operator.name} />
                <Row label="Party" value={`${booking.berths}`} />
              </dl>

              <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--color-line)] pt-4 text-sm">
                <Link
                  href={`/trips/${trip.slug}`}
                  className="text-[var(--accent-strong)] hover:underline"
                >
                  Trip page
                </Link>
                <Link
                  href={`/destinations/${trip.destination.slug}`}
                  className="text-[var(--accent-strong)] hover:underline"
                >
                  {trip.destination.name} briefing
                </Link>
                <Link
                  href={`/operators/${trip.boat.operator.slug}`}
                  className="text-[var(--accent-strong)] hover:underline"
                >
                  Operator
                </Link>
              </div>
            </Card>

            {booking.notes || booking.experienceNote ? (
              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg">
                  What you told us
                </h2>
                {booking.experienceNote ? (
                  <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                    {booking.experienceNote}
                  </p>
                ) : null}
                {booking.notes ? (
                  <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                    {booking.notes}
                  </p>
                ) : null}
              </Card>
            ) : null}
          </div>
        </div>
      </Container>
    </Section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
