"use client";

import { useEffect, useState } from "react";
import { toggleReadiness } from "@/app/actions/booking";
import { IS_STATIC, liveAction } from "@/lib/static-mode";

/**
 * The preparation programme, as a checklist that remembers.
 *
 * On the server each tick is a form post that writes to the booking. The
 * static build has nowhere to write, so it keeps the ticks in `localStorage`
 * instead — per browser rather than per booking, which is the honest limit of
 * a site with no account behind it, but indistinguishable in use.
 *
 * Worth keeping working rather than disabling: the checklist is the readiness
 * programme made concrete, and a demo where none of the boxes tick makes the
 * central promise look decorative.
 */

export interface ReadinessRow {
  id: string;
  title: string;
  body: string;
  phase: string;
  done: boolean;
}

const KEY = (reference: string) => `tailorsail:readiness:${reference}`;

/**
 * Ticks this browser has stored. Every access is guarded: private windows and
 * blocked-cookie settings throw on read, not just on write.
 */
function readStored(reference: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(KEY(reference));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeStored(reference: string, value: Record<string, boolean>): void {
  try {
    window.localStorage.setItem(KEY(reference), JSON.stringify(value));
  } catch {
    // Storage unavailable. The tick still works for this page view, which is
    // the most a browser that refuses to remember anything can offer.
  }
}

export function ReadinessChecklist({
  reference,
  rows,
  phases,
  phaseLabel,
  heading,
}: {
  reference: string;
  rows: ReadinessRow[];
  phases: readonly string[];
  phaseLabel: Record<string, string>;
  /** The section title, which sits on the same row as the counter. */
  heading: React.ReactNode;
}) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // After mount, so the server's HTML and the first client render agree.
  useEffect(() => {
    if (IS_STATIC) setOverrides(readStored(reference));
  }, [reference]);

  const isDone = (row: ReadinessRow) => overrides[row.id] ?? row.done;
  const done = rows.filter(isDone).length;
  const total = rows.length;

  function toggle(row: ReadinessRow) {
    const next = { ...overrides, [row.id]: !isDone(row) };
    setOverrides(next);
    writeStored(reference, next);
  }

  return (
    <>
      {/*
        The counter and the bar live in here with the list rather than beside
        it. Held separately they were two components deriving the same number
        from two copies of the state, which is a desync waiting to happen the
        moment a tick stops going through the server.
      */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        {heading}
        <p className="text-sm text-[var(--color-ink-muted)]" aria-live="polite">
          {done} of {total} done
        </p>
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunk)]"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-[var(--accent-strong)] transition-all"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>

      <div className="mt-6 space-y-7">
        {phases.map((phase) => {
          const inPhase = rows.filter((r) => r.phase === phase);
          if (inPhase.length === 0) return null;

          return (
            <div key={phase}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                {phaseLabel[phase]}
              </h3>
              <ul className="mt-3 space-y-2">
                {inPhase.map((row) => {
                  const checked = isDone(row);
                  return (
                    <li key={row.id}>
                      <form
                        action={liveAction(toggleReadiness)}
                        onSubmit={
                          IS_STATIC
                            ? (e) => {
                                e.preventDefault();
                                toggle(row);
                              }
                            : undefined
                        }
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          type="hidden"
                          name="reference"
                          value={reference}
                        />
                        <button
                          type="submit"
                          aria-pressed={checked}
                          className={`flex w-full gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors ${
                            checked
                              ? "border-[var(--color-line)] bg-[var(--color-surface-sunk)]"
                              : "border-[var(--color-line)] hover:border-[var(--accent-strong)]"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                              checked
                                ? "border-[var(--accent-strong)] bg-[var(--accent-strong)] text-white"
                                : "border-[var(--color-line)]"
                            }`}
                          >
                            {checked ? "✓" : ""}
                          </span>
                          <span className="flex-1">
                            <span
                              className={`block font-medium ${checked ? "text-[var(--color-ink-muted)] line-through" : ""}`}
                            >
                              {row.title}
                            </span>
                            <span className="mt-1 block text-sm text-[var(--color-ink-muted)]">
                              {row.body}
                            </span>
                          </span>
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
