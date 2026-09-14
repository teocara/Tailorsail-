import { generate, HOUSE_CONTEXT, type AiResult } from "./client";
import { briefingBlock, type DestinationBriefing } from "./destination-context";
import {
  ReadinessProgrammeSchema,
  type GeneratedReadiness,
} from "./schemas";

/**
 * Generate the pre-trip readiness programme for a destination.
 *
 * This is the pillar that makes the business more than a booking form: a
 * first-timer who arrives having practised the right things, packed the right
 * kit and read the right wind briefing has a good week. Generating it per
 * destination — rather than writing one generic checklist — is what makes
 * "location-specific programme" survive six cruising grounds and two people.
 */
export async function generateReadiness(input: {
  destination: DestinationBriefing;
  /** Bias the programme toward the level most of this ground's trips sell at. */
  typicalSkillLevel: string;
}): Promise<AiResult<GeneratedReadiness>> {
  const { destination, typicalSkillLevel } = input;

  return generate({
    feature: "generate-readiness",
    effort: "high",
    cachedSystem: `${HOUSE_CONTEXT}

${briefingBlock(destination)}

You write pre-trip preparation programmes. A programme is a set of tasks
phased across the run-up to departure:

- BOOK    (weeksBefore 8-12): decisions and paperwork — licences, insurance, who is doing what aboard.
- PREPARE (weeksBefore 3-8): skills and knowledge — what to practise, what to read, what the weather will actually do.
- PACK    (weeksBefore 1-2): kit, and specifically the kit this cruising ground demands.
- ARRIVE  (weeksBefore 0): the first 24 hours — marina, provisioning, briefing, first passage.

Rules:
- Every task must be actionable. "Learn about the bora" is not a task; "Read the bora briefing and agree with your skipper which two bailout harbours you would run to" is.
- At least four tasks must be things that would be different — or unnecessary — in a different cruising ground. Permits, anchoring restrictions, specific winds, specific approaches. This local specificity is the entire value.
- Do not write medical advice, insurance advice, or anything that reads as a safety guarantee.
- Body text is two to four sentences. No bullet lists inside a body.`,
    system: `Most travellers on this cruising ground book at skill level ${typicalSkillLevel}. Pitch the programme there, and assume at least one person aboard has never sailed.`,
    prompt: `Write the readiness programme for ${destination.name}. Produce 10 to 14 tasks spread across all four phases, ordered from earliest to latest.`,
    schema: ReadinessProgrammeSchema,
  });
}
