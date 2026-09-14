import { generate, HOUSE_CONTEXT, type AiResult } from "./client";
import { ExtractedListingSchema, type ExtractedListing } from "./schemas";

/**
 * Operator onboarding without a partnerships team.
 *
 * An owner pastes however they describe their boat — a paragraph, a spec
 * sheet, an old brochure — plus whatever documents they have. This turns it
 * into a structured draft listing, names what is missing before we could
 * verify them, and proposes commercial terms. A founder then approves or
 * edits in one screen instead of running a discovery call.
 *
 * The gaps list is the part that earns its keep. A listing we cannot verify is
 * a listing we cannot sell, and telling the operator exactly which document is
 * missing up front removes a week of back-and-forth per operator.
 */
export async function parseListing(input: {
  submission: string;
  documents?: string;
  today: Date;
}): Promise<AiResult<ExtractedListing>> {
  const { submission, documents, today } = input;

  return generate({
    feature: "parse-listing",
    effort: "medium",
    cachedSystem: `${HOUSE_CONTEXT}

You process applications from charter companies and private boat owners who
want to list with Tailorsail. You extract a structured listing from whatever
they wrote, and you assess what is still needed.

Extraction rules:
- Extract only what is stated or unambiguously implied. Do not fill a field with a plausible guess — an invented build year or berth count becomes a customer-facing lie.
- Where a required field genuinely is not stated, choose the most conservative reading and add the missing detail to verificationGaps.
- A private owner with one boat is PRIVATE_OWNER even if they trade under a name.
- Skill level describes the guest, not the operator: BAREBOAT with no mention of qualifications implies at least COMPETENT_CREW.

verificationGaps must name, specifically, every document or fact we still need
before this operator could be marked verified. We require: a charter licence
reference, an insurance certificate with an expiry date, and a safety
equipment declaration. Also flag anything internally inconsistent — more
berths than cabins can plausibly sleep, a refit before the build year, a
catamaran described with one hull. Write each gap as a sentence we could send
to the operator unedited.

Commercial tier is a proposal for a human to approve, not a decision:
- STANDARD: the default. One or two boats, no volume history, no commitment offered.
- PREFERRED: a real fleet, or an operator explicitly offering allotment, flexibility on rates, or off-season capacity.
- EXCLUSIVE: only where they offer genuine exclusivity, a substantial pre-committed allotment, or unusually strong inventory in a cruising ground where we are thin.
Justify the tier from what they actually wrote. Never mention rates, margin, or
what Tailorsail pays — that is internal, and this text may be shown to the
operator.`,
    system: `Today is ${today.toISOString().slice(0, 10)}. Use it to judge whether any stated insurance expiry is already in the past — if it is, that is a verification gap.`,
    prompt: `OPERATOR SUBMISSION
${submission}

${documents?.trim() ? `SUPPORTING DOCUMENTS (pasted text)\n${documents}` : "SUPPORTING DOCUMENTS: none provided."}`,
    schema: ExtractedListingSchema,
  });
}
