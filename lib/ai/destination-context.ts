/**
 * Turns a destination row into the grounding block every content generation
 * shares.
 *
 * This is deliberately the *whole* briefing, verbatim. The model is asked to
 * work from it and to decline rather than invent when it isn't covered — which
 * only works if the briefing is actually present in the prompt. It also makes
 * the block byte-identical across every call for the same destination, which
 * is what lets it sit behind a cache breakpoint and cost a tenth as much on
 * repeat calls.
 */

export interface DestinationBriefing {
  name: string;
  regionName: string;
  tagline: string;
  summary: string;
  windPattern: string;
  bestMonths: string;
  seaState: string;
  skillLevel: string;
  nauticalHighlights: string;
  marinaNotes: string;
  localRules: string;
  gettingThere: string;
}

export function briefingBlock(destination: DestinationBriefing): string {
  return `DESTINATION BRIEFING — ${destination.name} (${destination.regionName})

Positioning: ${destination.tagline}
Overview: ${destination.summary}

Wind and weather: ${destination.windPattern}
Best months: ${destination.bestMonths}
Sea state: ${destination.seaState}
Minimum realistic skill level: ${destination.skillLevel}

Nautical highlights: ${destination.nauticalHighlights}
Marinas and berthing: ${destination.marinaNotes}
Local rules, permits and restrictions: ${destination.localRules}
Getting there: ${destination.gettingThere}

Everything you write about this cruising ground must be supported by the
briefing above. Ports, winds, permits and distances that do not appear here
are not available to you — if a detail is missing, write around it rather than
inventing it. Local specificity is the product; generic sailing copy that
would read the same for any coastline is a failure.`;
}
