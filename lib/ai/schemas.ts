import { z } from "zod";

/**
 * Output schemas for every AI capability.
 *
 * These are the contract between the model and the database. Structured
 * outputs constrain generation to the JSON Schema derived from these, and the
 * client re-validates the result before returning it — so a field that would
 * break a page cannot be written by a bad generation.
 *
 * Keep them tight. `z.string()` where an enum belongs is how a model ends up
 * inventing a fourth readiness phase that no UI renders.
 */

export const SkillLevelSchema = z.enum([
  "FIRST_TIMER",
  "COMPETENT_CREW",
  "SKIPPER",
]);

// --- Itinerary generation -------------------------------------------------

export const ItineraryDaySchema = z.object({
  dayNumber: z.int().min(1).max(21),
  title: z.string().min(3).max(80),
  fromPort: z.string().min(2).max(60),
  toPort: z.string().min(2).max(60),
  nauticalMiles: z.number().min(0).max(120),
  description: z.string().min(40).max(700),
  highlight: z.string().min(5).max(160),
});

export const ItinerarySchema = z.object({
  days: z.array(ItineraryDaySchema).min(3).max(21),
});

export type GeneratedItinerary = z.infer<typeof ItinerarySchema>;

// --- Readiness programme --------------------------------------------------

export const ReadinessPhaseSchema = z.enum([
  "BOOK",
  "PREPARE",
  "PACK",
  "ARRIVE",
]);

export const ReadinessTaskSchema = z.object({
  phase: ReadinessPhaseSchema,
  title: z.string().min(4).max(90),
  body: z.string().min(40).max(600),
  weeksBefore: z.int().min(0).max(26),
});

export const ReadinessProgrammeSchema = z.object({
  tasks: z.array(ReadinessTaskSchema).min(6).max(20),
});

export type GeneratedReadiness = z.infer<typeof ReadinessProgrammeSchema>;

// --- Operator listing extraction ------------------------------------------

export const ExtractedListingSchema = z.object({
  operator: z.object({
    name: z.string().min(2).max(120),
    type: z.enum(["CHARTER_COMPANY", "PRIVATE_OWNER"]),
    homePort: z.string().min(2).max(80),
    about: z.string().min(20).max(800),
    licenceRef: z.string().max(60).nullable(),
    insuranceExpiresAt: z
      .string()
      .describe("ISO 8601 date, or null if not stated")
      .nullable(),
  }),
  boat: z.object({
    name: z.string().min(1).max(80),
    model: z.string().min(2).max(80),
    type: z.enum(["MONOHULL", "CATAMARAN", "GULET"]),
    lengthM: z.number().min(5).max(60),
    cabins: z.int().min(1).max(12),
    berths: z.int().min(1).max(30),
    heads: z.int().min(0).max(8),
    builtYear: z.int().min(1950).max(2035),
    refitYear: z.int().min(1950).max(2035).nullable(),
    amenities: z.array(z.string().max(60)).max(25),
  }),
  suggestedTrip: z.object({
    name: z.string().min(4).max(100),
    summary: z.string().min(30).max(400),
    format: z.enum(["WHOLE_BOAT", "CABIN_CHARTER", "FLOTILLA"]),
    skipper: z.enum(["SKIPPERED", "BAREBOAT"]),
    skillLevel: SkillLevelSchema,
    durationDays: z.int().min(2).max(21),
    startPort: z.string().min(2).max(60),
    endPort: z.string().min(2).max(60),
  }),
  /**
   * What is missing before this operator can be verified. This is the whole
   * point of the extraction — a listing we cannot verify is a listing we
   * cannot sell, and naming the gap is faster than a back-and-forth.
   */
  verificationGaps: z.array(z.string().min(5).max(200)).max(12),
  proposedTier: z.enum(["STANDARD", "PREFERRED", "EXCLUSIVE"]),
  tierRationale: z.string().min(20).max(500),
});

export type ExtractedListing = z.infer<typeof ExtractedListingSchema>;

// --- Concierge ------------------------------------------------------------

/**
 * Categories are split by *who is allowed to answer*, not by topic area.
 * Everything in the second group commits Tailorsail to money, safety or a
 * contractual outcome, and none of it is auto-sendable.
 */
export const ConciergeCategorySchema = z.enum([
  // Informational — the model may answer directly.
  "WEATHER_AND_CONDITIONS",
  "PACKING_AND_KIT",
  "ITINERARY_AND_ROUTE",
  "SKILL_AND_EXPERIENCE",
  "WHATS_INCLUDED",
  "LOGISTICS_AND_ARRIVAL",
  // Escalate — a human decides.
  "PRICE_OR_PAYMENT",
  "CANCELLATION_OR_REFUND",
  "SAFETY_OR_MEDICAL",
  "COMPLAINT",
  "BOOKING_CHANGE",
  "OTHER",
]);

export type ConciergeCategory = z.infer<typeof ConciergeCategorySchema>;

export const ConciergeReplySchema = z.object({
  category: ConciergeCategorySchema,
  confidence: z.number().min(0).max(1),
  reply: z.string().min(20).max(2000),
  /**
   * The model's own judgement that a human should handle this. It can only
   * ever *add* caution — the deterministic gate in concierge.ts decides
   * auto-send, and it ignores a `false` here for escalate-only categories.
   */
  needsHuman: z.boolean(),
  reason: z.string().min(10).max(400),
});

export type ConciergeReply = z.infer<typeof ConciergeReplySchema>;

// --- Natural-language trip finder -----------------------------------------

export const TripFinderSchema = z.object({
  filters: z.object({
    destinationSlug: z.string().max(60).nullable(),
    regionSlug: z.string().max(60).nullable(),
    month: z.int().min(1).max(12).nullable(),
    skillLevel: SkillLevelSchema.nullable(),
    format: z.enum(["WHOLE_BOAT", "CABIN_CHARTER", "FLOTILLA"]).nullable(),
    skipper: z.enum(["SKIPPERED", "BAREBOAT"]).nullable(),
    boatType: z.enum(["MONOHULL", "CATAMARAN", "GULET"]).nullable(),
    maxPricePerPersonEur: z.number().min(0).max(20000).nullable(),
    minBerthsAvailable: z.int().min(1).max(30).nullable(),
    crewOnly: z.boolean().nullable(),
  }),
  /** One sentence shown above the results explaining the interpretation. */
  rationale: z.string().min(10).max(300),
});

export type TripFinderResult = z.infer<typeof TripFinderSchema>;

// --- Rate negotiation -----------------------------------------------------

export const RateProposalSchema = z.object({
  targetNetRateEur: z.number().min(0).max(100000),
  /** The message to send the operator. Never sent without human approval. */
  message: z.string().min(60).max(2000),
  /** Why this number, stated in terms of the comparables provided. */
  justification: z.string().min(30).max(800),
  /** Walk-away point, so the founder knows the floor before replying. */
  reservationNetRateEur: z.number().min(0).max(100000),
});

export type RateProposal = z.infer<typeof RateProposalSchema>;

// --- Pricing narration ----------------------------------------------------

export const PriceNarrationSchema = z.object({
  headline: z.string().min(10).max(140),
  explanation: z.string().min(40).max(700),
  recommendation: z.enum(["APPLY", "HOLD", "REVIEW"]),
});

export type PriceNarration = z.infer<typeof PriceNarrationSchema>;
