import { describe, expect, it } from "vitest";
import {
  insuranceState,
  isBookable,
  verificationBadges,
  verificationHeadline,
  type OperatorVerificationInput,
} from "@/lib/verification";

const NOW = new Date("2026-07-01T00:00:00Z");
const daysFromNow = (n: number) =>
  new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

const operator = (
  over: Partial<OperatorVerificationInput> = {},
): OperatorVerificationInput => ({
  status: "VERIFIED",
  licenceVerified: true,
  licenceRef: "HR-CH-4471",
  insuranceVerified: true,
  insuranceExpiresAt: daysFromNow(200),
  safetyDeclarationAt: daysFromNow(-60),
  verifiedAt: daysFromNow(-90),
  responseTimeHours: 4,
  ratingAvg: 4.7,
  reviewCount: 22,
  ...over,
});

const badge = (input: OperatorVerificationInput, id: string) =>
  verificationBadges(input, NOW).find((b) => b.id === id);

describe("insuranceState", () => {
  it("is VALID well before expiry", () => {
    expect(insuranceState(operator(), NOW)).toBe("VALID");
  });

  it("is EXPIRING inside the 30-day window", () => {
    expect(
      insuranceState(operator({ insuranceExpiresAt: daysFromNow(14) }), NOW),
    ).toBe("EXPIRING");
  });

  it("is LAPSED after expiry", () => {
    expect(
      insuranceState(operator({ insuranceExpiresAt: daysFromNow(-1) }), NOW),
    ).toBe("LAPSED");
  });

  it("is UNVERIFIED with no certificate on file", () => {
    expect(
      insuranceState(
        operator({ insuranceVerified: false, insuranceExpiresAt: null }),
        NOW,
      ),
    ).toBe("UNVERIFIED");
  });
});

describe("verificationBadges", () => {
  it("shows positive licence and insurance badges for a good operator", () => {
    expect(badge(operator(), "licence")?.tone).toBe("positive");
    expect(badge(operator(), "insurance")?.tone).toBe("positive");
    expect(badge(operator(), "insurance")?.detail).toContain("verified to");
  });

  it("downgrades the insurance badge automatically as expiry approaches", () => {
    const soon = operator({ insuranceExpiresAt: daysFromNow(10) });
    expect(badge(soon, "insurance")?.tone).toBe("caution");
    expect(badge(soon, "insurance")?.label).toBe("Insurance expiring");
  });

  it("marks lapsed insurance critical without anyone touching the record", () => {
    const lapsed = operator({ insuranceExpiresAt: daysFromNow(-5) });
    expect(badge(lapsed, "insurance")?.tone).toBe("critical");
    expect(badge(lapsed, "insurance")?.detail).toContain("Bookings paused");
  });

  it("flags a stale safety declaration after a year", () => {
    const stale = operator({ safetyDeclarationAt: daysFromNow(-400) });
    expect(badge(stale, "safety")?.tone).toBe("caution");
    expect(badge(stale, "safety")?.label).toBe("Safety declaration due");
  });

  it("collapses to a single badge when suspended", () => {
    const badges = verificationBadges(operator({ status: "SUSPENDED" }), NOW);
    expect(badges).toHaveLength(1);
    expect(badges[0].tone).toBe("critical");
  });

  it("hides the rating badge until there are enough reviews to mean anything", () => {
    expect(badge(operator({ reviewCount: 2 }), "rating")).toBeUndefined();
    expect(badge(operator({ reviewCount: 3 }), "rating")).toBeDefined();
  });

  it("never claims a physical inspection", () => {
    const text = verificationBadges(operator(), NOW)
      .map((b) => `${b.label} ${b.detail}`)
      .join(" ")
      .toLowerCase();

    expect(text).not.toContain("inspect");
    expect(text).not.toContain("surveyed");
    expect(text).not.toContain("we visited");
  });
});

describe("isBookable", () => {
  it("allows a verified, insured operator", () => {
    expect(isBookable(operator(), NOW)).toBe(true);
  });

  it("pulls inventory automatically when insurance lapses", () => {
    expect(
      isBookable(operator({ insuranceExpiresAt: daysFromNow(-1) }), NOW),
    ).toBe(false);
  });

  it("keeps pending and suspended operators out of the catalogue", () => {
    expect(isBookable(operator({ status: "PENDING" }), NOW)).toBe(false);
    expect(isBookable(operator({ status: "SUSPENDED" }), NOW)).toBe(false);
  });
});

describe("verificationHeadline", () => {
  it("summarises each state in one line", () => {
    expect(verificationHeadline(operator(), NOW)).toBe(
      "Licence and insurance verified",
    );
    expect(
      verificationHeadline(operator({ insuranceExpiresAt: daysFromNow(5) }), NOW),
    ).toContain("renewal due");
    expect(verificationHeadline(operator({ status: "PENDING" }), NOW)).toBe(
      "Verification in progress",
    );
  });
});
