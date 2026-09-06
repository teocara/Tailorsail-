"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  filtersFromSearchParams,
  type TripFilters,
  type TripListItem,
} from "@/lib/trip-filters";
import { filterTripIndex, type TripIndex } from "@/lib/trip-index";
import { TripGrid } from "./trip-card";
import { EmptyState } from "./ui";

/**
 * The faceted trip list.
 *
 * One component for both builds. On the server the chips are ordinary links
 * and a click is a round trip that re-runs `findTrips` — unchanged behaviour,
 * and it still works with JavaScript off. The static build has no server to
 * ask, so it fetches the prebuilt catalogue once and filters in place.
 *
 * The server-rendered results are what ships in the HTML either way, so the
 * page is complete and readable before any of this runs; the index only
 * arrives afterwards and takes over.
 */

const MONTHS = [
  [5, "May"],
  [6, "Jun"],
  [7, "Jul"],
  [8, "Aug"],
  [9, "Sep"],
  [10, "Oct"],
] as const;

const SKILLS = [
  ["FIRST_TIMER", "Never sailed"],
  ["COMPETENT_CREW", "Some experience"],
  ["SKIPPER", "I hold a licence"],
] as const;

const FORMATS = [
  ["WHOLE_BOAT", "Whole boat"],
  ["CABIN_CHARTER", "By the cabin"],
  ["FLOTILLA", "Flotilla"],
] as const;

const SORTS = [
  ["recommended", "Recommended"],
  ["price-asc", "Price"],
  ["date", "Soonest"],
] as const;

type Params = Record<string, string>;

/** Build a URL with one filter toggled, preserving the rest. */
function toggleParams(params: Params, key: string, value: string): Params {
  const next: Params = {};
  for (const [k, v] of Object.entries(params)) {
    // Drop the search narration when filters are changed by hand — it
    // described the original query, not the current filter set.
    if (k === "why" || k === "parser" || k === "q") continue;
    next[k] = v;
  }
  if (next[key] === value) delete next[key];
  else next[key] = value;
  return next;
}

function toHref(params: Params): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `/trips?${qs}` : "/trips";
}

export function TripBrowser({
  initialTrips,
  initialParams,
  destinations,
  /** Where to fetch the prebuilt catalogue. Only set in the static build. */
  indexUrl,
  searchBox,
}: {
  initialTrips: TripListItem[];
  initialParams: Params;
  destinations: { slug: string; name: string }[];
  indexUrl?: string;
  /**
   * Rendered under the heading. Passed in rather than imported so the count
   * above it can stay live — it is the page's h1, and it has to change when
   * the filters do.
   */
  searchBox?: ReactNode;
}) {
  const [params, setParams] = useState<Params>(initialParams);
  const [index, setIndex] = useState<TripIndex | null>(null);

  // Static build only. Until this resolves the server-rendered results stand,
  // so a slow network degrades to "filters need a moment", not a blank page.
  useEffect(() => {
    if (!indexUrl) return;
    let cancelled = false;
    fetch(indexUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TripIndex | null) => {
        if (!cancelled && data) setIndex(data);
      })
      .catch(() => {
        // Leaving `index` null keeps the server-rendered list on screen, which
        // is a better failure than an empty catalogue.
      });
    return () => {
      cancelled = true;
    };
  }, [indexUrl]);

  // The URL is the source of truth on arrival, so a shared link to a filtered
  // view opens filtered.
  useEffect(() => {
    if (!indexUrl) return;
    const fromUrl = Object.fromEntries(
      new URLSearchParams(window.location.search).entries(),
    );
    if (Object.keys(fromUrl).length > 0) setParams(fromUrl);
  }, [indexUrl]);

  const filters: TripFilters = useMemo(
    () => filtersFromSearchParams(params),
    [params],
  );

  const trips = useMemo(() => {
    if (!index) return initialTrips;
    return filterTripIndex(index, {
      ...filters,
      sort: filters.sort ?? "recommended",
    });
  }, [index, filters, initialTrips]);

  /** Client-side in the static build; a real navigation otherwise. */
  const onChipClick =
    (next: Params) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        !indexUrl ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      setParams(next);
      window.history.replaceState(null, "", toHref(next));
    };

  const chip = (
    key: string,
    value: string,
    label: ReactNode,
    active: boolean,
  ) => {
    const next = toggleParams(params, key, value);
    return (
      <Link
        key={`${key}-${value}`}
        href={toHref(next)}
        onClick={onChipClick(next)}
        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
          active
            ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:border-navy-600 hover:text-navy-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  const hasFilters = Object.keys(params).some(
    (k) => !["q", "why", "parser", "sort"].includes(k),
  );

  const clearAll = (
    <Link
      href="/trips"
      onClick={onChipClick({})}
      className="inline-block text-sm text-[var(--accent-strong)] hover:underline"
    >
      Clear all filters
    </Link>
  );

  return (
    <>
      <h1 className="text-3xl font-[family-name:var(--font-display)]">
        {trips.length} {trips.length === 1 ? "trip" : "trips"} available
      </h1>

      {searchBox ? <div className="mt-6 max-w-3xl">{searchBox}</div> : null}

      {params.why ? (
        <div className="mt-4 max-w-3xl rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-sunk)] px-4 py-3">
          <p className="text-sm text-[var(--color-ink-muted)]">{params.why}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            {params.parser === "ai"
              ? "Interpreted by Tailorsail AI."
              : "Keyword match — the full natural-language search needs an API key."}
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr] lg:items-start">
        <aside className="space-y-6">
          <FilterGroup title="Where">
            {destinations.map((d) =>
              chip(
                "destination",
                d.slug,
                d.name,
                filters.destinationSlug === d.slug,
              ),
            )}
          </FilterGroup>

          <FilterGroup title="When">
            {MONTHS.map(([value, label]) =>
              chip("month", String(value), label, filters.month === value),
            )}
          </FilterGroup>

          <FilterGroup title="Experience">
            {SKILLS.map(([value, label]) =>
              chip("skill", value, label, filters.skillLevel === value),
            )}
          </FilterGroup>

          <FilterGroup title="Format">
            {FORMATS.map(([value, label]) =>
              chip("format", value, label, filters.format === value),
            )}
          </FilterGroup>

          <FilterGroup title="Boat">
            {(["MONOHULL", "CATAMARAN"] as const).map((value) =>
              chip(
                "boat",
                value,
                value === "MONOHULL" ? "Monohull" : "Catamaran",
                filters.boatType === value,
              ),
            )}
          </FilterGroup>

          {hasFilters ? clearAll : null}
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
              Sort
            </span>
            {SORTS.map(([value, label]) =>
              chip(
                "sort",
                value,
                label,
                (filters.sort ?? "recommended") === value,
              ),
            )}
          </div>

          {trips.length > 0 ? (
            <TripGrid trips={trips} />
          ) : (
            <EmptyState title="Nothing matches that combination">
              <p>
                Try widening the month or the experience level — we sell a small
                catalogue on purpose, so specific combinations can come up
                empty.
              </p>
              <span className="mt-3 inline-block">{clearAll}</span>
            </EmptyState>
          )}
        </div>
      </div>
    </>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
