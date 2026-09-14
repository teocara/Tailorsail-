"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { isConfigured } from "@/lib/ai/client";
import { parseListing } from "@/lib/ai/parse-listing";
import { openTask } from "@/lib/ops";

const HostSchema = z.object({
  contactName: z.string().min(2).max(120),
  contactEmail: z.email(),
  companyName: z.string().max(160).default(""),
  homePort: z.string().min(2).max(120),
  submission: z.string().min(60).max(8000),
  documents: z.string().max(12000).default(""),
});

/**
 * Operator onboarding, without a partnerships team.
 *
 * The owner writes however they naturally would; Claude turns that into a
 * structured draft listing and — the part that earns its keep — names exactly
 * which documents are still missing before we could verify them. A founder
 * then approves or edits in one screen instead of running a discovery call and
 * three rounds of email.
 *
 * Nothing here creates a live Operator. The application lands in the ops queue
 * with the extraction sitting beside the raw submission, so a human can check
 * the model against the source before anything becomes bookable.
 */
export async function submitHostApplication(formData: FormData) {
  const parsed = HostSchema.safeParse({
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    companyName: formData.get("companyName") ?? "",
    homePort: formData.get("homePort"),
    submission: formData.get("submission"),
    documents: formData.get("documents") ?? "",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    redirect(
      `/host?error=${encodeURIComponent(
        issue.path[0] === "submission"
          ? "Please tell us a bit more about the boat — at least a couple of sentences."
          : `Please check the ${String(issue.path[0])} field.`,
      )}`,
    );
  }

  const input = parsed.data;

  const result = isConfigured()
    ? await parseListing({
        submission: input.submission,
        documents: input.documents,
        today: new Date(),
      })
    : null;

  // Without a key — or if the model is unavailable — we still take the
  // application. It simply arrives unextracted, and the ops task says so.
  const extracted = result?.ok ? result.data : null;

  const application = await db.hostApplication.create({
    data: {
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      companyName: input.companyName || input.contactName,
      homePort: input.homePort,
      rawSubmission: input.submission,
      extractedJson: extracted ? JSON.stringify(extracted) : "{}",
      gapsJson: extracted ? JSON.stringify(extracted.verificationGaps) : "[]",
      proposedTier: extracted?.proposedTier ?? "STANDARD",
      tierRationale: extracted?.tierRationale ?? "",
      status: "SUBMITTED",
    },
  });

  await openTask({
    kind: "OPERATOR_APPROVAL",
    title: `${input.companyName || input.contactName} — new listing application`,
    subjectType: "hostApplication",
    subjectId: application.id,
    aiSummary: extracted
      ? `${extracted.boat.model}, ${extracted.boat.lengthM}m ${extracted.boat.type.toLowerCase()}, ${extracted.boat.berths} berths, based at ${extracted.operator.homePort}. ${extracted.verificationGaps.length} verification gap${extracted.verificationGaps.length === 1 ? "" : "s"} outstanding.`
      : isConfigured()
        ? "The assistant could not extract a listing from this submission. Read the raw text and enter the details by hand."
        : "No API key configured, so the submission was stored without extraction. Read the raw text and enter the details by hand.",
    aiRecommendation: extracted
      ? `Proposed tier: ${extracted.proposedTier}. ${extracted.tierRationale}`
      : "Review manually.",
    aiDraft: extracted
      ? `Hi ${input.contactName} — thanks for the application. Before we can list you we need:\n\n${extracted.verificationGaps.map((g) => `• ${g}`).join("\n")}\n\nSend those over and we will get you live.`
      : "",
  });

  revalidatePath("/ops");
  redirect(`/host/submitted?id=${application.id}`);
}
