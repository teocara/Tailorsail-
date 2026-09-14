import type { ReactNode } from "react";
import { STATIC_NOTICE } from "@/lib/static-mode";

/**
 * What a write control says on the published build.
 *
 * The static site keeps its forms and buttons on the page rather than removing
 * them: a booking flow is most of what this product *is*, and hiding the form
 * would demonstrate less, not more. So the controls render, disabled, and this
 * says why — a dead control with no explanation reads as a bug.
 *
 * `detail` is what specifically would have happened had there been a server,
 * which is the part worth knowing.
 */
export function DemoNotice({
  detail,
  className = "",
}: {
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] bg-[var(--color-surface-sunk)] px-4 py-3 text-sm text-[var(--color-ink-muted)] ${className}`}
    >
      <p>
        <strong className="font-medium text-[var(--color-ink)]">
          Demo build.
        </strong>{" "}
        {STATIC_NOTICE}
      </p>
      {detail ? <p className="mt-1.5">{detail}</p> : null}
    </div>
  );
}
