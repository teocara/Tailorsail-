import { generate, HOUSE_CONTEXT, type AiResult } from "./client";
import { RateProposalSchema, type RateProposal } from "./schemas";

/**
 * Buying capacity, with comparables instead of intuition.
 *
 * This is the cost side of the business model. Every net rate we have ever
 * agreed is in the database, so a rate request can cite what comparable boats
 * in the same week and the same cruising ground actually cost us. That is a
 * lever that compounds: the more we book, the better we buy.
 *
 * It never sends. The output is always a draft on a RATE_OPPORTUNITY ops task
 * — a machine autonomously negotiating prices with our own suppliers is not a
 * thing two people should be unable to see happening.
 */

export interface Comparable {
  operatorName: string;
  boatModel: string;
  lengthM: number;
  destinationName: string;
  startDate: Date;
  netRateCents: number;
  acquisition: string;
}

export type NegotiationAngle =
  | "DISTRESSED"
  | "REPOSITIONING"
  | "SHOULDER_SEASON"
  | "ALLOTMENT"
  | "RENEWAL";

const ANGLE_BRIEF: Record<NegotiationAngle, string> = {
  DISTRESSED: `This departure is close and still empty. An unsold week is worth nothing to the operator, so there is real room here — but say it in a way that offers them a solution, not one that gloats about their problem. We are proposing to take the risk off them.`,
  REPOSITIONING: `The operator needs this boat moved anyway. We are offering to fill a delivery leg they would otherwise pay a skipper to do empty.`,
  SHOULDER_SEASON: `Low-season capacity. Our angle is that we can sell it when they cannot, because we package it with training content that makes a quieter week attractive rather than second-best.`,
  ALLOTMENT: `We are offering to pre-commit to berths and carry the risk of not selling them. That commitment is what we are trading for the rate — make the commitment concrete and specific.`,
  RENEWAL: `An existing relationship coming up for renewal. Lead with the volume we have actually delivered them.`,
};

export async function draftRateProposal(input: {
  target: {
    operatorName: string;
    boatModel: string;
    lengthM: number;
    destinationName: string;
    startDate: Date;
    currentNetRateCents: number;
    berthsTotal: number;
    berthsBooked: number;
  };
  comparables: Comparable[];
  angle: NegotiationAngle;
  /** Volume we have sent this operator, if any — the strongest card we hold. */
  relationshipNote: string;
  today: Date;
}): Promise<AiResult<RateProposal>> {
  const { target, comparables, angle, relationshipNote, today } = input;

  const comparableBlock =
    comparables.length > 0
      ? comparables
          .map(
            (c) =>
              `- ${c.boatModel} (${c.lengthM}m), ${c.destinationName}, week of ${c.startDate.toISOString().slice(0, 10)}: €${(c.netRateCents / 100).toFixed(0)} net [${c.acquisition}]`,
          )
          .join("\n")
      : "(no comparable rates on file yet — argue from the situation rather than from benchmarks, and do not imply benchmarks exist)";

  const daysOut = Math.floor(
    (target.startDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  const occupancy = target.berthsTotal
    ? Math.round((target.berthsBooked / target.berthsTotal) * 100)
    : 0;

  return generate({
    feature: "rate-negotiator",
    effort: "high",
    maxTokens: 4000,
    cachedSystem: `${HOUSE_CONTEXT}

You draft rate proposals to charter operators on behalf of Tailorsail's
commercial team. The draft is reviewed and sent by a human — write it as
finished text they can send, not as notes.

How to write:
- Short. Six sentences or fewer. Operators run boats, not inboxes.
- Lead with what we are offering them, not with what we want. A firm booking, a filled week, a pre-commitment — that is the substance.
- Name a specific number. A message that asks them to "sharpen their best rate" wastes a round trip.
- Cite comparables as our own experience of the market, never as a claim about what a named competitor charges.
- Never disclose our sell price, our margin, or what the customer pays. Never imply we are struggling to sell, and never threaten to delist.
- Respectful and durable. We want to buy from these people for years, and a rate won by making someone feel squeezed does not survive renewal.

targetNetRateEur is what to ask for. reservationNetRateEur is the point past
which the departure stops being worth buying — it is for the human reviewer,
never mentioned in the message.`,
    system: `NEGOTIATION ANGLE: ${angle}
${ANGLE_BRIEF[angle]}

TARGET DEPARTURE
Operator: ${target.operatorName}
Boat: ${target.boatModel}, ${target.lengthM}m
Cruising ground: ${target.destinationName}
Departs: ${target.startDate.toISOString().slice(0, 10)} (${daysOut} days out)
Currently: ${target.berthsBooked}/${target.berthsTotal} berths sold (${occupancy}%)
Rate on file: €${(target.currentNetRateCents / 100).toFixed(0)} net

COMPARABLE NET RATES WE HAVE PAID
${comparableBlock}

RELATIONSHIP
${relationshipNote}`,
    prompt: `Draft the rate proposal for this departure.`,
    schema: RateProposalSchema,
  });
}
