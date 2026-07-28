import { generate, HOUSE_CONTEXT, type AiResult } from "./client";
import { briefingBlock, type DestinationBriefing } from "./destination-context";
import { ItinerarySchema, type GeneratedItinerary } from "./schemas";

/**
 * Generate a day-by-day itinerary for a trip.
 *
 * Run offline via `npm run ai:generate` and committed into the seed rather
 * than called per request: an itinerary is a property of the trip, not of the
 * visitor, so generating it once and reviewing it once is both cheaper and
 * more accurate than regenerating it for every page view.
 */
export async function generateItinerary(input: {
  destination: DestinationBriefing;
  boat: { name: string; model: string; type: string; lengthM: number; berths: number };
  tripName: string;
  format: string;
  skipper: string;
  skillLevel: string;
  durationDays: number;
  startPort: string;
  endPort: string;
  isCrewTrip: boolean;
}): Promise<AiResult<GeneratedItinerary>> {
  const {
    destination,
    boat,
    tripName,
    format,
    skipper,
    skillLevel,
    durationDays,
    startPort,
    endPort,
    isCrewTrip,
  } = input;

  const audience = isCrewTrip
    ? `This is a Tailorsail Crew trip: travellers in their twenties, sociable, often solo and matched into a group. Evenings and anchorages matter to them as much as the sailing. Keep the tone energetic without being laddish, and do not assume anyone has sailed before.`
    : `This is a core Tailorsail trip: mixed groups, often friends or family, frequently with at least one complete beginner aboard.`;

  return generate({
    feature: "generate-itinerary",
    effort: "high",
    // Cached prefix: identical for every trip in this destination.
    cachedSystem: `${HOUSE_CONTEXT}

${briefingBlock(destination)}

You write day-by-day sailing itineraries. Rules for every day you produce:
- Ports must be real places named in the briefing, or obviously within the same cruising ground.
- Nautical miles must be plausible for a day sail on a cruising yacht: usually 15-35, occasionally under 10 for a short hop, rarely over 45.
- Reference the actual wind pattern where it shapes the day's plan — an itinerary that ignores the prevailing wind is not a plan, it is a wish.
- Build a rest day or a short leg into weeks of six days or more.
- The description is for someone deciding whether to book: what the sailing feels like, what they will see, where they sleep. Not a brochure adjective pile.
- The highlight is one short phrase, not a sentence.`,
    system: `Trip: ${tripName}
Boat: ${boat.name}, a ${boat.lengthM}m ${boat.model} (${boat.type}), ${boat.berths} berths
Format: ${format}, ${skipper}
Skill level: ${skillLevel}
Duration: ${durationDays} days
Route: departs ${startPort}, returns to ${endPort}

${audience}`,
    prompt: `Write the ${durationDays}-day itinerary for this trip. Day 1 starts in ${startPort} and the final day ends in ${endPort}. Number the days 1 to ${durationDays}.`,
    schema: ItinerarySchema,
  });
}
