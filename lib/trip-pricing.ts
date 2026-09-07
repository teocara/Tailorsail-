import type { CustomerQuote } from "@/lib/pricing/types";

/**
 * Every price a trip page can show, worked out ahead of time.
 *
 * The trip page reprices as you change the party size or the departure, which
 * on the server is just another render with different `searchParams`. The
 * static build has no server to ask, so the build computes a quote for every
 * combination the UI can reach and the browser picks one.
 *
 * The point of doing it this way rather than shipping the price components and
 * recomputing client-side: **no pricing arithmetic moves into the browser.**
 * Every quote here came out of `buildCustomerQuote`, the one gate, whose return
 * type has no cost or margin field. The client only ever indexes into a map of
 * already-safe objects — there is nothing for it to get wrong, and nothing in
 * the payload that was not already safe to publish.
 */

/** Stable key for the quote map. */
export function quoteKey(departureId: string, berths: number): string {
  return `${departureId}:${berths}`;
}

export interface PricedDeparture {
  id: string;
  /** ISO — JSON has no Date. */
  startDate: string;
  endDate: string;
  berthsFree: number;
  /** Party sizes offered for this departure, in the order the chips render. */
  partySizes: number[];
  /**
   * Struck-through "was" price, or null. Only ever non-null when PriceHistory
   * proves it was charged and was the lowest in the prior 30 days.
   */
  referenceCents: number | null;
}

export interface TripPricing {
  slug: string;
  departures: PricedDeparture[];
  /** Keyed by `quoteKey`. */
  quotes: Record<string, CustomerQuote>;
  defaultDepartureId: string;
  defaultBerths: number;
}
