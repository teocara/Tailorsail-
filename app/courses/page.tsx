import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { Card, Container, Eyebrow, Pill, Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courses" };

const LEVEL_LABEL: Record<string, string> = {
  FIRST_TIMER: "Start here",
  THEORY: "Theory",
  COMPETENT_CREW: "Competent Crew",
  SKIPPER: "Skipper",
};

const FORMAT_LABEL: Record<string, string> = {
  ONLINE: "Online",
  ONBOARD: "Aboard, during your trip",
  HYBRID: "Online + aboard",
};

const ORDER = ["FIRST_TIMER", "THEORY", "COMPETENT_CREW", "SKIPPER"] as const;

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    include: { destination: { select: { slug: true, name: true } } },
    orderBy: { durationHours: "asc" },
  });

  const grouped = ORDER.map((level) => ({
    level,
    courses: courses.filter((c) => c.level === level),
  })).filter((g) => g.courses.length > 0);

  return (
    <>
      <Section className="border-b border-[var(--color-line)]">
        <Container>
          <Eyebrow>Learn</Eyebrow>
          <h1 className="mt-2 max-w-3xl text-4xl">
            The reason most people never try sailing is that nobody told them
            what it involves
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--color-ink-muted)]">
            So we tell you first, and the introduction is free. If you want to
            come home able to sail the boat yourself, you can take a certificate
            during the week you already booked — same trip, same route, you just
            leave qualified.
          </p>
        </Container>
      </Section>

      {grouped.map((group) => (
        <Section key={group.level} className="!py-10">
          <Container>
            <h2 className="text-2xl">{LEVEL_LABEL[group.level]}</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {group.courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group flex flex-col rounded-[var(--radius-card)] border border-[var(--color-line)] p-6 transition-colors hover:border-[var(--accent-strong)]"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={course.priceCents === 0 ? "positive" : "neutral"}>
                      {course.priceCents === 0
                        ? "Free"
                        : formatCents(course.priceCents)}
                    </Pill>
                    <Pill>{course.durationHours}h</Pill>
                    {course.destination ? (
                      <Pill tone="accent">{course.destination.name}</Pill>
                    ) : null}
                  </div>

                  <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg leading-snug">
                    {course.name}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-[var(--color-ink-muted)]">
                    {course.summary}
                  </p>

                  <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
                    {FORMAT_LABEL[course.format]}
                    {course.certification ? ` · ${course.certification}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      ))}
    </>
  );
}
