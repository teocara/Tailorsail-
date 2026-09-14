/**
 * Trust badges, derived from operator data rather than authored.
 *
 * The point of deriving them is that displayed trust cannot drift from
 * reality: nobody can set a "verified" flag in a CMS and leave it set after
 * the insurance lapses. Expiry downgrades the badge automatically, and the
 * copy states what was actually checked.
 *
 * What we do NOT claim anywhere: that we have physically inspected the boat.
 * Two people and an AI cannot survey hulls in six cruising grounds, and
 * implying otherwise would be the one dishonest thing in a product whose whole
 * pitch is trust. Document verification is real and useful; we say that and
 * only that.
 */

export type BadgeTone = "positive" | "caution" | "critical" | "neutral";

export interface VerificationBadge {
  id: string;
  label: string;
  detail: string;
  tone: BadgeTone;
}

export interface OperatorVerificationInput {
  status: "PENDING" | "VERIFIED" | "SUSPENDED";
  licenceVerified: boolean;
  licenceRef?: string | null;
  insuranceVerified: boolean;
  insuranceExpiresAt?: Date | null;
  safetyDeclarationAt?: Date | null;
  verifiedAt?: Date | null;
  responseTimeHours: number;
  ratingAvg: number;
  reviewCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * Insurance state is three-valued, not boolean: valid, expiring soon (still
 * covered but we should chase it), and lapsed. The middle state is what feeds
 * the EXPIRING_DOCUMENT ops task.
 */
export function insuranceState(
  input: OperatorVerificationInput,
  now: Date = new Date(),
): "VALID" | "EXPIRING" | "LAPSED" | "UNVERIFIED" {
  if (!input.insuranceVerified || !input.insuranceExpiresAt) return "UNVERIFIED";

  const daysLeft = daysBetween(now, input.insuranceExpiresAt);
  if (daysLeft < 0) return "LAPSED";
  if (daysLeft <= 30) return "EXPIRING";
  return "VALID";
}

export function verificationBadges(
  input: OperatorVerificationInput,
  now: Date = new Date(),
): VerificationBadge[] {
  const badges: VerificationBadge[] = [];

  if (input.status === "SUSPENDED") {
    return [
      {
        id: "suspended",
        label: "Suspended",
        detail: "This operator is not currently taking Tailorsail bookings.",
        tone: "critical",
      },
    ];
  }

  // --- Licence
  if (input.licenceVerified) {
    badges.push({
      id: "licence",
      label: "Charter licence checked",
      detail: input.licenceRef
        ? `Licence ${input.licenceRef} seen and recorded.`
        : "Charter licence document seen and recorded.",
      tone: "positive",
    });
  } else {
    badges.push({
      id: "licence",
      label: "Licence not yet checked",
      detail: "We have not yet seen this operator's charter licence.",
      tone: "caution",
    });
  }

  // --- Insurance
  const insurance = insuranceState(input, now);
  const expiry = input.insuranceExpiresAt;

  if (insurance === "VALID" && expiry) {
    badges.push({
      id: "insurance",
      label: "Insurance valid",
      detail: `Third-party and hull cover verified to ${formatDate(expiry)}.`,
      tone: "positive",
    });
  } else if (insurance === "EXPIRING" && expiry) {
    badges.push({
      id: "insurance",
      label: "Insurance expiring",
      detail: `Cover on file expires ${formatDate(expiry)} — renewal requested.`,
      tone: "caution",
    });
  } else if (insurance === "LAPSED" && expiry) {
    badges.push({
      id: "insurance",
      label: "Insurance lapsed",
      detail: `Cover on file expired ${formatDate(expiry)}. Bookings paused pending renewal.`,
      tone: "critical",
    });
  } else {
    badges.push({
      id: "insurance",
      label: "Insurance not yet checked",
      detail: "No current insurance certificate on file.",
      tone: "caution",
    });
  }

  // --- Safety equipment declaration
  if (input.safetyDeclarationAt) {
    const age = daysBetween(input.safetyDeclarationAt, now);
    const stale = age > 365;
    badges.push({
      id: "safety",
      label: stale ? "Safety declaration due" : "Safety equipment declared",
      detail: stale
        ? `Operator's declaration dates from ${formatDate(input.safetyDeclarationAt)} and is due for renewal.`
        : `Operator declared full safety inventory on ${formatDate(input.safetyDeclarationAt)}.`,
      tone: stale ? "caution" : "positive",
    });
  } else {
    badges.push({
      id: "safety",
      label: "Safety declaration outstanding",
      detail: "Operator has not yet filed a safety equipment declaration.",
      tone: "caution",
    });
  }

  // --- Service signals
  if (input.reviewCount >= 3) {
    badges.push({
      id: "rating",
      label: `${input.ratingAvg.toFixed(1)} from ${input.reviewCount} trips`,
      detail: "Average rating from travellers who sailed with this operator.",
      tone: input.ratingAvg >= 4.3 ? "positive" : "neutral",
    });
  }

  if (input.responseTimeHours <= 6) {
    badges.push({
      id: "response",
      label: "Replies within hours",
      detail: `Median reply time ${Math.round(input.responseTimeHours)}h across recent bookings.`,
      tone: "positive",
    });
  } else if (input.responseTimeHours > 48) {
    badges.push({
      id: "response",
      label: "Slow to reply",
      detail: `Median reply time ${Math.round(input.responseTimeHours)}h — we chase on your behalf.`,
      tone: "caution",
    });
  }

  return badges;
}

/**
 * Whether an operator is currently sellable. Lapsed insurance pulls inventory
 * automatically — this is checked at query time, not left to someone
 * remembering to suspend the account.
 */
export function isBookable(
  input: OperatorVerificationInput,
  now: Date = new Date(),
): boolean {
  if (input.status !== "VERIFIED") return false;
  return insuranceState(input, now) !== "LAPSED";
}

/** One-line summary used on trip cards where a full badge list won't fit. */
export function verificationHeadline(
  input: OperatorVerificationInput,
  now: Date = new Date(),
): string {
  if (input.status === "SUSPENDED") return "Not currently bookable";
  if (input.status === "PENDING") return "Verification in progress";
  const insurance = insuranceState(input, now);
  if (insurance === "LAPSED") return "Bookings paused — insurance lapsed";
  if (insurance === "EXPIRING") return "Verified · insurance renewal due";
  return "Licence and insurance verified";
}
