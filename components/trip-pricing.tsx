"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { formatCents } from "@/lib/money";
import {
  quoteKey,
  type PricedDeparture,
  type TripPricing,
} from "@/lib/trip-pricing";
import type { CustomerQuote } from "@/lib/pricing/types";
import { PriceBreakdown } from "./price-breakdown";
import { Card, formatDateRange } from "./ui";

/**
 * The trip page's pricing: party size, departure, and everything they change.
 *
 * On the server this is just another render with different `searchParams`. The
 * static build cannot re-render, so the selection moves into the browser.
 *
 * Deliberately *not* `useSearchParams()`, which would be the obvious choice:
 * under `output: "export"` that opts the whole page into client-side rendering
 * unless it sits behind a Suspense boundary, and the boundary's fallback is
 * what ends up in the prerendered HTML. The trip page would ship with its
 * price panel and breakdown missing — from the file, not just from the first
 * paint — which is the wrong trade for the one screen that most needs to be
 * readable without JavaScript.
 *
 * So the default selection is server-rendered into the HTML, and on mount the
 * URL is applied over it. The chips stay real links: without JavaScript they
 * navigate (and the server build re-renders properly), with it they update in
 * place and rewrite the address bar, so a link to a particular departure is
 * still shareable.
 *
 * The panel and the breakdown sit in opposite columns with a lot of
 * server-rendered content between them, so a provider wraps the grid and both
 * read from it — which also means the quote map is serialised into the page
 * once rather than once per consumer.
 */

interface Selection {
  pricing: TripPricing;
  departure: PricedDeparture;
  berths: number;
  quote: CustomerQuote;
  /** Navigate to a different departure or party size without a page load. */
  select: (over: { departure?: string; berths?: number }) => void;
  href: (over: { departure?: string; berths?: number }) => string;
}

const Ctx = createContext<Selection | null>(null);

function useSelection(): Selection {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error(
      "Trip pricing components must render inside TripPricingProvider",
    );
  }
  return value;
}

/**
 * Resolve a requested departure and party size against what actually exists.
 *
 * Both values are just query-string text someone can type, so every step falls
 * back rather than throwing: an unknown departure id, a party size of
 * `banana`, a size larger than the boat. Changing departure can also strand a
 * party size the new boat cannot take, which is the case worth getting right —
 * it happens on an ordinary click, not only on a hand-edited URL.
 */
function resolve(
  pricing: TripPricing,
  requestedDeparture: string | null,
  requestedBerths: number,
): { departure: PricedDeparture; berths: number } {
  const departure =
    pricing.departures.find((d) => d.id === requestedDeparture) ??
    pricing.departures.find((d) => d.id === pricing.defaultDepartureId) ??
    pricing.departures[0];

  const sizes = departure.partySizes;
  const berths = sizes.includes(requestedBerths)
    ? requestedBerths
    : // Nearest offered size, so switching to a smaller boat keeps a party of
      // six as close to six as that boat allows rather than resetting.
      (sizes.reduce<number | null>(
        (best, n) =>
          best === null ||
          Math.abs(n - requestedBerths) < Math.abs(best - requestedBerths)
            ? n
            : best,
        null,
      ) ?? sizes[sizes.length - 1]);

  return { departure, berths };
}

export function TripPricingProvider({
  pricing,
  children,
}: {
  pricing: TripPricing;
  children: ReactNode;
}) {
  const [requested, setRequested] = useState<{
    departure: string | null;
    berths: number;
  }>({ departure: pricing.defaultDepartureId, berths: pricing.defaultBerths });

  // Applied after mount rather than during the first render: reading
  // location.search while rendering would disagree with the server's HTML and
  // trip a hydration mismatch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const departure = params.get("departure");
    const rawBerths = params.get("berths");
    const berths = rawBerths === null ? null : Number(rawBerths);

    if (departure === null && berths === null) return;

    setRequested({
      departure: departure ?? pricing.defaultDepartureId,
      berths:
        berths !== null && Number.isFinite(berths)
          ? berths
          : pricing.defaultBerths,
    });
  }, [pricing.defaultDepartureId, pricing.defaultBerths]);

  const value = useMemo<Selection>(() => {
    const { departure, berths } = resolve(
      pricing,
      requested.departure,
      requested.berths,
    );

    const href = (over: { departure?: string; berths?: number }) => {
      const next = resolve(
        pricing,
        over.departure ?? departure.id,
        over.berths ?? berths,
      );
      const params = new URLSearchParams({
        departure: next.departure.id,
        berths: String(next.berths),
      });
      return `/trips/${pricing.slug}?${params.toString()}`;
    };

    return {
      pricing,
      departure,
      berths,
      quote: pricing.quotes[quoteKey(departure.id, berths)],
      href,
      select: (over) => {
        setRequested({
          departure: over.departure ?? departure.id,
          berths: over.berths ?? berths,
        });
        // Keep the address bar honest so the link can still be shared, but
        // without a history entry per chip click.
        window.history.replaceState(null, "", href(over));
      },
    };
  }, [pricing, requested]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * A chip that navigates without a page load when it can.
 *
 * Still an anchor, so it works with JavaScript off, opens in a new tab on a
 * modified click, and reads as a link to a screen reader.
 */
function SelectLink({
  over,
  className,
  children,
}: {
  over: { departure?: string; berths?: number };
  className: string;
  children: ReactNode;
}) {
  const { href, select } = useSelection();

  const onClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (
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
      select(over);
    },
    [select, over],
  );

  return (
    <Link
      href={href(over)}
      scroll={false}
      onClick={onClick}
      className={className}
    >
      {children}
    </Link>
  );
}

/** The sticky right-hand card: headline, party size, departures, CTA. */
export function PricePanel({ footer }: { footer?: ReactNode }) {
  const { pricing, departure, berths, quote } = useSelection();

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
        All-in, {berths} {berths === 1 ? "person" : "people"}
      </p>
      <p className="mt-1">
        <span className="font-[family-name:var(--font-display)] text-3xl">
          {formatCents(quote.totalAllInCents)}
        </span>
        <span className="ml-2 text-sm text-[var(--color-ink-muted)]">
          {formatCents(quote.perPersonCents)} each
        </span>
      </p>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Party size
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {departure.partySizes.map((n) => (
            <SelectLink
              key={n}
              over={{ berths: n }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                n === berths
                  ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--color-line)] text-[var(--color-ink-muted)] hover:border-navy-600"
              }`}
            >
              {n}
            </SelectLink>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Departure
        </p>
        <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {pricing.departures.map((d) => (
            <SelectLink
              key={d.id}
              over={{ departure: d.id }}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                d.id === departure.id
                  ? "border-[var(--accent-strong)] bg-[var(--accent-soft)]"
                  : "border-[var(--color-line)] hover:border-navy-600"
              }`}
            >
              <span>
                {formatDateRange(new Date(d.startDate), new Date(d.endDate))}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                {d.berthsFree <= 3
                  ? `${d.berthsFree} left`
                  : `${d.berthsFree} free`}
              </span>
            </SelectLink>
          ))}
        </div>
      </div>

      <Link
        href={`/trips/${pricing.slug}/book?departure=${departure.id}&berths=${berths}`}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 py-2.5 text-sm font-medium text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
      >
        Request this departure
      </Link>
      {footer}
    </Card>
  );
}

/** The itemised breakdown, and the caption that names what it is priced for. */
export function LivePriceBreakdown() {
  const { departure, berths, quote } = useSelection();
  return (
    <>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        Priced for {berths} {berths === 1 ? "person" : "people"} on the{" "}
        {formatDateRange(
          new Date(departure.startDate),
          new Date(departure.endDate),
        )}{" "}
        departure. Change the party size or the date on the right and this
        updates.
      </p>
      <div className="mt-5">
        <PriceBreakdown
          quote={quote}
          referenceCents={departure.referenceCents}
        />
      </div>
    </>
  );
}
