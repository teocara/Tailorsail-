import Link from "next/link";
import {
  verificationBadges,
  type OperatorVerificationInput,
} from "@/lib/verification";
import { Card, Pill } from "./ui";

/**
 * Operator trust display.
 *
 * Every badge here is derived from operator data at render time, so it cannot
 * say "verified" after the insurance has lapsed. The wording is careful about
 * what we actually did: we checked documents. We did not inspect the boat, and
 * nothing in this component implies we did.
 */
export function VerificationBadges({
  operator,
}: {
  operator: OperatorVerificationInput;
}) {
  const badges = verificationBadges(operator);

  return (
    <ul className="space-y-2.5">
      {badges.map((badge) => (
        <li key={badge.id} className="flex flex-wrap items-baseline gap-x-2">
          <Pill tone={badge.tone}>{badge.label}</Pill>
          <span className="text-sm text-[var(--color-ink-muted)]">
            {badge.detail}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OperatorCard({
  operator,
}: {
  operator: OperatorVerificationInput & {
    slug: string;
    name: string;
    type: string;
    homePort: string;
  };
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
            {operator.type === "PRIVATE_OWNER"
              ? "Private owner"
              : "Charter operator"}
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg">
            {operator.name}
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {operator.homePort}
          </p>
        </div>
        <Link
          href={`/operators/${operator.slug}`}
          className="text-sm text-[var(--accent-strong)] hover:underline"
        >
          Full profile
        </Link>
      </div>

      <div className="mt-4 border-t border-[var(--color-line)] pt-4">
        <VerificationBadges operator={operator} />
      </div>

      <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
        We verify operators from documents — licence, insurance certificate and
        a safety equipment declaration — and re-check them as they expire. We do
        not physically inspect boats, and we will not tell you we have.
      </p>
    </Card>
  );
}
