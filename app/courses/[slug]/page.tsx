import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { findTrips } from "@/lib/trips";
import { formatCents } from "@/lib/money";
import { TripGrid } from "@/components/trip-card";
import { COURSE_DETAIL_SELECT } from "@/lib/public-select";
import {
  ButtonLink,
  Card,
  Container,
  Eyebrow,
  Pill,
  Section,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await db.course.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: course?.name ?? "Course" };
}

const FORMAT_LABEL: Record<string, string> = {
  ONLINE: "Online, at your own pace",
  ONBOARD: "Aboard, during your charter week",
  HYBRID: "Online, then aboard",
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const course = await db.course.findUnique({
    where: { slug },
    select: COURSE_DETAIL_SELECT,
  });

  if (!course) notFound();

  const syllabus: string[] = JSON.parse(course.syllabus);

  // Courses tied to a cruising ground show that ground's trips; general ones
  // show trips at the matching skill level.
  const related = course.destination
    ? await findTrips({ destinationSlug: course.destination.slug, limit: 3 })
    : await findTrips({
        skillLevel: course.level === "SKIPPER" ? "SKIPPER" : "FIRST_TIMER",
        limit: 3,
      });

  return (
    <>
      <Section className="border-b border-[var(--color-line)]">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div>
              <Eyebrow>Course</Eyebrow>
              <h1 className="mt-2 text-4xl leading-tight">{course.name}</h1>
              <p className="mt-4 text-lg text-[var(--color-ink-muted)]">
                {course.summary}
              </p>

              <div className="mt-6 flex flex-wrap gap-1.5">
                <Pill tone={course.priceCents === 0 ? "positive" : "neutral"}>
                  {course.priceCents === 0
                    ? "Free"
                    : formatCents(course.priceCents)}
                </Pill>
                <Pill>{course.durationHours} hours</Pill>
                <Pill>{FORMAT_LABEL[course.format]}</Pill>
                {course.certification ? (
                  <Pill tone="accent">{course.certification}</Pill>
                ) : null}
              </div>

              <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl">
                What it covers
              </h2>
              <ul className="mt-4 space-y-2.5">
                {syllabus.map((item) => (
                  <li key={item} className="flex gap-3 text-[var(--color-ink-muted)]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-strong)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="p-6 lg:sticky lg:top-6">
              <p className="font-[family-name:var(--font-display)] text-3xl">
                {course.priceCents === 0 ? "Free" : formatCents(course.priceCents)}
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                {FORMAT_LABEL[course.format]}
              </p>

              {course.format === "ONBOARD" ? (
                <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
                  Taken during a charter week you have already booked. Add it
                  when you book the trip — the route does not change, the
                  instruction is folded into the sailing you were doing anyway.
                </p>
              ) : (
                <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
                  Take it whenever you like before you sail. Most people do it
                  in the fortnight before departure, when it is freshest.
                </p>
              )}

              {course.destination ? (
                <div className="mt-5 border-t border-[var(--color-line)] pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                    Written for
                  </p>
                  <Link
                    href={`/destinations/${course.destination.slug}`}
                    className="mt-1 block text-sm text-[var(--accent-strong)] hover:underline"
                  >
                    {course.destination.name} →
                  </Link>
                </div>
              ) : null}

              <ButtonLink href="/trips" className="mt-6 w-full">
                Find a trip to take it on
              </ButtonLink>
            </Card>
          </div>
        </Container>
      </Section>

      {related.length > 0 ? (
        <Section>
          <Container>
            <h2 className="text-2xl">
              {course.destination
                ? `Trips in ${course.destination.name}`
                : "Trips this suits"}
            </h2>
            <div className="mt-6">
              <TripGrid trips={related} />
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
