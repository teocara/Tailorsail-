import Link from "next/link";
import type { ReactNode } from "react";

/** Layout and presentational primitives shared across the site. */

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 ${className}`}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Set when the section is an in-page anchor target. */
  id?: string;
}) {
  return (
    <section id={id} className={`py-14 sm:py-20 ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--accent-strong)]">
      {children}
    </p>
  );
}

const TONE_CLASS: Record<string, string> = {
  positive: "bg-[#e8f3ec] text-[#1f5c3d] border-[#c3e0cf]",
  caution: "bg-[#fdf1de] text-[#7a5013] border-[#f0d9ae]",
  critical: "bg-[#fbeaea] text-[#8a2626] border-[#eec7c7]",
  neutral:
    "bg-[var(--color-surface-sunk)] text-[var(--color-ink-muted)] border-[var(--color-line)]",
  accent:
    "bg-[var(--accent-soft)] text-[var(--accent-strong)] border-transparent",
};

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONE_CLASS;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  // `min-w-0` matters: a Card containing a `.scroll-x` table is usually a grid
  // or flex child, and those default to `min-width: auto` — which means the
  // table's min-width forces the column open instead of scrolling inside it.
  return (
    <div
      className={`min-w-0 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)] hover:opacity-90"
      : "border border-[var(--color-line)] hover:border-navy-600";
  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)] hover:opacity-90"
      : variant === "secondary"
        ? "border border-[var(--color-line)] hover:border-navy-600"
        : "text-[var(--color-ink-muted)] hover:text-navy-900";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

/**
 * Gradient stand-in for photography. Deliberately not a stock image: shipping
 * a demo with hotlinked photos of real charter boats would be both a licensing
 * problem and a misrepresentation of operators we have not photographed.
 */
export function GradientHero({
  from,
  to,
  className = "",
  children,
}: {
  from: string;
  to: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 78% 18%, rgba(255,255,255,0.55), transparent 45%)",
        }}
      />
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <Card className="p-10 text-center">
      <p className="font-[family-name:var(--font-display)] text-xl">{title}</p>
      <div className="mt-2 text-sm text-[var(--color-ink-muted)]">
        {children}
      </div>
    </Card>
  );
}

/**
 * Shown wherever a live AI feature is unavailable because no API key is set.
 * Framed as a configuration state rather than an error, because that is what
 * it is — the app is designed to run fully without one.
 */
export function AiNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-sunk)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const d = (date: Date, withMonth: boolean) =>
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      ...(withMonth ? { month: "short" } : {}),
      timeZone: "UTC",
    });
  const year = end.toLocaleDateString("en-GB", {
    year: "numeric",
    timeZone: "UTC",
  });
  return `${d(start, !sameMonth)} – ${d(end, true)} ${year}`;
}

export const SKILL_LABEL: Record<string, string> = {
  FIRST_TIMER: "Suits first-timers",
  COMPETENT_CREW: "Some experience helps",
  SKIPPER: "Licence required",
};

export const FORMAT_LABEL: Record<string, string> = {
  WHOLE_BOAT: "Whole boat",
  CABIN_CHARTER: "By the cabin",
  FLOTILLA: "Flotilla",
};

export const SKIPPER_LABEL: Record<string, string> = {
  SKIPPERED: "Skippered",
  BAREBOAT: "Bareboat",
};

export const BOAT_LABEL: Record<string, string> = {
  MONOHULL: "Monohull",
  CATAMARAN: "Catamaran",
  GULET: "Gulet",
};
