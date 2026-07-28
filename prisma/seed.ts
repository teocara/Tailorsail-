import { PrismaClient } from "@prisma/client";
import {
  computeSellPrice,
  describeComputation,
  type PricingRuleInput,
} from "../lib/pricing/yield";
import { DESTINATIONS, REGIONS } from "./seed-data/destinations";
import { BOATS, OPERATORS, TRIPS } from "./seed-data/catalogue";
import { ITINERARIES } from "./seed-data/itineraries";
import { READINESS } from "./seed-data/readiness";
import { ADD_ONS, COURSES, PRICING_RULES } from "./seed-data/extras";

const db = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date();

/**
 * Deterministic pseudo-randomness.
 *
 * Occupancy, ratings and history need to vary, but a seed that produces a
 * different database every run makes screenshots, tests and "is this a bug or
 * just today's data?" all harder than they need to be. Same input, same
 * database, every time.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function pick<T>(seed: string, items: T[]): T {
  return items[Math.floor(hash(seed) * items.length) % items.length];
}

function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * DAY_MS);
}

/** Operators charge more in peak — this is our cost, not our price. */
function seasonalCostFactor(month: number): number {
  if (month === 7 || month === 8) return 1.35;
  if (month === 6 || month === 9) return 1.12;
  if (month === 5 || month === 10) return 0.86;
  return 0.8;
}

/** Second Saturday of a month, which is how charter weeks actually run. */
function departureDate(year: number, month: number, weekIndex: number): Date {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstSaturday = 1 + ((6 - first.getUTCDay() + 7) % 7);
  return new Date(Date.UTC(year, month - 1, firstSaturday + weekIndex * 7));
}

async function main() {
  console.log("Resetting database…");

  // Order matters: children before parents. Deleting in a transaction keeps a
  // failed seed from leaving a half-empty database behind.
  await db.$transaction([
    db.aiRun.deleteMany(),
    db.opsTask.deleteMany(),
    db.message.deleteMany(),
    db.messageThread.deleteMany(),
    db.bookingReadiness.deleteMany(),
    db.bookingAddOn.deleteMany(),
    db.bookingRequest.deleteMany(),
    db.priceHistory.deleteMany(),
    db.departure.deleteMany(),
    db.addOn.deleteMany(),
    db.priceComponent.deleteMany(),
    db.itineraryDay.deleteMany(),
    db.readinessTask.deleteMany(),
    db.review.deleteMany(),
    db.trip.deleteMany(),
    db.boat.deleteMany(),
    db.operator.deleteMany(),
    db.course.deleteMany(),
    db.pricingRule.deleteMany(),
    db.destination.deleteMany(),
    db.region.deleteMany(),
    db.hostApplication.deleteMany(),
    db.user.deleteMany(),
  ]);

  // ---------------------------------------------------------------- Regions
  const regionIds = new Map<string, string>();
  for (const region of REGIONS) {
    const created = await db.region.create({ data: region });
    regionIds.set(region.slug, created.id);
  }

  // ----------------------------------------------------------- Destinations
  const destinationIds = new Map<string, string>();
  for (const d of DESTINATIONS) {
    const created = await db.destination.create({
      data: {
        slug: d.slug,
        name: d.name,
        regionId: regionIds.get(d.regionSlug)!,
        tagline: d.tagline,
        summary: d.summary,
        windPattern: d.windPattern,
        bestMonths: d.bestMonths,
        seaState: d.seaState,
        skillLevel: d.skillLevel,
        nauticalHighlights: d.nauticalHighlights,
        marinaNotes: d.marinaNotes,
        localRules: d.localRules,
        gettingThere: d.gettingThere,
        heroFrom: d.heroFrom,
        heroTo: d.heroTo,
        demandIndex: d.demandIndex,
      },
    });
    destinationIds.set(d.slug, created.id);
  }
  console.log(`  ${DESTINATIONS.length} destinations`);

  // ----------------------------------------------------- Readiness content
  let readinessCount = 0;
  for (const [slug, tasks] of Object.entries(READINESS)) {
    const destinationId = destinationIds.get(slug);
    if (!destinationId) continue;

    await db.readinessTask.createMany({
      data: tasks.map((t, index) => ({
        destinationId,
        phase: t.phase,
        title: t.title,
        body: t.body,
        weeksBefore: t.weeksBefore,
        order: index,
        source: "AI_GENERATED" as const,
        // Two grounds have been through a human pass; the rest have not, which
        // is what puts a CONTENT_REVIEW task in the queue on a fresh install.
        reviewedAt:
          slug === "dalmatia" || slug === "ibiza-formentera"
            ? daysFromNow(-30)
            : null,
      })),
    });
    readinessCount += tasks.length;
  }
  console.log(`  ${readinessCount} readiness tasks`);

  // -------------------------------------------------------------- Operators
  const operatorIds = new Map<string, string>();
  for (const o of OPERATORS) {
    const created = await db.operator.create({
      data: {
        slug: o.slug,
        name: o.name,
        type: o.type,
        homePort: o.homePort,
        about: o.about,
        status: o.status,
        licenceVerified: o.licenceVerified,
        licenceRef: o.licenceRef,
        insuranceVerified: o.insuranceVerified,
        insuranceExpiresAt:
          o.insuranceExpiresInDays !== null
            ? daysFromNow(o.insuranceExpiresInDays)
            : null,
        safetyDeclarationAt:
          o.safetyDeclaredDaysAgo !== null
            ? daysFromNow(-o.safetyDeclaredDaysAgo)
            : null,
        verifiedAt: o.status === "VERIFIED" ? daysFromNow(-120) : null,
        commercialTier: o.commercialTier,
        netRateDiscountPct: o.netRateDiscountPct,
        allotmentBerths: o.allotmentBerths,
        paymentTermsDays: o.paymentTermsDays,
        responseTimeHours: o.responseTimeHours,
        ratingAvg: o.ratingAvg,
        reviewCount: o.reviewCount,
      },
    });
    operatorIds.set(o.slug, created.id);
  }
  console.log(`  ${OPERATORS.length} operators`);

  // ------------------------------------------------------------------ Boats
  const boatIds = new Map<string, string>();
  for (const b of BOATS) {
    const created = await db.boat.create({
      data: {
        slug: b.slug,
        name: b.name,
        operatorId: operatorIds.get(b.operatorSlug)!,
        type: b.type,
        model: b.model,
        lengthM: b.lengthM,
        cabins: b.cabins,
        berths: b.berths,
        heads: b.heads,
        builtYear: b.builtYear,
        refitYear: b.refitYear,
        homePort: b.homePort,
        amenities: JSON.stringify(b.amenities),
      },
    });
    boatIds.set(b.slug, created.id);
  }
  console.log(`  ${BOATS.length} boats`);

  // ----------------------------------------------------------- Pricing rules
  const ruleRecords: PricingRuleInput[] = [];
  for (const r of PRICING_RULES) {
    const created = await db.pricingRule.create({
      data: {
        name: r.name,
        kind: r.kind,
        destinationId: r.destinationSlug
          ? destinationIds.get(r.destinationSlug)!
          : null,
        thresholdMin: r.thresholdMin,
        thresholdMax: r.thresholdMax,
        multiplier: r.multiplier,
        note: r.note,
        active: true,
      },
    });
    ruleRecords.push({
      id: created.id,
      name: created.name,
      kind: created.kind,
      destinationId: created.destinationId,
      thresholdMin: created.thresholdMin,
      thresholdMax: created.thresholdMax,
      multiplier: created.multiplier,
      active: created.active,
    });
  }
  console.log(`  ${PRICING_RULES.length} pricing rules`);

  // ---------------------------------------------------------------- Courses
  for (const c of COURSES) {
    await db.course.create({
      data: {
        slug: c.slug,
        name: c.name,
        summary: c.summary,
        level: c.level,
        format: c.format,
        durationHours: c.durationHours,
        priceCents: c.priceEur * 100,
        netRateCents: c.netRateEur * 100,
        certification: c.certification,
        syllabus: JSON.stringify(c.syllabus),
        destinationId: c.destinationSlug
          ? destinationIds.get(c.destinationSlug)!
          : null,
      },
    });
  }
  console.log(`  ${COURSES.length} courses`);

  // ---------------------------------------------------------------- Add-ons
  for (const a of ADD_ONS) {
    await db.addOn.create({
      data: {
        slug: a.slug,
        name: a.name,
        description: a.description,
        category: a.category,
        netRateCents: a.netRateEur * 100,
        sellPriceCents: a.sellPriceEur * 100,
        perPerson: a.perPerson,
        global: a.global,
        tripId: null,
      },
    });
  }
  console.log(`  ${ADD_ONS.length} add-ons`);

  // -------------------------------------------------- Trips and departures
  const tripIds = new Map<string, string>();
  let departureCount = 0;
  let historyCount = 0;
  let itineraryCount = 0;

  // Distinguished departures, so the ops queue has real examples on day one.
  const distressed = new Set(["dalmatia-bareboat", "kvarner-islands-week"]);
  const repositioning = new Set(["kvarner-shoulder-season"]);

  for (const t of TRIPS) {
    const boat = BOATS.find((b) => b.slug === t.boatSlug)!;
    const operator = OPERATORS.find((o) => o.slug === boat.operatorSlug)!;
    const destination = DESTINATIONS.find((d) => d.slug === t.destinationSlug)!;

    const trip = await db.trip.create({
      data: {
        slug: t.slug,
        name: t.name,
        summary: t.summary,
        boatId: boatIds.get(t.boatSlug)!,
        destinationId: destinationIds.get(t.destinationSlug)!,
        format: t.format,
        skipper: t.skipper,
        skillLevel: t.skillLevel,
        durationDays: t.durationDays,
        startPort: t.startPort,
        endPort: t.endPort,
        isCrewTrip: t.isCrewTrip,
        minAge: t.minAge,
        maxAge: t.maxAge,
        heroFrom: destination.heroFrom,
        heroTo: destination.heroTo,
      },
    });
    tripIds.set(t.slug, trip.id);

    // --- Itinerary
    const itinerary = ITINERARIES[t.itineraryKey] ?? [];
    await db.itineraryDay.createMany({
      data: itinerary.map((day) => ({
        tripId: trip.id,
        dayNumber: day.dayNumber,
        title: day.title,
        fromPort: day.fromPort,
        toPort: day.toPort,
        nauticalMiles: day.nauticalMiles,
        description: day.description,
        highlight: day.highlight,
        source: "AI_GENERATED" as const,
        reviewedAt: hash(`review-${t.slug}`) > 0.4 ? daysFromNow(-20) : null,
      })),
    });
    itineraryCount += itinerary.length;

    // --- Price components.
    // The CUSTOMER rows are the all-in promise. The INTERNAL row records what
    // the operator actually invoices us for the base week, and exists to prove
    // that internal data can sit on the same trip without ever reaching a
    // customer surface.
    const perPersonTax = t.destinationSlug.startsWith("ibiza") ? 350 : 250;
    const cleaning = boat.type === "CATAMARAN" ? 24000 : 16000;
    const deposit = boat.type === "CATAMARAN" ? 300000 : 200000;

    // Explicitly typed: without this, TypeScript infers a union of the exact
    // literal shapes below and rejects the skipper row unshifted afterwards.
    const components: {
      label: string;
      amountCents: number;
      kind: "INCLUDED" | "MANDATORY_EXTRA" | "REFUNDABLE_DEPOSIT" | "OPTIONAL";
      payableAt: "BOOKING" | "MARINA";
      visibility: "CUSTOMER" | "INTERNAL";
      perPerson: boolean;
      note: string;
      order: number;
    }[] = [
      {
        label: "Tourist tax",
        amountCents: perPersonTax,
        kind: "MANDATORY_EXTRA" as const,
        payableAt: "MARINA" as const,
        visibility: "CUSTOMER" as const,
        perPerson: true,
        note: "Charged per person per night by the marina, set by local authority.",
        order: 1,
      },
      {
        label: "End cleaning",
        amountCents: cleaning,
        kind: "MANDATORY_EXTRA" as const,
        payableAt: "MARINA" as const,
        visibility: "CUSTOMER" as const,
        perPerson: false,
        note: "Mandatory. Can be prepaid as an extra if you would rather not deal with it on the last morning.",
        order: 2,
      },
      {
        label: "Fuel and water",
        amountCents: 9000,
        kind: "MANDATORY_EXTRA" as const,
        payableAt: "MARINA" as const,
        visibility: "CUSTOMER" as const,
        perPerson: false,
        note: "Estimate based on a typical week. You pay what you use.",
        order: 3,
      },
      {
        label: "Refundable security deposit",
        amountCents: deposit,
        kind: "REFUNDABLE_DEPOSIT" as const,
        payableAt: "MARINA" as const,
        visibility: "CUSTOMER" as const,
        perPerson: false,
        note: "Held against damage and returned in full at the end of the week. Not part of your total.",
        order: 4,
      },
      {
        label: "Operator net rate",
        amountCents: Math.round(t.baseNetRateEur * 100 * (1 - operator.netRateDiscountPct)),
        kind: "INCLUDED" as const,
        payableAt: "BOOKING" as const,
        visibility: "INTERNAL" as const,
        perPerson: false,
        note: "Internal cost record. Never rendered on a customer surface.",
        order: 99,
      },
    ];

    if (t.skipper === "SKIPPERED") {
      components.unshift({
        label: "Skipper",
        amountCents: 0,
        kind: "INCLUDED" as const,
        payableAt: "BOOKING" as const,
        visibility: "CUSTOMER" as const,
        perPerson: false,
        note: "Included in your price. Their food is shared with the crew.",
        order: 0,
      });
    }

    await db.priceComponent.createMany({
      data: components.map((c) => ({ ...c, tripId: trip.id })),
    });

    // --- Departures across the remaining season and the next one
    for (const year of [NOW.getUTCFullYear(), NOW.getUTCFullYear() + 1]) {
      for (const month of t.months) {
        for (const weekIndex of [0, 2]) {
          const startDate = departureDate(year, month, weekIndex);
          if (startDate <= daysFromNow(3)) continue;
          if (startDate > daysFromNow(430)) continue;

          const endDate = new Date(
            startDate.getTime() + t.durationDays * DAY_MS,
          );

          const key = `${t.slug}-${year}-${month}-${weekIndex}`;
          const netRateCents = Math.round(
            t.baseNetRateEur *
              100 *
              (1 - operator.netRateDiscountPct) *
              seasonalCostFactor(month),
          );

          const berthsTotal =
            t.format === "WHOLE_BOAT" ? boat.berths : boat.berths;
          // Deterministic but varied occupancy so the yield rules, the ops
          // triage and the margin dashboard all have something to bite on.
          const berthsBooked = Math.min(
            berthsTotal,
            Math.floor(hash(`occ-${key}`) * (berthsTotal + 1)),
          );

          let acquisition: "ALLOTMENT" | "ON_REQUEST" | "DISTRESSED" | "REPOSITIONING" =
            operator.allotmentBerths > 0 ? "ALLOTMENT" : "ON_REQUEST";
          if (distressed.has(t.slug) && weekIndex === 0 && month === (t.months[0] ?? 6)) {
            acquisition = "DISTRESSED";
          }
          if (repositioning.has(t.slug) && weekIndex === 0) {
            acquisition = "REPOSITIONING";
          }

          const computation = computeSellPrice(
            {
              netRateCents,
              marginFloorPct: 0.12,
              marginCeilingPct: 0.42,
            },
            {
              destinationId: destinationIds.get(t.destinationSlug)!,
              startDate,
              berthsTotal,
              berthsBooked,
              demandIndex: destination.demandIndex,
            },
            ruleRecords,
            NOW,
          );

          const departure = await db.departure.create({
            data: {
              tripId: trip.id,
              startDate,
              endDate,
              berthsTotal,
              berthsBooked,
              netRateCents,
              sellPriceCents: computation.priceCents,
              marginFloorPct: 0.12,
              marginCeilingPct: 0.42,
              acquisition,
              priceUpdatedAt: daysFromNow(-2),
            },
          });
          departureCount += 1;

          // A short price history so the margin view has a curve and the
          // reference-price rule has something real to evaluate.
          const historyPoints = [
            { daysAgo: 45, factor: 1.0 },
            { daysAgo: 24, factor: 0.96 },
            { daysAgo: 8, factor: 1.02 },
          ];
          for (const point of historyPoints) {
            await db.priceHistory.create({
              data: {
                departureId: departure.id,
                sellPriceCents: Math.round(computation.priceCents * point.factor),
                netRateCents,
                effectiveFrom: daysFromNow(-point.daysAgo),
                reason: describeComputation(computation),
              },
            });
            historyCount += 1;
          }
        }
      }
    }
  }

  console.log(`  ${TRIPS.length} trips, ${itineraryCount} itinerary days`);
  console.log(`  ${departureCount} departures, ${historyCount} price points`);

  // ---------------------------------------------------------------- Reviews
  const reviewBodies = [
    "Booked as complete beginners and came home having actually sailed the boat. The preparation programme was the difference — we turned up knowing what was going to happen.",
    "The all-in price was genuinely all-in. Nothing appeared at the dock that we had not already seen on the booking page, which after our last charter was a relief.",
    "Our skipper rerouted us around a blow on day three without any drama and we ended up somewhere better than the plan.",
    "Boat was spotless and exactly as described. The handover took an hour and covered everything.",
    "Second time with Tailorsail. Different ground, same standard.",
  ];

  for (const o of OPERATORS.filter((op) => op.reviewCount > 0)) {
    for (let i = 0; i < 4; i++) {
      await db.review.create({
        data: {
          operatorId: operatorIds.get(o.slug)!,
          authorName: pick(`name-${o.slug}-${i}`, [
            "Elena R.",
            "Tom H.",
            "Marta S.",
            "Jack W.",
            "Sofia L.",
            "Ben C.",
          ]),
          rating: hash(`rating-${o.slug}-${i}`) > 0.25 ? 5 : 4,
          body: pick(`body-${o.slug}-${i}`, reviewBodies),
          createdAt: daysFromNow(-Math.floor(hash(`when-${o.slug}-${i}`) * 300)),
        },
      });
    }
  }

  // ------------------------------------------------------------------ Users
  const traveller = await db.user.create({
    data: {
      email: "demo@tailorsail.example",
      name: "Elena Rossi",
      role: "TRAVELER",
    },
  });
  const admin = await db.user.create({
    data: {
      email: "ops@tailorsail.example",
      name: "Tailorsail Ops",
      role: "ADMIN",
    },
  });
  await db.user.create({
    data: {
      email: "marco@example.com",
      name: "Marco Ferrari",
      role: "OPERATOR",
    },
  });

  await seedDemoBooking(traveller.id, admin.id);
  const application = await seedHostApplication();
  await seedOpsTasks(application.id);

  console.log("Seed complete.");
}

/**
 * A worked example the app can be explored from: a real booking with a frozen
 * commercial snapshot, a part-finished readiness checklist, and a concierge
 * thread showing both halves of the routing policy — one question answered
 * automatically, one escalated to a human.
 */
async function seedDemoBooking(travellerId: string, adminId: string) {
  const departure = await db.departure.findFirst({
    where: {
      trip: { slug: "dalmatia-first-week-skippered" },
      startDate: { gte: daysFromNow(20) },
    },
    orderBy: { startDate: "asc" },
    include: {
      trip: {
        include: {
          priceComponents: true,
          destination: true,
        },
      },
    },
  });

  if (!departure) {
    console.warn("  (no suitable departure found for the demo booking)");
    return;
  }

  const berths = 6;

  const customerComponents = departure.trip.priceComponents.filter(
    (c) => c.visibility === "CUSTOMER",
  );

  const extrasCents = customerComponents
    .filter((c) => c.kind === "MANDATORY_EXTRA")
    .reduce(
      (acc, c) => acc + (c.perPerson ? c.amountCents * berths : c.amountCents),
      0,
    );

  const courseAddOn = await db.addOn.findFirst({
    where: { slug: "competent-crew-onboard" },
  });
  const provisioning = await db.addOn.findFirst({
    where: { slug: "provisioning-starter" },
  });

  const addOnRows = [
    { addOn: courseAddOn!, quantity: 1 },
    { addOn: provisioning!, quantity: 1 },
  ];

  const addOnsCents = addOnRows.reduce(
    (acc, r) =>
      acc +
      r.addOn.sellPriceCents * (r.addOn.perPerson ? berths : 1) * r.quantity,
    0,
  );
  const addOnsNetCents = addOnRows.reduce(
    (acc, r) =>
      acc + r.addOn.netRateCents * (r.addOn.perPerson ? berths : 1) * r.quantity,
    0,
  );

  const totalCents = departure.sellPriceCents + extrasCents + addOnsCents;

  const booking = await db.bookingRequest.create({
    data: {
      reference: "TS-8F2K",
      departureId: departure.id,
      userId: travellerId,
      berths,
      status: "CONFIRMED",
      experienceNote:
        "Two of us have done a flotilla week before. The other four have never been on a yacht.",
      notes: "One vegetarian, and my brother gets seasick — any advice welcome.",
      netRateCents: departure.netRateCents,
      sellPriceCents: departure.sellPriceCents,
      extrasCents,
      addOnsCents,
      totalCents,
      // The margin we actually booked, frozen. A later yield run cannot
      // retroactively change what we think we earned on this customer.
      marginCents:
        departure.sellPriceCents + addOnsCents - departure.netRateCents - addOnsNetCents,
    },
  });

  for (const row of addOnRows) {
    await db.bookingAddOn.create({
      data: {
        bookingId: booking.id,
        addOnId: row.addOn.id,
        quantity: row.quantity,
        sellPriceCents:
          row.addOn.sellPriceCents * (row.addOn.perPerson ? berths : 1),
        netRateCents:
          row.addOn.netRateCents * (row.addOn.perPerson ? berths : 1),
      },
    });
  }

  // Readiness checklist, partly worked through.
  const tasks = await db.readinessTask.findMany({
    where: { destinationId: departure.trip.destinationId },
    orderBy: [{ weeksBefore: "desc" }, { order: "asc" }],
  });

  for (const [index, task] of tasks.entries()) {
    await db.bookingReadiness.create({
      data: {
        bookingId: booking.id,
        taskId: task.id,
        completedAt: index < 3 ? daysFromNow(-(10 - index)) : null,
      },
    });
  }

  // Concierge thread — one auto-answered, one escalated.
  const thread = await db.messageThread.create({
    data: { bookingId: booking.id },
  });

  const messages = [
    {
      authorRole: "TRAVELER" as const,
      authorId: travellerId,
      body: "What should we actually pack? Two of the group have never been on a boat and keep asking me.",
      aiCategory: null,
      aiConfidence: null,
      minutesAgo: 2880,
    },
    {
      authorRole: "CONCIERGE_AI" as const,
      authorId: null,
      body: "Soft bags rather than suitcases is the big one — yacht lockers are shaped for holdalls that collapse, and a hard shell ends up living on somebody's bunk all week. Beyond that: deck shoes or trainers with a pale sole (dark soles mark the deck and the base charges for it), a light fleece and a windproof layer for the evenings at anchor, and proper sun protection. August afternoons in Dalmatia are around 30 degrees but the same night on the water is not, and that catches people out every year. Your full packing list is in the PACK phase of your readiness programme.",
      aiCategory: "PACKING_AND_KIT",
      aiConfidence: 0.94,
      minutesAgo: 2878,
    },
    {
      authorRole: "TRAVELER" as const,
      authorId: travellerId,
      body: "Thanks. One more — if the bora blows and we can't get across to Vis, do we get anything back for the days we lose?",
      aiCategory: null,
      aiConfidence: null,
      minutesAgo: 180,
    },
    {
      authorRole: "CONCIERGE_HUMAN" as const,
      authorId: adminId,
      body: "Good question, and one I want to answer properly rather than quickly. Short version: weather routing changes are normal and your skipper will reroute rather than cancel — a bora week in Dalmatia usually means the southern islands instead of Vis, not a lost day. Refunds only come into play if a departure is cancelled outright, which is rare. I'm sending you the exact cancellation terms for your booking now so you have them in writing.",
      aiCategory: null,
      aiConfidence: null,
      minutesAgo: 120,
    },
  ];

  for (const m of messages) {
    await db.message.create({
      data: {
        threadId: thread.id,
        authorRole: m.authorRole,
        authorId: m.authorId,
        body: m.body,
        aiCategory: m.aiCategory,
        aiConfidence: m.aiConfidence,
        createdAt: new Date(NOW.getTime() - m.minutesAgo * 60 * 1000),
      },
    });
  }

  console.log(`  demo booking ${booking.reference} with concierge thread`);
}

async function seedHostApplication() {
  return db.hostApplication.create({
    data: {
      contactName: "Marco Ferrari",
      contactEmail: "marco@example.com",
      companyName: "Marco Ferrari (private owner)",
      homePort: "Marina Corricella, Procida",
      rawSubmission:
        "Hi — I have a Grand Soleil 43 which I keep in Corricella on Procida. She's a 2015 boat, refitted in 2022, three cabins and two heads, sleeps six comfortably. I sail her myself most weekends and I'd like to charter her out skippered for maybe eight or ten weeks over the summer. I know the Gulf of Naples extremely well — Procida, Ischia, Capri, and up to Ponza when the weather is right. I have full insurance through my own broker. Happy to answer any questions.",
      extractedJson: JSON.stringify({
        operator: {
          name: "Marco Ferrari",
          type: "PRIVATE_OWNER",
          homePort: "Marina Corricella, Procida",
        },
        boat: {
          name: "Corricella",
          model: "Grand Soleil 43",
          type: "MONOHULL",
          lengthM: 13.2,
          cabins: 3,
          berths: 6,
          heads: 2,
          builtYear: 2015,
          refitYear: 2022,
        },
        suggestedTrip: {
          name: "Procida and the Gulf, with the owner",
          format: "WHOLE_BOAT",
          skipper: "SKIPPERED",
          skillLevel: "FIRST_TIMER",
          durationDays: 7,
        },
      }),
      gapsJson: JSON.stringify([
        "We need your charter licence reference — a private owner chartering commercially in Italy needs one, and we cannot list you without it.",
        "Your insurance is mentioned but we need the certificate itself, showing an expiry date and that it covers commercial charter rather than private use only.",
        "We need a signed safety equipment declaration for Corricella covering liferaft servicing date, flares, and lifejacket count.",
        "You mention running eight to ten weeks — please confirm which specific weeks, so we can price and list them.",
      ]),
      proposedTier: "STANDARD",
      tierRationale:
        "Single boat, no volume history with us, and no allotment offered. Standard is the right starting point; worth revisiting after a season if the Procida berth proves as useful as it looks, since we have no other supply on that island.",
      status: "SUBMITTED",
    },
  });
}

/**
 * The starting ops queue.
 *
 * Deliberately seeded across several kinds so the console demonstrates the
 * whole workflow rather than one row type. The triage sweep (`npm run
 * triage:run`) would find most of these itself — these exist so the queue is
 * populated the moment someone opens it.
 */
async function seedOpsTasks(hostApplicationId: string) {
  const kvarner = await db.operator.findFirst({
    where: { slug: "kvarner-yachting" },
  });
  const booking = await db.bookingRequest.findFirst({
    where: { reference: "TS-8F2K" },
  });
  const distressedDeparture = await db.departure.findFirst({
    where: { acquisition: "DISTRESSED" },
    include: { trip: { include: { destination: true, boat: { include: { operator: true } } } } },
    orderBy: { startDate: "asc" },
  });

  if (kvarner?.insuranceExpiresAt) {
    await db.opsTask.create({
      data: {
        kind: "EXPIRING_DOCUMENT",
        priority: 90,
        title: "Kvarner Yachting — insurance expires in under 30 days",
        subjectType: "operator",
        subjectId: kvarner.id,
        aiSummary: `Cover on file expires ${kvarner.insuranceExpiresAt.toISOString().slice(0, 10)}. Their trust badge has already downgraded to a caution, and on the expiry date their trips drop out of search automatically.`,
        aiRecommendation:
          "Request the renewal certificate now. There are live departures on their boats after the expiry date, so a gap means cancelling rather than just delisting.",
        aiDraft:
          "Hi — our records show your insurance certificate expires shortly. Could you send the renewal through when you have it? We hold your listings live right up to the expiry date and then have to pause them automatically, so getting it early saves us both the disruption. Thanks.",
      },
    });
  }

  // Pointed at the application rather than the operator, so the queue can
  // actually run the approve-and-create flow rather than just describing it.
  {
    await db.opsTask.create({
      data: {
        kind: "OPERATOR_APPROVAL",
        priority: 55,
        title: "Marco Ferrari — new owner application, 4 gaps",
        subjectType: "hostApplication",
        subjectId: hostApplicationId,
        aiSummary:
          "Private owner, one Grand Soleil 43 in Corricella on Procida. Listing extracted cleanly. Four verification gaps outstanding: charter licence, commercial insurance certificate, safety declaration, and confirmed availability weeks.",
        aiRecommendation:
          "Approve at STANDARD tier once documents land. Worth taking on — we have no other supply on Procida and his berth is a genuinely scarce asset.",
        aiDraft:
          "Hi Marco — thanks for the application, and the boat looks lovely. Four things before we can list you: your charter licence reference; the insurance certificate itself showing the expiry date and that it covers commercial charter rather than private use; a signed safety equipment declaration for Corricella; and the specific weeks you would like to make available. Send those over and we will get you live.",
      },
    });
  }

  if (booking) {
    await db.opsTask.create({
      data: {
        kind: "ESCALATED_MESSAGE",
        priority: 70,
        title: "TS-8F2K — refund question if bora prevents the Vis crossing",
        subjectType: "booking",
        subjectId: booking.id,
        aiSummary:
          "Traveller asked whether they get anything back if weather stops them reaching Vis. Classified CANCELLATION_OR_REFUND, which never auto-sends. Draft prepared.",
        aiRecommendation:
          "Answer directly and attach the cancellation terms. The honest answer is reassuring — a bora week means a rerouted itinerary rather than lost days — so this is a trust-building reply rather than a difficult one.",
        aiDraft:
          "Weather routing changes are a normal part of a Dalmatian week and your skipper will reroute rather than cancel — a bora usually means the southern islands instead of Vis, not a lost day. Refunds apply only if a departure is cancelled outright, which is rare. I am sending the exact cancellation terms for your booking so you have them in writing.",
        status: "DONE",
        resolvedAt: new Date(NOW.getTime() - 100 * 60 * 1000),
        resolvedBy: "Tailorsail Ops",
        resolution: "Answered with terms attached.",
      },
    });
  }

  if (distressedDeparture) {
    await db.opsTask.create({
      data: {
        kind: "RATE_OPPORTUNITY",
        priority: 70,
        title: `Distressed: ${distressedDeparture.trip.name} — ${distressedDeparture.startDate.toISOString().slice(0, 10)}`,
        subjectType: "departure",
        subjectId: distressedDeparture.id,
        aiSummary: `${distressedDeparture.trip.destination.name}, ${distressedDeparture.berthsBooked}/${distressedDeparture.berthsTotal} sold. ${distressedDeparture.trip.boat.operator.name} is carrying an empty week that is worth far less to them than to us.`,
        aiRecommendation:
          "Offer to take the week at a reduced net rate, then reprice to move it. Frame it as solving their problem rather than exploiting it — we want to buy from these people again next season.",
        aiDraft:
          "Hi — we have noticed this week is still open and we would like to take it off your hands as a firm booking rather than leave it to chance. We can commit today at a reduced rate given how close in we are. If that works, we will have it filled within the fortnight. Let me know.",
      },
    });
  }

  await db.opsTask.create({
    data: {
      kind: "CONTENT_REVIEW",
      priority: 30,
      title: "Generated readiness programmes awaiting a human pass",
      subjectType: "content",
      subjectId: "unreviewed",
      aiSummary:
        "Four destinations have AI-generated readiness programmes that have not been read by a human. Dalmatia and Ibiza have been reviewed.",
      aiRecommendation:
        "Spot-check the location-specific claims first — permits, wind names, approach details. Those are the ones that would be embarrassing if wrong, and they are also the ones carrying the value.",
    },
  });

  console.log("  ops queue seeded");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
