import Link from "next/link";
import { db } from "@/lib/db";
import { findTrips } from "@/lib/trips";
import { TripGrid } from "@/components/trip-card";
import { SearchBox } from "@/components/search-box";
import { COURSE_CARD_SELECT } from "@/lib/public-select";
import {
  ButtonLink,
  Card,
  Container,
  Eyebrow,
  GradientHero,
  Section,
} from "@/components/ui";
import { CatamaranHero } from "@/components/catamaran-hero";
import { Reveal } from "@/components/reveal";
import { perRequest } from "@/lib/render-mode";

const PILLARS = [
  {
    title: "We teach you before we sell you anything",
    body: "Every trip comes with a preparation programme written for the water you are actually sailing — the wind that turns up in the afternoon, the permit you need, the thing that catches people out. Plus courses, from an hour online to a certificate you earn during the week.",
    link: { href: "/courses", label: "See the courses" },
  },
  {
    title: "One price, and it is the whole price",
    body: "The number you see includes the extras the marina collects on arrival: tourist tax, end cleaning, fuel, everything. We itemise it before you book. Nothing appears at the dock that was not on the page.",
    link: { href: "/trips", label: "Browse trips" },
  },
  {
    title: "Operators we have actually checked",
    body: "Licence, insurance with an expiry date, safety equipment declaration. We re-check as they lapse, and a boat drops out of search automatically the day cover expires. We will tell you exactly what we verified — and what we did not.",
    link: { href: "/trips", label: "How verification works" },
  },
];

export default async function HomePage() {
  await perRequest();
  const [destinations, featured, crew, courses] = await Promise.all([
    db.destination.findMany({
      include: { region: true, _count: { select: { trips: true } } },
      orderBy: { name: "asc" },
    }),
    findTrips({ excludeCrew: true, sort: "recommended", limit: 6 }),
    findTrips({ crewOnly: true, limit: 3 }),
    db.course.findMany({
      select: COURSE_CARD_SELECT,
      orderBy: { priceCents: "asc" },
      take: 3,
    }),
  ]);

  return (
    <>
      {/* ------------------------------------------------------------- Hero */}
      <GradientHero from="#0a1628" to="#2f8f8a" className="text-white">
        {/*
          Positioned absolute, after GradientHero's own gradient layers and
          before Container in DOM order — positioned siblings paint in DOM
          order within a stacking context, so the boat sits above the
          gradient and Container (also `relative`) still paints on top of it,
          keeping the text and search box readable and clickable.
        */}
        <CatamaranHero />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/70">
              Italy · Ibiza · Croatia
            </p>
            <h1 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">
              Sailing holidays for people who have never sailed
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              We buy the boats, check the operators, plan the week around the
              wind that actually blows there, and teach you what you need before
              you go. One price, no surprises at the dock.
            </p>
          </div>

          <div className="mt-9 max-w-3xl">
            <SearchBox />
          </div>
        </Container>
      </GradientHero>

      {/* ---------------------------------------------------------- Pillars */}
      <Section>
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delayMs={i * 90}>
                <Card className="flex h-full flex-col p-6 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(10,22,40,0.1)]">
                  <h2 className="font-[family-name:var(--font-display)] text-xl leading-snug">
                    {pillar.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm text-[var(--color-ink-muted)]">
                    {pillar.body}
                  </p>
                  <Link
                    href={pillar.link.href}
                    className="mt-4 text-sm text-[var(--accent-strong)] hover:underline"
                  >
                    {pillar.link.label} →
                  </Link>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* ----------------------------------------------------- Destinations */}
      <Section className="bg-[var(--color-surface-sunk)]">
        <Container>
          <Reveal>
            <Eyebrow>Where we sail</Eyebrow>
            <h2 className="mt-2 text-3xl">Six cruising grounds</h2>
            <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
              We sell a small number of places and know them properly, rather
              than a long list we have read about. Each one has a briefing
              covering the wind, the season, the permits and what it asks of
              you.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((destination, i) => (
              <Reveal key={destination.id} delayMs={(i % 3) * 90}>
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(10,22,40,0.1)]"
                >
                  <GradientHero
                    from={destination.heroFrom}
                    to={destination.heroTo}
                    className="h-28 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                      {destination.region.name}
                    </p>
                    <p className="font-[family-name:var(--font-display)] text-lg">
                      {destination.name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-ink-muted)]">
                      {destination.tagline}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* --------------------------------------------------------- Featured */}
      <Section>
        <Container>
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Eyebrow>Available now</Eyebrow>
                <h2 className="mt-2 text-3xl">Trips we would book ourselves</h2>
              </div>
              <ButtonLink href="/trips" variant="secondary">
                All trips
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delayMs={120} className="mt-8">
            <TripGrid trips={featured} />
          </Reveal>
        </Container>
      </Section>

      {/* ------------------------------------------------------------- Crew */}
      {crew.length > 0 ? (
        <div data-brand="crew">
          <Section className="bg-[#fff8f4]">
            <Container>
              <Reveal>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="max-w-2xl">
                    <Eyebrow>Tailorsail Crew</Eyebrow>
                    <h2 className="mt-2 text-3xl">
                      For people in their twenties who would rather not book a
                      hotel
                    </h2>
                    <p className="mt-3 text-[var(--color-ink-muted)]">
                      A cabin each, a boat full of people you have not met
                      yet, and the best anchorages in Ibiza and Hvar. Most of
                      the boat books solo — that is the normal way to do
                      this, not the brave one.
                    </p>
                  </div>
                  <ButtonLink href="/crew">Explore Crew</ButtonLink>
                </div>
              </Reveal>

              <Reveal delayMs={120} className="mt-8">
                <TripGrid trips={crew} />
              </Reveal>
            </Container>
          </Section>
        </div>
      ) : null}

      {/* ---------------------------------------------------------- Courses */}
      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <Reveal>
              <div>
                <Eyebrow>Learn first</Eyebrow>
                <h2 className="mt-2 text-3xl">
                  The reason most people never try sailing is that nobody
                  told them what it involves
                </h2>
                <p className="mt-4 text-[var(--color-ink-muted)]">
                  So we tell you first. Our introduction course is free and
                  takes two hours. If you want to come home able to sail the
                  boat yourself, you can take a certificate during the week
                  without changing the trip you booked.
                </p>
                <ButtonLink href="/courses" className="mt-6">
                  See all courses
                </ButtonLink>
              </div>
            </Reveal>

            <div className="space-y-4">
              {courses.map((course, i) => (
                <Reveal key={course.id} delayMs={i * 90}>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="block rounded-[var(--radius-card)] border border-[var(--color-line)] p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-strong)] hover:shadow-[0_10px_30px_rgba(10,22,40,0.08)]"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-[family-name:var(--font-display)] text-lg">
                        {course.name}
                      </p>
                      <p className="text-sm text-[var(--color-ink-muted)]">
                        {course.priceCents === 0
                          ? "Free"
                          : `€${course.priceCents / 100}`}{" "}
                        · {course.durationHours}h
                      </p>
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
                      {course.summary}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* ----------------------------------------------------- How it works */}
      <Section className="bg-[var(--color-surface-sunk)]">
        <Container>
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-2 text-3xl">Four steps, no phone calls</h2>
          </Reveal>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Tell us what you want",
                body: "In a sentence. Where, when, who with, and how much sailing you actually want to do.",
              },
              {
                step: "02",
                title: "Book at one price",
                body: "Everything itemised before you commit, including what the marina takes on arrival.",
              },
              {
                step: "03",
                title: "Get ready properly",
                body: "Your preparation programme arrives phased across the weeks before you go, written for that cruising ground.",
              },
              {
                step: "04",
                title: "Ask us anything",
                body: "One thread for the whole trip. We answer, and we chase the marina so you do not have to.",
              },
            ].map((item, i) => (
              <li key={item.step}>
                <Reveal delayMs={i * 90}>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--accent-strong)]">
                    {item.step}
                  </p>
                  <p className="mt-2 font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                    {item.body}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </Section>
    </>
  );
}
