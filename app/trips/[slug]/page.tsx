import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { buildCustomerQuote, referencePriceCents } from "@/lib/pricing/quote";
import { quoteKey, type TripPricing } from "@/lib/trip-pricing";
import type { CustomerQuote } from "@/lib/pricing/types";
import {
  LivePriceBreakdown,
  PricePanel,
  TripPricingProvider,
} from "@/components/trip-pricing";
import type { PriceComponentInput } from "@/lib/pricing/types";
import { OperatorCard } from "@/components/verification";
import {
  BOAT_LABEL,
  Card,
  Container,
  Eyebrow,
  FORMAT_LABEL,
  GradientHero,
  Pill,
  SKILL_LABEL,
  SKIPPER_LABEL,
  Section,
} from "@/components/ui";
import { perRequest } from "@/lib/render-mode";
import { IS_STATIC } from "@/lib/static-mode";

/**
 * Every sellable trip gets a prerendered page in the static build.
 *
 * Deliberately not gated on verification: an operator whose insurance lapses
 * drops out of *search*, but the trip page itself should still resolve rather
 * than 404, which is what `findTrips` already does for the server build.
 */
export async function generateStaticParams() {
  // Export only. The server build returns nothing here so every path renders
  // on demand — otherwise a yield run would reprice a departure and this page
  // would keep serving the price from whenever it was last built.
  if (!IS_STATIC) return [];
  const trips = await db.trip.findMany({ select: { slug: true } });
  return trips.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trip = await db.trip.findUnique({ where: { slug } });
  return { title: trip?.name ?? "Trip" };
}

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await perRequest();
  const { slug } = await params;
  // Static build reads departure and party size in the browser instead — see
  // components/trip-pricing.tsx, which switches between the quotes built below.
  const query = IS_STATIC ? {} : await searchParams;
  const now = new Date();

  const trip = await db.trip.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      format: true,
      skipper: true,
      skillLevel: true,
      durationDays: true,
      startPort: true,
      endPort: true,
      isCrewTrip: true,
      minAge: true,
      maxAge: true,
      heroFrom: true,
      heroTo: true,
      destination: {
        select: {
          slug: true,
          name: true,
          tagline: true,
          windPattern: true,
          localRules: true,
          region: { select: { name: true } },
          readinessTasks: {
            orderBy: [{ weeksBefore: "desc" }, { order: "asc" }],
            take: 4,
            select: { id: true, title: true, body: true, phase: true },
          },
        },
      },
      itinerary: { orderBy: { dayNumber: "asc" } },
      // Deliberately selecting every field here including visibility, then
      // filtering in buildCustomerQuote — the filter lives in one place so it
      // cannot be forgotten on a new surface.
      priceComponents: { orderBy: { order: "asc" } },
      boat: {
        select: {
          name: true,
          model: true,
          type: true,
          lengthM: true,
          cabins: true,
          berths: true,
          heads: true,
          builtYear: true,
          refitYear: true,
          amenities: true,
          operator: {
            select: {
              slug: true,
              name: true,
              type: true,
              homePort: true,
              about: true,
              status: true,
              licenceVerified: true,
              licenceRef: true,
              insuranceVerified: true,
              insuranceExpiresAt: true,
              safetyDeclarationAt: true,
              verifiedAt: true,
              responseTimeHours: true,
              ratingAvg: true,
              reviewCount: true,
            },
          },
        },
      },
      departures: {
        where: { startDate: { gte: now } },
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          berthsTotal: true,
          berthsBooked: true,
          sellPriceCents: true,
          priceHistory: {
            select: { sellPriceCents: true, effectiveFrom: true },
            orderBy: { effectiveFrom: "desc" },
            take: 20,
          },
          // netRateCents is never selected on a customer surface.
        },
      },
    },
  });

  if (!trip) notFound();

  const available = trip.departures.filter(
    (d) => d.berthsTotal - d.berthsBooked > 0,
  );

  if (available.length === 0) {
    return (
      <Section>
        <Container>
          <h1 className="text-3xl">{trip.name}</h1>
          <p className="mt-4 text-[var(--color-ink-muted)]">
            Every departure of this trip is sold out. Have a look at the rest of{" "}
            <Link
              href={`/destinations/${trip.destination.slug}`}
              className="text-[var(--accent-strong)] hover:underline"
            >
              {trip.destination.name}
            </Link>
            .
          </p>
        </Container>
      </Section>
    );
  }

  // The selected departure drives the whole page's pricing.
  const requested =
    typeof query.departure === "string" ? query.departure : undefined;
  const departure = available.find((d) => d.id === requested) ?? available[0];

  const requestedBerths = Number(query.berths);
  const maxBerths = departure.berthsTotal - departure.berthsBooked;
  const berths =
    Number.isFinite(requestedBerths) && requestedBerths >= 1
      ? Math.min(requestedBerths, maxBerths)
      : Math.min(
          trip.format === "WHOLE_BOAT" ? departure.berthsTotal : 2,
          maxBerths,
        );

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

  /** Which party sizes the chips offer for a given departure. */
  const partySizesFor = (d: (typeof available)[number]) => {
    const free = d.berthsTotal - d.berthsBooked;
    return Array.from({ length: free }, (_, i) => i + 1).filter(
      (n) => n >= 2 || free === 1,
    );
  };

  // Every price this page can show, precomputed. The browser switches between
  // them; it never works one out. See lib/trip-pricing.ts.
  const shown = available.slice(0, 12);
  const quotes: Record<string, CustomerQuote> = {};
  for (const d of shown) {
    for (const n of partySizesFor(d)) {
      quotes[quoteKey(d.id, n)] = buildCustomerQuote({
        sellPriceCents: d.sellPriceCents,
        components,
        berths: n,
      });
    }
  }

  const pricing: TripPricing = {
    slug: trip.slug,
    departures: shown.map((d) => ({
      id: d.id,
      startDate: d.startDate.toISOString(),
      endDate: d.endDate.toISOString(),
      berthsFree: d.berthsTotal - d.berthsBooked,
      partySizes: partySizesFor(d),
      // Only ever non-null when the price history genuinely supports the claim.
      referenceCents: referencePriceCents(
        d.priceHistory,
        d.sellPriceCents,
        now,
      ),
    })),
    quotes,
    defaultDepartureId: departure.id,
    defaultBerths: berths,
  };

  const amenities: string[] = JSON.parse(trip.boat.amenities);
  const totalMiles = trip.itinerary.reduce(
    (acc, d) => acc + d.nauticalMiles,
    0,
  );

  return (
    <div data-brand={trip.isCrewTrip ? "crew" : undefined}>
      <GradientHero
        from={trip.heroFrom}
        to={trip.heroTo}
        className="text-white"
      >
        <Container className="relative py-14 sm:py-20">
          <Link
            href={`/destinations/${trip.destination.slug}`}
            className="text-xs font-medium uppercase tracking-[0.14em] text-white/70 hover:text-white"
          >
            {trip.destination.region.name} · {trip.destination.name}
          </Link>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight">{trip.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{trip.summary}</p>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            {[
              SKILL_LABEL[trip.skillLevel],
              FORMAT_LABEL[trip.format],
              SKIPPER_LABEL[trip.skipper],
              `${trip.durationDays} days`,
              `${Math.round(totalMiles)} nm`,
            ].map((label) => (
              <span
                key={label}
                className="rounded-full bg-white/15 px-3 py-1 text-white"
              >
                {label}
              </span>
            ))}
          </div>
        </Container>
      </GradientHero>

      <Section className="!pt-10">
        <Container>
          {/*
            The breakdown and the panel sit in opposite columns, so the
            selection lives in a provider around the whole grid. Everything
            between them is still server-rendered and passes straight through.
          */}
          <TripPricingProvider pricing={pricing}>
            <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
              {/* --------------------------------------------- Left column */}
              <div className="min-w-0 space-y-12">
                {/* Itinerary */}
                <div>
                  <Eyebrow>Day by day</Eyebrow>
                  <h2 className="mt-2 text-2xl">
                    {trip.startPort} to {trip.endPort}
                  </h2>
                  <ol className="mt-6 space-y-5">
                    {trip.itinerary.map((day) => (
                      <li
                        key={day.id}
                        className="grid gap-3 border-b border-[var(--color-line)] pb-5 last:border-0 sm:grid-cols-[4rem_1fr]"
                      >
                        <div>
                          <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--accent-strong)]">
                            {String(day.dayNumber).padStart(2, "0")}
                          </p>
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            {day.nauticalMiles} nm
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">{day.title}</p>
                          <p className="text-xs text-[var(--color-ink-muted)]">
                            {day.fromPort} → {day.toPort}
                          </p>
                          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                            {day.description}
                          </p>
                          <p className="mt-2 text-sm text-[var(--accent-strong)]">
                            {day.highlight}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Price breakdown */}
                <div>
                  <Eyebrow>Transparent pricing</Eyebrow>
                  <h2 className="mt-2 text-2xl">
                    Everything you will pay, before you book
                  </h2>
                  <LivePriceBreakdown />
                </div>

                {/* The boat */}
                <div>
                  <Eyebrow>The boat</Eyebrow>
                  <h2 className="mt-2 text-2xl">
                    {trip.boat.name} — {trip.boat.model}
                  </h2>
                  <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ["Type", BOAT_LABEL[trip.boat.type]],
                      ["Length", `${trip.boat.lengthM} m`],
                      ["Cabins", String(trip.boat.cabins)],
                      ["Berths", String(trip.boat.berths)],
                      ["Heads", String(trip.boat.heads)],
                      ["Built", String(trip.boat.builtYear)],
                      ...(trip.boat.refitYear
                        ? ([["Refit", String(trip.boat.refitYear)]] as [
                            string,
                            string,
                          ][])
                        : []),
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                          {label}
                        </dt>
                        <dd className="mt-0.5 font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {amenities.map((a) => (
                      <Pill key={a}>{a}</Pill>
                    ))}
                  </div>
                </div>

                {/* Readiness preview */}
                <div>
                  <Eyebrow>Before you go</Eyebrow>
                  <h2 className="mt-2 text-2xl">
                    Your {trip.destination.name} preparation programme
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
                    Delivered in stages from booking through to the first
                    morning aboard. Here are the first few — the full programme
                    is on the{" "}
                    <Link
                      href={`/destinations/${trip.destination.slug}`}
                      className="text-[var(--accent-strong)] hover:underline"
                    >
                      destination page
                    </Link>
                    , published in full.
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {trip.destination.readinessTasks.map((task) => (
                      <Card key={task.id} className="p-5">
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
                          {task.body}
                        </p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* -------------------------------------------- Right column */}
              <div className="min-w-0 space-y-6 lg:sticky lg:top-6">
                <PricePanel
                  footer={
                    <p className="mt-2 text-center text-xs text-[var(--color-ink-muted)]">
                      No payment taken in this demo.
                    </p>
                  }
                />

                <OperatorCard operator={trip.boat.operator} />

                <Card className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                    What the wind does here
                  </p>
                  <p className="mt-2 line-clamp-6 text-sm text-[var(--color-ink-muted)]">
                    {trip.destination.windPattern}
                  </p>
                  <Link
                    href={`/destinations/${trip.destination.slug}`}
                    className="mt-3 inline-block text-sm text-[var(--accent-strong)] hover:underline"
                  >
                    Full {trip.destination.name} briefing →
                  </Link>
                </Card>
              </div>
            </div>
          </TripPricingProvider>
        </Container>
      </Section>
    </div>
  );
}
