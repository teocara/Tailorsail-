import Link from "next/link";
import type { TripListItem } from "@/lib/trips";
import { formatCents } from "@/lib/money";
import {
  BOAT_LABEL,
  FORMAT_LABEL,
  GradientHero,
  Pill,
  SKILL_LABEL,
  SKIPPER_LABEL,
  formatDateRange,
} from "./ui";

/**
 * The trip card.
 *
 * The price shown is the per-person base for the cheapest available departure,
 * labelled "from". The full all-in figure comes from `buildCustomerQuote` on
 * the trip page once berths are known — a card cannot honestly show an all-in
 * total because the per-person components depend on party size.
 */
export function TripCard({ trip }: { trip: TripListItem }) {
  const lead = trip.lead;

  return (
    <Link
      href={`/trips/${trip.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] transition-shadow hover:shadow-[0_8px_30px_rgba(10,22,40,0.08)]"
    >
      <GradientHero
        from={trip.heroFrom}
        to={trip.heroTo}
        className="h-40 shrink-0"
      >
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
          <p className="text-sm font-medium text-white/90">
            {trip.destination.name}
          </p>
          {trip.isCrewTrip ? (
            <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-[#d94f2b]">
              Crew
            </span>
          ) : null}
        </div>
      </GradientHero>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug">
          {trip.name}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-ink-muted)]">
          {trip.summary}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill tone="accent">{SKILL_LABEL[trip.skillLevel]}</Pill>
          <Pill>{FORMAT_LABEL[trip.format]}</Pill>
          <Pill>{SKIPPER_LABEL[trip.skipper]}</Pill>
        </div>

        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          {trip.durationDays} days · {trip.boat.name}, {trip.boat.lengthM}m{" "}
          {BOAT_LABEL[trip.boat.type].toLowerCase()} · sleeps {trip.boat.berths}
        </p>

        <div className="mt-auto flex items-end justify-between pt-4">
          {lead ? (
            <div>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {formatDateRange(lead.startDate, lead.endDate)}
                {lead.berthsFree <= 3
                  ? ` · ${lead.berthsFree} berth${lead.berthsFree === 1 ? "" : "s"} left`
                  : ""}
              </p>
              <p className="mt-0.5">
                <span className="text-xs text-[var(--color-ink-muted)]">from </span>
                <span className="font-[family-name:var(--font-display)] text-xl">
                  {formatCents(lead.perPersonFromCents)}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)]">
                  {" "}
                  per person
                </span>
              </p>
            </div>
          ) : null}

          <span className="text-sm text-[var(--accent-strong)] group-hover:underline">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TripGrid({ trips }: { trips: TripListItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
