"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isConfigured } from "@/lib/ai/client";
import { parseTripQuery, toTripFilters } from "@/lib/ai/trip-finder";
import { parseQueryWithoutAi } from "@/lib/search-fallback";
import { searchParamsFromFilters } from "@/lib/trips";

/**
 * Natural-language search.
 *
 * The model's only job is turning a sentence into filters. It does not rank or
 * select trips — the resulting filters go into the same `findTrips` builder the
 * faceted UI uses, and the result is a plain URL that can be shared, bookmarked
 * and cached. Without an API key a keyword parser stands in, and the results
 * page says which one ran.
 */
export async function searchTrips(formData: FormData) {
  const query = String(formData.get("q") ?? "").trim();

  if (!query) redirect("/trips");

  if (!isConfigured()) {
    const { filters, rationale } = parseQueryWithoutAi(query);
    const params = searchParamsFromFilters(filters);
    params.set("q", query);
    params.set("why", rationale);
    params.set("parser", "keyword");
    redirect(`/trips?${params.toString()}`);
  }

  const destinations = await db.destination.findMany({
    select: { slug: true, name: true, region: { select: { name: true } } },
  });

  const result = await parseTripQuery({
    query,
    destinations: destinations.map((d) => ({
      slug: d.slug,
      name: d.name,
      regionName: d.region.name,
    })),
    today: new Date(),
  });

  if (!result.ok) {
    // A model outage must degrade the feature, never break the page.
    const { filters, rationale } = parseQueryWithoutAi(query);
    const params = searchParamsFromFilters(filters);
    params.set("q", query);
    params.set("why", rationale);
    params.set("parser", "keyword");
    redirect(`/trips?${params.toString()}`);
  }

  const params = searchParamsFromFilters(toTripFilters(result.data));
  params.set("q", query);
  params.set("why", result.data.rationale);
  params.set("parser", "ai");

  redirect(`/trips?${params.toString()}`);
}
