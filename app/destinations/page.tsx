import Link from "next/link";
import { db } from "@/lib/db";
import {
  Container,
  Eyebrow,
  GradientHero,
  Pill,
  SKILL_LABEL,
  Section,
} from "@/components/ui";
import { perRequest } from "@/lib/render-mode";

export const metadata = { title: "Destinations" };

export default async function DestinationsPage() {
  await perRequest();
  const regions = await db.region.findMany({
    include: {
      destinations: {
        orderBy: { name: "asc" },
        include: { _count: { select: { trips: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Section className="border-b border-[var(--color-line)]">
        <Container>
          <Eyebrow>Destinations</Eyebrow>
          <h1 className="mt-2 max-w-2xl text-4xl">
            Six cruising grounds we know properly
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--color-ink-muted)]">
            Each of these has a briefing covering the wind that actually blows
            there, the months worth going, the permits you need and what the
            ground asks of you. It is the same material our preparation
            programmes are built from.
          </p>
        </Container>
      </Section>

      {regions.map((region) => (
        <Section key={region.id} className="!py-12">
          <Container>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl">{region.name}</h2>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {region.summary}
              </p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {region.destinations.map((destination) => (
                <Link
                  key={destination.id}
                  href={`/destinations/${destination.slug}`}
                  className="group grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] transition-shadow hover:shadow-[0_8px_30px_rgba(10,22,40,0.08)] sm:grid-cols-[10rem_1fr]"
                >
                  <GradientHero
                    from={destination.heroFrom}
                    to={destination.heroTo}
                    className="min-h-[7rem]"
                  />
                  <div className="p-5">
                    <p className="font-[family-name:var(--font-display)] text-xl">
                      {destination.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                      {destination.tagline}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Pill tone="accent">
                        {SKILL_LABEL[destination.skillLevel]}
                      </Pill>
                      <Pill>{destination._count.trips} trips</Pill>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      ))}
    </>
  );
}
