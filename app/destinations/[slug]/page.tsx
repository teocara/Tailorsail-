import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { findTrips } from "@/lib/trips";
import { TripGrid } from "@/components/trip-card";
import {
  ButtonLink,
  Card,
  Container,
  Eyebrow,
  GradientHero,
  Pill,
  SKILL_LABEL,
  Section,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = await db.destination.findUnique({ where: { slug } });
  return { title: destination?.name ?? "Destination" };
}

const PHASE_LABEL: Record<string, string> = {
  BOOK: "When you book",
  PREPARE: "In the weeks before",
  PACK: "Packing",
  ARRIVE: "On arrival",
};

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const destination = await db.destination.findUnique({
    where: { slug },
    include: {
      region: true,
      readinessTasks: { orderBy: [{ weeksBefore: "desc" }, { order: "asc" }] },
      courses: true,
    },
  });

  if (!destination) notFound();

  const trips = await findTrips({ destinationSlug: slug });

  // Group the readiness programme by phase, in the order it happens.
  const phases = ["BOOK", "PREPARE", "PACK", "ARRIVE"] as const;
  const byPhase = phases
    .map((phase) => ({
      phase,
      tasks: destination.readinessTasks.filter((t) => t.phase === phase),
    }))
    .filter((group) => group.tasks.length > 0);

  const briefing = [
    { label: "Wind and weather", body: destination.windPattern },
    { label: "Best months", body: destination.bestMonths },
    { label: "Sea state", body: destination.seaState },
    { label: "Nautical highlights", body: destination.nauticalHighlights },
    { label: "Marinas and berthing", body: destination.marinaNotes },
    { label: "Permits and local rules", body: destination.localRules },
    { label: "Getting there", body: destination.gettingThere },
  ];

  return (
    <>
      <GradientHero
        from={destination.heroFrom}
        to={destination.heroTo}
        className="text-white"
      >
        <Container className="relative py-16 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/70">
            {destination.region.name}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight sm:text-5xl">
            {destination.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            {destination.tagline}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm text-white">
              {SKILL_LABEL[destination.skillLevel]}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm text-white">
              {trips.length} {trips.length === 1 ? "trip" : "trips"}
            </span>
          </div>
        </Container>
      </GradientHero>

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div>
              <p className="text-lg leading-relaxed">{destination.summary}</p>

              <div className="mt-10 space-y-7">
                {briefing.map((item) => (
                  <div key={item.label}>
                    <h2 className="font-[family-name:var(--font-display)] text-xl">
                      {item.label}
                    </h2>
                    <p className="mt-2 text-[var(--color-ink-muted)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-6 lg:sticky lg:top-6">
              <Eyebrow>Preparation programme</Eyebrow>
              <p className="mt-2 font-[family-name:var(--font-display)] text-xl">
                {destination.readinessTasks.length} tasks, phased
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                Everyone who books this cruising ground gets this programme,
                delivered in stages from booking through to the first morning
                aboard. It is written for {destination.name} specifically — the
                permits, the wind, the things that catch people out here.
              </p>

              <ul className="mt-5 space-y-2 text-sm">
                {byPhase.map((group) => (
                  <li key={group.phase} className="flex justify-between gap-3">
                    <span>{PHASE_LABEL[group.phase]}</span>
                    <span className="text-[var(--color-ink-muted)]">
                      {group.tasks.length} tasks
                    </span>
                  </li>
                ))}
              </ul>

              {destination.courses.length > 0 ? (
                <div className="mt-5 border-t border-[var(--color-line)] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                    Course for this ground
                  </p>
                  {destination.courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      className="mt-2 block text-sm text-[var(--accent-strong)] hover:underline"
                    >
                      {course.name} →
                    </Link>
                  ))}
                </div>
              ) : null}

              <ButtonLink
                href={`/trips?destination=${destination.slug}`}
                className="mt-6 w-full"
              >
                See {trips.length} {trips.length === 1 ? "trip" : "trips"}
              </ButtonLink>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------ Readiness in full */}
      <Section className="bg-[var(--color-surface-sunk)]">
        <Container>
          <Eyebrow>What we send you before you go</Eyebrow>
          <h2 className="mt-2 text-3xl">The {destination.name} programme</h2>
          <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
            Published in full rather than kept behind the booking, because the
            point is to help people decide whether they can do this — not to
            withhold it until they have paid.
          </p>

          <div className="mt-8 space-y-8">
            {byPhase.map((group) => (
              <div key={group.phase}>
                <div className="flex items-baseline gap-3">
                  <h3 className="font-[family-name:var(--font-display)] text-xl">
                    {PHASE_LABEL[group.phase]}
                  </h3>
                  <Pill>{group.tasks.length}</Pill>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {group.tasks.map((task) => (
                    <Card key={task.id} className="p-5">
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
                        {task.body}
                      </p>
                      <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
                        {task.weeksBefore === 0
                          ? "On arrival"
                          : `About ${task.weeksBefore} week${task.weeksBefore === 1 ? "" : "s"} before`}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {trips.length > 0 ? (
        <Section>
          <Container>
            <h2 className="text-3xl">Trips in {destination.name}</h2>
            <div className="mt-8">
              <TripGrid trips={trips} />
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
