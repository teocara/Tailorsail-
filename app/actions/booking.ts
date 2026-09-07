"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildCustomerQuote } from "@/lib/pricing/quote";
import type { PriceComponentInput } from "@/lib/pricing/types";
import { openTask } from "@/lib/ops";

const BookingSchema = z.object({
  departureId: z.string().min(1),
  berths: z.coerce.number().int().min(1).max(20),
  addOnIds: z.array(z.string()).default([]),
  name: z.string().min(2).max(120),
  email: z.email(),
  experienceNote: z.string().max(1000).default(""),
  notes: z.string().max(1000).default(""),
});

/** Human-friendly booking reference. Avoids I/O/0/1 so it survives a phone call. */
function makeReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `TS-${out}`;
}

/**
 * Take a booking request.
 *
 * The important part is the commercial snapshot. Net rate, sell price, add-on
 * cost and the resulting margin are all copied onto the booking row at this
 * moment. The yield engine reprices departures continuously, and without the
 * freeze a booking taken today would appear to have earned a different margin
 * tomorrow — which would make the margin dashboard a fiction and the customer's
 * total unstable.
 */
export async function createBooking(formData: FormData) {
  const parsed = BookingSchema.safeParse({
    departureId: formData.get("departureId"),
    berths: formData.get("berths"),
    addOnIds: formData.getAll("addOnIds").map(String),
    name: formData.get("name"),
    email: formData.get("email"),
    experienceNote: formData.get("experienceNote") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(
      `/trips?error=${encodeURIComponent(`Could not read the booking form: ${first.message}`)}`,
    );
  }

  const input = parsed.data;

  const departure = await db.departure.findUnique({
    where: { id: input.departureId },
    include: {
      trip: { include: { priceComponents: true, destination: true } },
    },
  });

  if (!departure) {
    redirect(`/trips?error=${encodeURIComponent("That departure no longer exists.")}`);
  }

  const free = departure.berthsTotal - departure.berthsBooked;
  if (input.berths > free) {
    redirect(
      `/trips/${departure.trip.slug}?error=${encodeURIComponent(
        `Only ${free} berth${free === 1 ? "" : "s"} left on that departure.`,
      )}`,
    );
  }

  const addOns =
    input.addOnIds.length > 0
      ? await db.addOn.findMany({ where: { id: { in: input.addOnIds } } })
      : [];

  const components: PriceComponentInput[] = departure.trip.priceComponents.map(
    (c) => ({
      label: c.label,
      amountCents: c.amountCents,
      kind: c.kind,
      payableAt: c.payableAt,
      visibility: c.visibility,
      perPerson: c.perPerson,
      note: c.note,
      order: c.order,
    }),
  );

  // The customer-facing total comes from the same function the trip page used,
  // so the figure they agreed to is the figure recorded.
  const quote = buildCustomerQuote({
    sellPriceCents: departure.sellPriceCents,
    components,
    addOns: addOns.map((a) => ({
      id: a.id,
      name: a.name,
      sellPriceCents: a.sellPriceCents,
      perPerson: a.perPerson,
    })),
    berths: input.berths,
  });

  const addOnsCents = addOns.reduce(
    (acc, a) => acc + a.sellPriceCents * (a.perPerson ? input.berths : 1),
    0,
  );
  const addOnsNetCents = addOns.reduce(
    (acc, a) => acc + a.netRateCents * (a.perPerson ? input.berths : 1),
    0,
  );

  const user =
    (await db.user.findUnique({ where: { email: input.email } })) ??
    (await db.user.create({
      data: { email: input.email, name: input.name, role: "TRAVELER" },
    }));

  const reference = makeReference();

  const booking = await db.bookingRequest.create({
    data: {
      reference,
      departureId: departure.id,
      userId: user.id,
      berths: input.berths,
      status: "REQUESTED",
      experienceNote: input.experienceNote,
      notes: input.notes,
      // --- Frozen commercial snapshot
      netRateCents: departure.netRateCents,
      sellPriceCents: departure.sellPriceCents,
      extrasCents: quote.totalAllInCents - departure.sellPriceCents - addOnsCents,
      addOnsCents,
      totalCents: quote.totalAllInCents,
      marginCents:
        departure.sellPriceCents +
        addOnsCents -
        departure.netRateCents -
        addOnsNetCents,
    },
  });

  for (const addOn of addOns) {
    await db.bookingAddOn.create({
      data: {
        bookingId: booking.id,
        addOnId: addOn.id,
        quantity: 1,
        sellPriceCents: addOn.sellPriceCents * (addOn.perPerson ? input.berths : 1),
        netRateCents: addOn.netRateCents * (addOn.perPerson ? input.berths : 1),
      },
    });
  }

  await db.departure.update({
    where: { id: departure.id },
    data: { berthsBooked: { increment: input.berths } },
  });

  // Attach the destination's readiness programme so the checklist is populated
  // the moment they land on the confirmation page.
  const tasks = await db.readinessTask.findMany({
    where: { destinationId: departure.trip.destinationId },
    orderBy: [{ weeksBefore: "desc" }, { order: "asc" }],
  });

  if (tasks.length > 0) {
    await db.bookingReadiness.createMany({
      data: tasks.map((task) => ({ bookingId: booking.id, taskId: task.id })),
    });
  }

  await db.messageThread.create({ data: { bookingId: booking.id } });

  // A new request needs a human to confirm it with the operator. In a
  // two-person company that has to be a queue item, not an email somebody
  // might miss.
  await openTask({
    kind: "BOOKING_EXCEPTION",
    title: `${reference} — new booking request to confirm`,
    subjectType: "booking",
    subjectId: booking.id,
    aiSummary: `${input.berths} berths on ${departure.trip.name}, departing ${departure.startDate.toISOString().slice(0, 10)}. ${addOns.length} add-on${addOns.length === 1 ? "" : "s"} selected.`,
    aiRecommendation:
      "Confirm availability with the operator, then move the booking to CONFIRMED.",
  });

  revalidatePath("/ops");
  redirect(`/bookings/${reference}`);
}

/** Toggle a readiness task. Small, but it is the checklist's whole point. */
export async function toggleReadiness(formData: FormData) {
  const id = String(formData.get("id"));
  const reference = String(formData.get("reference"));

  const row = await db.bookingReadiness.findUnique({ where: { id } });
  if (!row) return;

  await db.bookingReadiness.update({
    where: { id },
    data: { completedAt: row.completedAt ? null : new Date() },
  });

  revalidatePath(`/bookings/${reference}`);
}
