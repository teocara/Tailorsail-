import { generate, HOUSE_CONTEXT, type AiResult } from "./client";
import { TripFinderSchema, type TripFinderResult } from "./schemas";
import type { TripFilters } from "@/lib/trips";

/**
 * Turn a sentence into search filters.
 *
 * The model's only job is interpretation — it never ranks or selects trips.
 * Its output feeds the same `findTrips` builder the faceted UI uses, so the
 * natural-language path and the click path can't drift apart, and the result
 * is a plain URL the visitor can share or bookmark.
 */
export async function parseTripQuery(input: {
  query: string;
  destinations: { slug: string; name: string; regionName: string }[];
  today: Date;
}): Promise<AiResult<TripFinderResult>> {
  const { query, destinations, today } = input;

  const catalogue = destinations
    .map((d) => `- ${d.slug}: ${d.name} (${d.regionName})`)
    .join("\n");

  return generate({
    feature: "trip-finder",
    // Cheap classification — this runs on every search box submission.
    effort: "low",
    maxTokens: 2000,
    cachedSystem: `${HOUSE_CONTEXT}

You convert a traveller's plain-English description of the holiday they want
into structured search filters.

Available destinations:
${catalogue}

Rules:
- Only ever return a destinationSlug from the list above. If they name somewhere we do not sell (Greece, Turkey, the Caribbean), leave it null and say so in the rationale.
- Set a field to null when the query does not imply it. Guessing narrows the results and hides trips they would have liked.
- "Never sailed", "complete beginners", "first time" means skillLevel FIRST_TIMER.
- A group size means minBerthsAvailable, not a boat size.
- Words like "young", "twenties", "party", "nightlife", "solo but sociable", "festival" mean crewOnly true.
- A budget is per person for the whole week unless they clearly say otherwise.
- If they name a month, map it to its number. Relative dates like "next summer" or "August" resolve against today's date.
- The rationale is one sentence, addressed to the traveller, describing how you read their request. If you had to ignore or reinterpret part of it, that is the thing to mention.`,
    system: `Today is ${today.toISOString().slice(0, 10)}.`,
    prompt: query,
    schema: TripFinderSchema,
  });
}

/** Map the model's nullable output onto the internal filter shape. */
export function toTripFilters(result: TripFinderResult): TripFilters {
  const f = result.filters;
  return {
    destinationSlug: f.destinationSlug ?? undefined,
    regionSlug: f.regionSlug ?? undefined,
    month: f.month ?? undefined,
    skillLevel: f.skillLevel ?? undefined,
    format: f.format ?? undefined,
    skipper: f.skipper ?? undefined,
    boatType: f.boatType ?? undefined,
    maxPricePerPersonCents:
      f.maxPricePerPersonEur !== null
        ? Math.round(f.maxPricePerPersonEur * 100)
        : undefined,
    minBerthsAvailable: f.minBerthsAvailable ?? undefined,
    crewOnly: f.crewOnly ?? undefined,
  };
}
