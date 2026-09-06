import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { buildCustomerQuote } from "@/lib/pricing/quote";
import type { PriceComponentInput } from "@/lib/pricing/types";
import { formatCents } from "@/lib/money";
import { createBooking } from "@/app/actions/booking";
import { PriceBreakdown } from "@/components/price-breakdown";
import {
  ADDON_PUBLIC_SELECT,
  DEPARTURE_PUBLIC_SELECT,
} from "@/lib/public-select";
import {
  Button,
  Card,
  Container,
  Eyebrow,
  Section,
  formatDateRange,
} from "@/components/ui";
import { perRequest } from "@/lib/render-mode";
import { IS_STATIC, liveAction } from "@/lib/static-mode";

export const metadata = { title: "Request a departure" };

/** Same set as the trip pages — every trip's booking form is reachable. */
export async function generateStaticParams() {
  // Export only. The server build returns nothing here so every path renders
  // on demand — otherwise a yield run would reprice a departure and this page
  // would keep serving the price from whenever it was last built.
  if (!IS_STATIC) return [];
  const trips = await db.trip.findMany({ select: { slug: true } });
  return trips.map((t) => ({ slug: t.slug }));
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await perRequest();
  const { slug } = await params;
  const query = IS_STATIC ? {} : await searchParams;

  const trip = await db.trip.findUnique({
    where: { slug },
    include: {
      priceComponents: { orderBy: { order: "asc" } },
      destination: { select: { name: true, slug: true } },
      boat: { select: { name: true, model: true, berths: true } },
    },
  });

  if (!trip) notFound();

  const departureId =
    typeof query.departure === "string" ? query.departure : undefined;

  // Falling back to "the soonest departure" is not enough — the soonest one is
  // frequently sold out, which would render a booking form for zero berths.
  // Fall back to the soonest departure that actually has space.
  const candidates = await db.departure.findMany({
    where: { tripId: trip.id, startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    select: DEPARTURE_PUBLIC_SELECT,
  });

  const withSpace = candidates.filter(
    (d) => d.berthsTotal - d.berthsBooked > 0,
  );

  const departure =
    (departureId ? candidates.find((d) => d.id === departureId) : undefined) ??
    withSpace[0];

  if (!departure) notFound();

  const free = departure.berthsTotal - departure.berthsBooked;

  if (free < 1) {
    return (
      <Section>
        <Container>
          <h1 className="text-3xl">{trip.name}</h1>
          <p className="mt-4 max-w-xl text-[var(--color-ink-muted)]">
            That departure has just sold out.{" "}
            <Link
              href={`/trips/${trip.slug}`}
              className="text-[var(--accent-strong)] hover:underline"
            >
              Pick another date
            </Link>
            .
          </p>
        </Container>
      </Section>
    );
  }
  const requested = Number(query.berths);
  const berths =
    Number.isFinite(requested) && requested >= 1
      ? Math.min(requested, free)
      : Math.min(2, free);

  const [addOns, user] = await Promise.all([
    db.addOn.findMany({
      where: { OR: [{ global: true }, { tripId: trip.id }] },
      orderBy: [{ category: "asc" }, { sellPriceCents: "asc" }],
      select: ADDON_PUBLIC_SELECT,
    }),
    getCurrentUser(),
  ]);

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

  const quote = buildCustomerQuote({
    sellPriceCents: departure.sellPriceCents,
    components,
    berths,
  });

  return (
    <Section>
      <Container>
        <Link
          href={`/trips/${trip.slug}?departure=${departure.id}&berths=${berths}`}
          className="text-sm text-[var(--color-ink-muted)] hover:text-navy-900"
        >
          ← Back to {trip.name}
        </Link>

        <Eyebrow>Request a departure</Eyebrow>
        <h1 className="mt-2 text-3xl">{trip.name}</h1>
        <p className="mt-1 text-[var(--color-ink-muted)]">
          {trip.destination.name} ·{" "}
          {formatDateRange(departure.startDate, departure.endDate)} ·{" "}
          {trip.boat.name}
        </p>

        <form action={liveAction(createBooking)} className="mt-8">
          <input type="hidden" name="departureId" value={departure.id} />

          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <div className="min-w-0 space-y-8">
              {/* Party size */}
              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  How many of you?
                </h2>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {free} of {departure.berthsTotal} berths still free.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from({ length: free }, (_, i) => i + 1).map((n) => (
                    <label key={n} className="cursor-pointer">
                      <input
                        type="radio"
                        name="berths"
                        value={n}
                        defaultChecked={n === berths}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] text-sm transition-colors peer-checked:border-[var(--accent-strong)] peer-checked:bg-[var(--accent-soft)] peer-checked:text-[var(--accent-strong)]">
                        {n}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                  Changing this after you submit is fine — we confirm everything
                  with you before anything is charged.
                </p>
              </Card>

              {/* Add-ons */}
              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  Anything else?
                </h2>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  All optional. Each one is priced in full — nothing here has a
                  fee attached later.
                </p>

                <div className="mt-5 space-y-3">
                  {addOns.map((addOn) => (
                    <label
                      key={addOn.id}
                      className="flex cursor-pointer gap-3 rounded-[var(--radius-card)] border border-[var(--color-line)] p-4 transition-colors has-[:checked]:border-[var(--accent-strong)] has-[:checked]:bg-[var(--accent-soft)]"
                    >
                      <input
                        type="checkbox"
                        name="addOnIds"
                        value={addOn.id}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent-strong)]"
                      />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium">{addOn.name}</span>
                          <span className="text-sm tabular-nums">
                            {formatCents(addOn.sellPriceCents)}
                            {addOn.perPerson ? (
                              <span className="text-xs text-[var(--color-ink-muted)]">
                                {" "}
                                per person
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-[var(--color-ink-muted)]">
                          {addOn.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Who's coming */}
              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  Who should we talk to?
                </h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Your name" htmlFor="name">
                    <input
                      id="name"
                      name="name"
                      required
                      defaultValue={user?.name ?? ""}
                      className="input"
                    />
                  </Field>
                  <Field label="Email" htmlFor="email">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      defaultValue={user?.email ?? ""}
                      className="input"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field
                    label="How much sailing has your group done?"
                    htmlFor="experienceNote"
                    hint="Be honest — it changes which skipper we put with you and how the first day runs. 'None of us have ever been on a boat' is a completely normal answer."
                  >
                    <textarea
                      id="experienceNote"
                      name="experienceNote"
                      rows={3}
                      className="input"
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <Field
                    label="Anything we should know?"
                    htmlFor="notes"
                    hint="Dietary requirements, seasickness, someone joining a day late, a birthday. All useful."
                  >
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      className="input"
                    />
                  </Field>
                </div>
              </Card>
            </div>

            {/* Summary */}
            <div className="min-w-0 space-y-5 lg:sticky lg:top-6">
              <PriceBreakdown quote={quote} />

              <Card className="p-6">
                <p className="text-sm text-[var(--color-ink-muted)]">
                  The total above is for {berths}{" "}
                  {berths === 1 ? "person" : "people"} without extras. Anything
                  you tick is added to your confirmation.
                </p>
                <Button
                  type="submit"
                  disabled={IS_STATIC}
                  className="mt-4 w-full"
                >
                  Send booking request
                </Button>
                <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                  This is a demo — no payment is taken and no card details are
                  requested. You will get a booking reference and a preparation
                  checklist.
                </p>
              </Card>
            </div>
          </div>
        </form>
      </Container>
    </Section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
