import Link from "next/link";
import { db } from "@/lib/db";
import { filtersFromSearchParams, findTrips } from "@/lib/trips";
import { TripGrid } from "@/components/trip-card";
import { SearchBox } from "@/components/search-box";
import { Container, EmptyState, Eyebrow, Pill, Section } from "@/components/ui";
import { perRequest } from "@/lib/render-mode";
import { IS_STATIC } from "@/lib/static-mode";

export const metadata = { title: "Trips" };

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

type SearchParams = Record<string, string | string[] | undefined>;

/** Build a URL with one filter toggled, preserving the rest. */
function toggleHref(params: SearchParams, key: string, value: string): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    // Drop the search narration when filters are changed by hand — it
    // described the original query, not the current filter set.
    if (k === "why" || k === "parser" || k === "q") continue;
    next.set(k, Array.isArray(v) ? v[0] : v);
  }

  const current = next.get(key);
  if (current === value) next.delete(key);
  else next.set(key, value);

  const qs = next.toString();
  return qs ? `/trips?${qs}` : "/trips";
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await perRequest();
  // The static build ships the unfiltered catalogue and applies facets in the
  // browser (components/trip-finder.tsx), because reading searchParams here
  // would make the page dynamic.
  const params = IS_STATIC ? {} : await searchParams;
  const filters = filtersFromSearchParams(params);

  const query = typeof params.q === "string" ? params.q : "";
  const why = typeof params.why === "string" ? params.why : "";
  const parser = typeof params.parser === "string" ? params.parser : "";

  const [trips, destinations] = await Promise.all([
    findTrips({ ...filters, sort: filters.sort ?? "recommended" }),
    db.destination.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const active = Object.entries(params).filter(
    ([k, v]) => v !== undefined && !["q", "why", "parser", "sort"].includes(k),
  );

  return (
    <>
      <Section className="border-b border-[var(--color-line)] !py-10">
        <Container>
          <Eyebrow>Trips</Eyebrow>
          <h1 className="mt-2 text-3xl">
            {trips.length} {trips.length === 1 ? "trip" : "trips"} available
          </h1>

          <div className="mt-6 max-w-3xl">
            <SearchBox defaultValue={query} compact />
          </div>

          {why ? (
            <div className="mt-4 max-w-3xl rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-sunk)] px-4 py-3">
              <p className="text-sm text-[var(--color-ink-muted)]">{why}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {parser === "ai"
                  ? "Interpreted by Tailorsail AI."
                  : "Keyword match — the full natural-language search needs an API key."}
              </p>
            </div>
          ) : null}
        </Container>
      </Section>

      <Section className="!pt-8">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:items-start">
            {/* ------------------------------------------------- Filters */}
            <aside className="space-y-6">
              <FilterGroup title="Where">
                {destinations.map((d) => (
                  <FilterChip
                    key={d.slug}
                    href={toggleHref(params, "destination", d.slug)}
                    active={filters.destinationSlug === d.slug}
                  >
                    {d.name}
                  </FilterChip>
                ))}
              </FilterGroup>

              <FilterGroup title="When">
                {MONTHS.map(([value, label]) => (
                  <FilterChip
                    key={value}
                    href={toggleHref(params, "month", String(value))}
                    active={filters.month === value}
                  >
                    {label}
                  </FilterChip>
                ))}
              </FilterGroup>

              <FilterGroup title="Experience">
                {SKILLS.map(([value, label]) => (
                  <FilterChip
                    key={value}
                    href={toggleHref(params, "skill", value)}
                    active={filters.skillLevel === value}
                  >
                    {label}
                  </FilterChip>
                ))}
              </FilterGroup>

              <FilterGroup title="Format">
                {FORMATS.map(([value, label]) => (
                  <FilterChip
                    key={value}
                    href={toggleHref(params, "format", value)}
                    active={filters.format === value}
                  >
                    {label}
                  </FilterChip>
                ))}
              </FilterGroup>

              <FilterGroup title="Boat">
                {(["MONOHULL", "CATAMARAN"] as const).map((value) => (
                  <FilterChip
                    key={value}
                    href={toggleHref(params, "boat", value)}
                    active={filters.boatType === value}
                  >
                    {value === "MONOHULL" ? "Monohull" : "Catamaran"}
                  </FilterChip>
                ))}
              </FilterGroup>

              {active.length > 0 ? (
                <Link
                  href="/trips"
                  className="inline-block text-sm text-[var(--accent-strong)] hover:underline"
                >
                  Clear all filters
                </Link>
              ) : null}
            </aside>

            {/* -------------------------------------------------- Results */}
            <div>
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                  Sort
                </span>
                {(
                  [
                    ["recommended", "Recommended"],
                    ["price-asc", "Price"],
                    ["date", "Soonest"],
                  ] as const
                ).map(([value, label]) => (
                  <FilterChip
                    key={value}
                    href={toggleHref(params, "sort", value)}
                    active={(filters.sort ?? "recommended") === value}
                  >
                    {label}
                  </FilterChip>
                ))}
              </div>

              {trips.length > 0 ? (
                <TripGrid trips={trips} />
              ) : (
                <EmptyState title="Nothing matches that combination">
                  <p>
                    Try widening the month or the experience level — we sell a
                    small catalogue on purpose, so specific combinations can
                    come up empty.
                  </p>
                  <Link
                    href="/trips"
                    className="mt-3 inline-block text-[var(--accent-strong)] hover:underline"
                  >
                    Clear all filters
                  </Link>
                </EmptyState>
              )}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
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

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:border-navy-600 hover:text-navy-900"
      }`}
    >
      {children}
    </Link>
  );
}
