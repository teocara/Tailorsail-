import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { findTrips } from "@/lib/trips";
import { verificationHeadline } from "@/lib/verification";
import { VerificationBadges } from "@/components/verification";
import { TripGrid } from "@/components/trip-card";
import {
  BOAT_LABEL,
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
  const operator = await db.operator.findUnique({ where: { slug } });
  return { title: operator?.name ?? "Operator" };
}

export default async function OperatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const operator = await db.operator.findUnique({
    where: { slug },
    select: {
      // Commercial terms — tier, discount, allotment, payment terms — are
      // deliberately not selected. They are ours, not the customer's.
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
      boats: {
        select: {
          id: true,
          name: true,
          model: true,
          type: true,
          lengthM: true,
          cabins: true,
          berths: true,
          builtYear: true,
          refitYear: true,
        },
        orderBy: { name: "asc" },
      },
      reviews: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });

  if (!operator) notFound();

  // Reuses the one search path, so an operator whose cover lapsed shows no
  // trips here for exactly the same reason they show none anywhere else.
  const allTrips = await findTrips({});
  const trips = allTrips.filter((t) => t.operator.slug === operator.slug);

  return (
    <>
      <Section className="border-b border-[var(--color-line)]">
        <Container>
          <Eyebrow>
            {operator.type === "PRIVATE_OWNER"
              ? "Private owner"
              : "Charter operator"}
          </Eyebrow>
          <h1 className="mt-2 text-4xl">{operator.name}</h1>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            {operator.homePort}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Pill
              tone={
                operator.status === "VERIFIED"
                  ? "positive"
                  : operator.status === "PENDING"
                    ? "caution"
                    : "critical"
              }
            >
              {verificationHeadline(operator)}
            </Pill>
            {operator.reviewCount > 0 ? (
              <Pill>
                {operator.ratingAvg.toFixed(1)} from {operator.reviewCount} trips
              </Pill>
            ) : null}
          </div>

          <p className="mt-6 max-w-2xl text-lg text-[var(--color-ink-muted)]">
            {operator.about}
          </p>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start">
            <Card className="p-6">
              <h2 className="font-[family-name:var(--font-display)] text-xl">
                What we verified
              </h2>
              <div className="mt-4">
                <VerificationBadges operator={operator} />
              </div>
              <p className="mt-5 border-t border-[var(--color-line)] pt-4 text-xs text-[var(--color-ink-muted)]">
                We check documents — charter licence, insurance certificate with
                an expiry date, and a safety equipment declaration — and we
                re-check them as they approach expiry. We do not physically
                inspect boats. If cover lapses, this operator&rsquo;s trips drop
                out of our search automatically rather than waiting for someone
                to notice.
              </p>
            </Card>

            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl">
                The fleet
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {operator.boats.map((boat) => (
                  <Card key={boat.id} className="p-5">
                    <p className="font-medium">{boat.name}</p>
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      {boat.model}
                    </p>
                    <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                      {BOAT_LABEL[boat.type]} · {boat.lengthM}m · {boat.cabins}{" "}
                      cabins · sleeps {boat.berths}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                      Built {boat.builtYear}
                      {boat.refitYear ? `, refit ${boat.refitYear}` : ""}
                    </p>
                  </Card>
                ))}
              </div>

              {operator.reviews.length > 0 ? (
                <>
                  <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl">
                    What travellers said
                  </h2>
                  <div className="mt-4 space-y-4">
                    {operator.reviews.map((review) => (
                      <Card key={review.id} className="p-5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="font-medium">{review.authorName}</p>
                          <p className="text-sm text-[var(--accent-strong)]">
                            {"★".repeat(review.rating)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                          {review.body}
                        </p>
                      </Card>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </Container>
      </Section>

      {trips.length > 0 ? (
        <Section className="bg-[var(--color-surface-sunk)]">
          <Container>
            <h2 className="text-2xl">Trips with {operator.name}</h2>
            <div className="mt-6">
              <TripGrid trips={trips} />
            </div>
          </Container>
        </Section>
      ) : (
        <Section className="bg-[var(--color-surface-sunk)]">
          <Container>
            <Card className="p-8">
              <p className="font-[family-name:var(--font-display)] text-xl">
                No trips available with this operator right now
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                {operator.status !== "VERIFIED"
                  ? "Their verification is still in progress, so their boats are not yet bookable through us."
                  : "Every departure is either sold out or outside our booking window."}{" "}
                <Link href="/trips" className="text-[var(--accent-strong)] hover:underline">
                  Browse everything else
                </Link>
                .
              </p>
            </Card>
          </Container>
        </Section>
      )}
    </>
  );
}
