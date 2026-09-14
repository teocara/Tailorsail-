"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { resolveTask } from "@/lib/ops";
import { requireOps } from "@/lib/session";
import { runTriage } from "@/lib/ai/triage";
import { runYield } from "@/lib/yield-run";

/** Approve, dismiss, or reply-and-close a queue item. */
export async function resolveOpsTask(formData: FormData) {
  const user = await requireOps();
  const id = String(formData.get("id"));
  const action = String(formData.get("action"));
  const note = String(formData.get("note") ?? "");

  await resolveTask(
    id,
    action === "dismiss" ? "DISMISSED" : "DONE",
    user.name,
    note || undefined,
  );

  revalidatePath("/ops");
}

/**
 * Approve a host application: create the operator and boat, and close the task.
 *
 * Deliberately creates the operator as PENDING with verification flags unset,
 * even when the extraction looked complete. Approving an application means
 * "this is worth pursuing", not "the documents are on file" — the flags get
 * set when the documents actually arrive.
 */
export async function approveHostApplication(formData: FormData) {
  await requireOps();
  const applicationId = String(formData.get("applicationId"));
  const taskId = String(formData.get("taskId") ?? "");

  const application = await db.hostApplication.findUnique({
    where: { id: applicationId },
  });
  if (!application) return;

  const extracted = JSON.parse(application.extractedJson) as {
    operator?: { name?: string; type?: string; homePort?: string; about?: string };
    boat?: {
      name?: string;
      model?: string;
      type?: string;
      lengthM?: number;
      cabins?: number;
      berths?: number;
      heads?: number;
      builtYear?: number;
      refitYear?: number | null;
      amenities?: string[];
    };
  };

  const slugBase = (application.companyName || application.contactName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const slug = `${slugBase}-${application.id.slice(-4)}`;

  const operator = await db.operator.create({
    data: {
      slug,
      name: extracted.operator?.name ?? application.companyName,
      type:
        extracted.operator?.type === "CHARTER_COMPANY"
          ? "CHARTER_COMPANY"
          : "PRIVATE_OWNER",
      homePort: extracted.operator?.homePort ?? application.homePort,
      about: extracted.operator?.about ?? application.rawSubmission.slice(0, 700),
      status: "PENDING",
      commercialTier: application.proposedTier,
    },
  });

  if (extracted.boat?.model) {
    await db.boat.create({
      data: {
        slug: `${slug}-${(extracted.boat.name ?? "boat").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: extracted.boat.name ?? "Unnamed",
        operatorId: operator.id,
        type:
          extracted.boat.type === "CATAMARAN"
            ? "CATAMARAN"
            : extracted.boat.type === "GULET"
              ? "GULET"
              : "MONOHULL",
        model: extracted.boat.model,
        lengthM: extracted.boat.lengthM ?? 12,
        cabins: extracted.boat.cabins ?? 3,
        berths: extracted.boat.berths ?? 6,
        heads: extracted.boat.heads ?? 1,
        builtYear: extracted.boat.builtYear ?? 2015,
        refitYear: extracted.boat.refitYear ?? null,
        homePort: extracted.operator?.homePort ?? application.homePort,
        amenities: JSON.stringify(extracted.boat.amenities ?? []),
      },
    });
  }

  await db.hostApplication.update({
    where: { id: applicationId },
    data: { status: "APPROVED" },
  });

  if (taskId) {
    await resolveTask(
      taskId,
      "DONE",
      "Tailorsail Ops",
      `Created operator ${operator.name} (pending document verification).`,
    );
  }

  revalidatePath("/ops");
}

/** Toggle a pricing rule from the ops console, no deploy required. */
export async function togglePricingRule(formData: FormData) {
  await requireOps();
  const id = String(formData.get("id"));

  const rule = await db.pricingRule.findUnique({ where: { id } });
  if (!rule) return;

  await db.pricingRule.update({
    where: { id },
    data: { active: !rule.active },
  });

  revalidatePath("/ops/pricing");
}

export async function runYieldNow() {
  await requireOps();
  await runYield();
  revalidatePath("/ops");
  revalidatePath("/ops/pricing");
}

export async function runTriageNow() {
  await requireOps();
  await runTriage();
  revalidatePath("/ops");
}

/** Mark AI-generated content as human-reviewed. */
export async function markContentReviewed() {
  await requireOps();
  const now = new Date();

  await db.itineraryDay.updateMany({
    where: { source: "AI_GENERATED", reviewedAt: null },
    data: { reviewedAt: now },
  });
  await db.readinessTask.updateMany({
    where: { source: "AI_GENERATED", reviewedAt: null },
    data: { reviewedAt: now },
  });

  revalidatePath("/ops");
}
