"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isConfigured } from "@/lib/ai/client";
import {
  draftConciergeReply,
  routeReply,
  categoryLabel,
} from "@/lib/ai/concierge";
import { buildCustomerQuote } from "@/lib/pricing/quote";
import type { PriceComponentInput } from "@/lib/pricing/types";
import { verificationHeadline } from "@/lib/verification";
import { openTask, PRIORITY } from "@/lib/ops";

/**
 * Send a message in a booking's concierge thread.
 *
 * The flow is: store what the traveller said, ask Claude to classify and draft
 * a reply, then let the deterministic router in lib/ai/concierge.ts decide
 * whether that reply may send. Informational answers post immediately and are
 * labelled as automated. Anything touching money, safety, a contractual
 * outcome — or anything the model was unsure about — becomes an ops task with
 * the draft attached, and the traveller is told a human is picking it up.
 *
 * The escalation path is the one that has to work. It runs identically whether
 * or not there is an API key: with no key we skip straight to it.
 */
export async function sendConciergeMessage(formData: FormData) {
  const reference = String(formData.get("reference") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!body || !reference) return;

  const booking = await db.bookingRequest.findUnique({
    where: { reference },
    include: {
      user: true,
      thread: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      departure: {
        include: {
          trip: {
            include: {
              priceComponents: true,
              itinerary: { orderBy: { dayNumber: "asc" } },
              destination: {
                include: {
                  region: { select: { name: true } },
                  readinessTasks: {
                    orderBy: [{ weeksBefore: "desc" }, { order: "asc" }],
                  },
                },
              },
              boat: { include: { operator: true } },
            },
          },
        },
      },
    },
  });

  if (!booking) return;

  const thread =
    booking.thread ??
    (await db.messageThread.create({ data: { bookingId: booking.id } }));

  await db.message.create({
    data: {
      threadId: thread.id,
      authorRole: "TRAVELER",
      authorId: booking.userId,
      body,
    },
  });

  const escalate = async (summary: string, draft: string, why: string) => {
    await openTask({
      kind: "ESCALATED_MESSAGE",
      priority: PRIORITY.HIGH,
      title: `${booking.reference} — ${summary}`,
      subjectType: "booking",
      subjectId: booking.id,
      aiSummary: why,
      aiRecommendation:
        "Review the draft, edit as needed, and reply in the thread.",
      aiDraft: draft,
    });
    revalidatePath(`/bookings/${reference}`);
    revalidatePath("/ops");
  };

  if (!isConfigured()) {
    await escalate(
      "new message from traveller",
      "",
      "No API key configured, so no draft was generated. The traveller is waiting on a human reply.",
    );
    return;
  }

  const trip = booking.departure.trip;
  const destination = trip.destination;

  const components: PriceComponentInput[] = trip.priceComponents.map((c) => ({
    label: c.label,
    amountCents: c.amountCents,
    kind: c.kind,
    payableAt: c.payableAt,
    visibility: c.visibility,
    perPerson: c.perPerson,
    note: c.note,
    order: c.order,
  }));

  // The model is given the customer-facing quote only. It cannot leak a net
  // rate it was never shown.
  const quote = buildCustomerQuote({
    sellPriceCents: booking.sellPriceCents,
    components,
    berths: booking.berths,
  });

  const result = await draftConciergeReply({
    message: body,
    context: {
      // Mapped explicitly rather than spread: the briefing type is the exact
      // set of fields the prompt is allowed to see.
      destination: {
        name: destination.name,
        regionName: destination.region.name,
        tagline: destination.tagline,
        summary: destination.summary,
        windPattern: destination.windPattern,
        bestMonths: destination.bestMonths,
        seaState: destination.seaState,
        skillLevel: destination.skillLevel,
        nauticalHighlights: destination.nauticalHighlights,
        marinaNotes: destination.marinaNotes,
        localRules: destination.localRules,
        gettingThere: destination.gettingThere,
      },
      trip: {
        name: trip.name,
        format: trip.format,
        skipper: trip.skipper,
        skillLevel: trip.skillLevel,
        durationDays: trip.durationDays,
        startPort: trip.startPort,
        endPort: trip.endPort,
      },
      boat: {
        name: trip.boat.name,
        model: trip.boat.model,
        type: trip.boat.type,
        lengthM: trip.boat.lengthM,
        berths: trip.boat.berths,
      },
      operator: {
        name: trip.boat.operator.name,
        verificationHeadline: verificationHeadline(trip.boat.operator),
      },
      booking: {
        reference: booking.reference,
        berths: booking.berths,
        startDate: booking.departure.startDate,
        endDate: booking.departure.endDate,
        status: booking.status,
      },
      priceLines: quote.lines.map((l) => ({
        label: l.label,
        amountCents: l.amountCents,
        payableAt: l.payableAt,
      })),
      totalAllInCents: quote.totalAllInCents,
      itinerary: trip.itinerary.map((d) => ({
        dayNumber: d.dayNumber,
        title: d.title,
        fromPort: d.fromPort,
        toPort: d.toPort,
      })),
      readiness: destination.readinessTasks.map((t) => ({
        phase: t.phase,
        title: t.title,
        body: t.body,
      })),
      history: (booking.thread?.messages ?? []).map((m) => ({
        author: m.authorRole,
        body: m.body,
      })),
    },
  });

  if (!result.ok) {
    await escalate(
      "new message — assistant unavailable",
      "",
      `The assistant could not draft a reply (${result.reason}). The traveller is waiting.`,
    );
    return;
  }

  const decision = routeReply(result.data);

  if (decision.action === "AUTO_SEND") {
    await db.message.create({
      data: {
        threadId: thread.id,
        authorRole: "CONCIERGE_AI",
        body: decision.reply.reply,
        aiCategory: decision.reply.category,
        aiConfidence: decision.reply.confidence,
      },
    });
    revalidatePath(`/bookings/${reference}`);
    return;
  }

  await escalate(
    categoryLabel(decision.reply.category).toLowerCase(),
    decision.reply.reply,
    `${decision.escalationReason} Traveller asked: "${body.slice(0, 200)}"`,
  );
}
