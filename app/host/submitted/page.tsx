import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Container, Eyebrow, Pill, Section } from "@/components/ui";
import { perRequest } from "@/lib/render-mode";
import { IS_STATIC } from "@/lib/static-mode";

export const metadata = { title: "Application received" };

/**
 * The extraction, shown back to the operator.
 *
 * Showing our working is the point. The operator sees what we understood and
 * exactly which documents are still outstanding, which removes the usual round
 * of email where they guess what we meant by "supporting documentation".
 */
export default async function SubmittedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await perRequest();
  // Nothing can submit in the static build, so there is no id to arrive with.
  // Rather than export a page that is permanently a 404, show the seeded
  // application — this screen exists to demonstrate the extraction, and it
  // demonstrates it just as well with a seeded one.
  const query = IS_STATIC ? {} : await searchParams;
  const id = typeof query.id === "string" ? query.id : undefined;
  if (!id && !IS_STATIC) notFound();

  const application = id
    ? await db.hostApplication.findUnique({ where: { id } })
    : await db.hostApplication.findFirst({ orderBy: { createdAt: "desc" } });
  if (!application) notFound();

  const gaps: string[] = JSON.parse(application.gapsJson);
  const extracted = JSON.parse(application.extractedJson) as {
    operator?: { name?: string; type?: string; homePort?: string };
    boat?: Record<string, unknown>;
    suggestedTrip?: Record<string, unknown>;
  };

  const hasExtraction = Boolean(extracted.boat);

  return (
    <Section>
      <Container>
        <Eyebrow>Application received</Eyebrow>
        <h1 className="mt-2 text-3xl">
          Thanks, {application.contactName.split(" ")[0]}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-[var(--color-ink-muted)]">
          {hasExtraction
            ? "Here is what we understood from what you sent, and what we still need. A person will check this against your original text before anything goes live."
            : "Your application is in our queue and a person will read it shortly."}
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="space-y-6">
            {hasExtraction ? (
              <Card className="p-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  What we understood
                </h2>

                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  {Object.entries(extracted.boat ?? {})
                    .filter(
                      ([, v]) =>
                        v !== null && v !== undefined && typeof v !== "object",
                    )
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                          {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                        </dt>
                        <dd className="mt-0.5 font-medium">{String(value)}</dd>
                      </div>
                    ))}
                </dl>

                {Array.isArray(extracted.boat?.amenities) &&
                (extracted.boat.amenities as string[]).length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(extracted.boat.amenities as string[]).map((a) => (
                      <Pill key={a}>{a}</Pill>
                    ))}
                  </div>
                ) : null}

                <p className="mt-5 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-ink-muted)]">
                  Anything wrong here? Reply to the confirmation email and we
                  will correct it — this is a draft for a human to check, not a
                  published listing.
                </p>
              </Card>
            ) : null}

            <Card className="p-6">
              <h2 className="font-[family-name:var(--font-display)] text-xl">
                What we still need
              </h2>
              {gaps.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {gaps.map((gap) => (
                    <li key={gap} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-caution)]" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
                  We will confirm what is outstanding once someone has read your
                  application.
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-5 lg:sticky lg:top-6">
            <Card className="p-6">
              <h2 className="font-[family-name:var(--font-display)] text-lg">
                Your submission
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">
                {application.rawSubmission}
              </p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-[var(--color-ink-muted)]">
                Reference{" "}
                <span className="font-medium text-[var(--color-ink)]">
                  {application.id.slice(-8).toUpperCase()}
                </span>
              </p>
              <Link
                href="/host"
                className="mt-3 inline-block text-sm text-[var(--accent-strong)] hover:underline"
              >
                Submit another boat →
              </Link>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
