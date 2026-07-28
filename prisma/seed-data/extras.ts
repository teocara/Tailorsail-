/**
 * Add-ons, courses and pricing rules.
 *
 * Add-ons carry their own cost as well as their own price, because attach
 * margin is a number we want to see rather than assume. Lifting attach rate is
 * the most durable of the price-side levers: it raises order value by adding
 * something the traveller actually wanted, rather than by charging more for
 * the same week.
 */

export interface AddOnSeed {
  slug: string;
  name: string;
  description: string;
  category: "COURSE" | "CREW" | "PROVISIONING" | "TRANSFER" | "SERVICE";
  netRateEur: number;
  sellPriceEur: number;
  perPerson: boolean;
  global: boolean;
}

export const ADD_ONS: AddOnSeed[] = [
  {
    slug: "competent-crew-onboard",
    name: "Competent Crew course, aboard",
    description:
      "Five days of structured instruction folded into the week's sailing, with a recognised certificate at the end. You do the same trip; you just leave able to sail it yourself.",
    category: "COURSE",
    netRateEur: 180,
    sellPriceEur: 340,
    perPerson: true,
    global: true,
  },
  {
    slug: "first-night-briefing",
    name: "Extended first-night briefing",
    description:
      "Two hours with the skipper before you leave: the boat systems, the week's weather, the route options, and everyone's job. Worth it if half your crew has never been aboard.",
    category: "COURSE",
    netRateEur: 60,
    sellPriceEur: 140,
    perPerson: false,
    global: true,
  },
  {
    slug: "hostess",
    name: "Hostess aboard",
    description:
      "Cooking, provisioning and keeping the boat civilised for the week. The single upgrade most groups say they would repeat.",
    category: "CREW",
    netRateEur: 950,
    sellPriceEur: 1490,
    perPerson: false,
    global: true,
  },
  {
    slug: "extra-skipper-day",
    name: "Skipper for the first two days",
    description:
      "For bareboat crews who hold the licence but would like company for the first passages. The skipper leaves the boat on day three.",
    category: "CREW",
    netRateEur: 420,
    sellPriceEur: 690,
    perPerson: false,
    global: true,
  },
  {
    slug: "provisioning-full",
    name: "Full provisioning pack",
    description:
      "Breakfasts, lunches, snacks and drinks aboard before you arrive, sized to your crew. Saves the first two hours of the holiday being spent in a supermarket.",
    category: "PROVISIONING",
    netRateEur: 95,
    sellPriceEur: 155,
    perPerson: true,
    global: true,
  },
  {
    slug: "provisioning-starter",
    name: "Starter provisioning",
    description:
      "The first evening and the first morning covered — bread, coffee, fruit, water and something for dinner. You do the rest of the shop at your own pace.",
    category: "PROVISIONING",
    netRateEur: 38,
    sellPriceEur: 69,
    perPerson: true,
    global: true,
  },
  {
    slug: "airport-transfer",
    name: "Airport transfer",
    description:
      "Private transfer from the airport to the marina and back at the end of the week, timed to your flights.",
    category: "TRANSFER",
    netRateEur: 55,
    sellPriceEur: 98,
    perPerson: false,
    global: true,
  },
  {
    slug: "end-cleaning-prepaid",
    name: "End cleaning, prepaid",
    description:
      "Settle the mandatory end-of-charter cleaning now rather than at the dock on the last morning. Same amount, one less thing.",
    category: "SERVICE",
    netRateEur: 150,
    sellPriceEur: 180,
    perPerson: false,
    global: true,
  },
  {
    slug: "paddleboard-hire",
    name: "Paddleboard for the week",
    description:
      "Two inflatable boards aboard for the week. Genuinely used every day in the Balearics and the Maddalena.",
    category: "SERVICE",
    netRateEur: 70,
    sellPriceEur: 145,
    perPerson: false,
    global: true,
  },
  {
    slug: "wifi-router",
    name: "Onboard wifi",
    description:
      "A 4G router with a local data plan for the week. Coverage is good around the islands and patchy in the outer anchorages.",
    category: "SERVICE",
    netRateEur: 45,
    sellPriceEur: 95,
    perPerson: false,
    global: true,
  },
];

export interface CourseSeed {
  slug: string;
  name: string;
  summary: string;
  level: "FIRST_TIMER" | "COMPETENT_CREW" | "SKIPPER" | "THEORY";
  format: "ONLINE" | "ONBOARD" | "HYBRID";
  durationHours: number;
  priceEur: number;
  netRateEur: number;
  certification: string | null;
  syllabus: string[];
  destinationSlug: string | null;
}

export const COURSES: CourseSeed[] = [
  {
    slug: "before-your-first-sail",
    name: "Before your first sail",
    summary:
      "The two hours of preparation that change a first sailing holiday from bewildering to enjoyable. Free, because people who take it book better trips and enjoy them more.",
    level: "FIRST_TIMER",
    format: "ONLINE",
    durationHours: 2,
    priceEur: 0,
    netRateEur: 0,
    certification: null,
    syllabus: [
      "What actually happens on a charter week, hour by hour",
      "The eight words of vocabulary you genuinely need",
      "Living aboard: sleeping, showering, seasickness, and the heads",
      "What a skipper does, and what they will ask you to do",
      "How to not be the person nobody wants on the foredeck",
    ],
    destinationSlug: null,
  },
  {
    slug: "reading-a-mediterranean-forecast",
    name: "Reading a Mediterranean forecast",
    summary:
      "Why the app says 12 knots and the channel delivers 30. Thermal winds, katabatic winds, and the local names that tell you what is coming.",
    level: "THEORY",
    format: "ONLINE",
    durationHours: 3,
    priceEur: 45,
    netRateEur: 8,
    certification: null,
    syllabus: [
      "Sea breeze mechanics and why the maestral is so reliable",
      "Katabatic wind: the bora, and why gusts beat averages",
      "Compression and funnelling between islands",
      "The mistral and the Strait of Bonifacio",
      "Reading a gradient chart rather than a wind number",
    ],
    destinationSlug: null,
  },
  {
    slug: "competent-crew",
    name: "Competent Crew, aboard",
    summary:
      "Five days of structured instruction taken during your own charter week. You sail the same route and come home able to be genuinely useful on a boat.",
    level: "COMPETENT_CREW",
    format: "ONBOARD",
    durationHours: 35,
    priceEur: 340,
    netRateEur: 180,
    certification: "RYA Competent Crew",
    syllabus: [
      "Steering, sail trim and points of sail",
      "Rope work and the five knots that matter",
      "Man overboard drill under sail and power",
      "Coming alongside, and stern-to with lazy lines",
      "Watch-keeping and lookout",
    ],
    destinationSlug: null,
  },
  {
    slug: "day-skipper-theory",
    name: "Day Skipper theory",
    summary:
      "The shore-based course you need before a bareboat charter. Navigation, tides, collision regulations, and passage planning.",
    level: "SKIPPER",
    format: "ONLINE",
    durationHours: 40,
    priceEur: 495,
    netRateEur: 240,
    certification: "RYA Day Skipper Theory",
    syllabus: [
      "Chartwork, position fixing and course to steer",
      "Tides, tidal streams and height calculation",
      "Collision regulations and lights",
      "Passage planning and pilotage",
      "Safety, distress procedures and VHF",
    ],
    destinationSlug: null,
  },
  {
    slug: "vhf-short-range",
    name: "VHF Short Range Certificate",
    summary:
      "Legally required to operate a marine VHF, and required by every Croatian charter base before they will release a bareboat.",
    level: "THEORY",
    format: "ONLINE",
    durationHours: 8,
    priceEur: 160,
    netRateEur: 75,
    certification: "RYA/Ofcom SRC",
    syllabus: [
      "Channels, calling procedure and radio discipline",
      "Distress, urgency and safety calls",
      "DSC and MMSI",
      "Practical assessment",
    ],
    destinationSlug: null,
  },
  {
    slug: "bora-and-the-northern-adriatic",
    name: "The bora, and how to plan around it",
    summary:
      "The specific briefing for anyone sailing the Kvarner. What the bora is, how to see it coming, and how to plan a week that never needs to fight it.",
    level: "THEORY",
    format: "ONLINE",
    durationHours: 2,
    priceEur: 35,
    netRateEur: 5,
    certification: null,
    syllabus: [
      "Where the bora comes from and why it gusts so hard",
      "Forecast signals: pressure gradient and cap cloud",
      "The Velebit channel and the places not to be",
      "Bailout planning as a habit",
    ],
    destinationSlug: "kvarner",
  },
  {
    slug: "anchoring-on-posidonia",
    name: "Anchoring in the Balearics without breaking the law",
    summary:
      "Posidonia seagrass is protected and anchoring on it is heavily fined. This is the forty minutes that keeps your deposit and the seagrass intact.",
    level: "FIRST_TIMER",
    format: "ONLINE",
    durationHours: 1,
    priceEur: 0,
    netRateEur: 0,
    certification: null,
    syllabus: [
      "What posidonia is and why it is protected",
      "Reading the bottom: sand versus seagrass from the deck",
      "Using the seagrass mapping apps",
      "Formentera's buoy booking system",
      "Setting an anchor properly in sand",
    ],
    destinationSlug: "ibiza-formentera",
  },
  {
    slug: "night-sailing-and-volcanoes",
    name: "Night sailing, and the Stromboli approach",
    summary:
      "Preparation for the one night watch that people book the Aeolians for. Night vision, deck safety in the dark, and how the approach actually works.",
    level: "COMPETENT_CREW",
    format: "ONLINE",
    durationHours: 2,
    priceEur: 40,
    netRateEur: 6,
    certification: null,
    syllabus: [
      "Preserving night vision, and why red light matters",
      "Moving safely on deck in the dark",
      "Lights, shapes and identifying other traffic at night",
      "The Sciara del Fuoco: where to stand off and why",
    ],
    destinationSlug: "aeolian-islands",
  },
];

export interface PricingRuleSeed {
  name: string;
  kind: "SEASON" | "LEAD_TIME" | "OCCUPANCY" | "DAY_OF_WEEK";
  destinationSlug: string | null;
  thresholdMin: number;
  thresholdMax: number;
  multiplier: number;
  note: string;
}

/**
 * The yield engine's starting configuration. These live in the database rather
 * than in code so the two founders can retune them from /ops without a deploy —
 * and so a rule change is a data change with a preview, not a code change with
 * a release.
 *
 * Bands are inclusive-min, exclusive-max, and at most one rule of each kind
 * fires per departure.
 */
export const PRICING_RULES: PricingRuleSeed[] = [
  // --- Season (month of departure)
  {
    name: "Peak season",
    kind: "SEASON",
    destinationSlug: null,
    thresholdMin: 7,
    thresholdMax: 9,
    multiplier: 1.22,
    note: "July and August. Demand exceeds supply on every ground we sell.",
  },
  {
    name: "Shoulder season",
    kind: "SEASON",
    destinationSlug: null,
    thresholdMin: 6,
    thresholdMax: 7,
    multiplier: 1.08,
    note: "June. Warm water, reliable wind, noticeably fewer boats.",
  },
  {
    name: "Late shoulder",
    kind: "SEASON",
    destinationSlug: null,
    thresholdMin: 9,
    thresholdMax: 10,
    multiplier: 1.06,
    note: "September. Arguably the best month to sail and priced just under peak.",
  },
  {
    name: "Early and late season",
    kind: "SEASON",
    destinationSlug: null,
    thresholdMin: 10,
    thresholdMax: 12,
    multiplier: 0.9,
    note: "October onward. We discount to move inventory that would otherwise sit.",
  },
  {
    name: "Ibiza peak premium",
    kind: "SEASON",
    destinationSlug: "ibiza-formentera",
    thresholdMin: 7,
    thresholdMax: 9,
    multiplier: 1.3,
    note: "Balearic peak runs hotter than the general peak. Destination rules override global ones.",
  },
  // --- Lead time (days until departure)
  {
    name: "Last minute",
    kind: "LEAD_TIME",
    destinationSlug: null,
    thresholdMin: 0,
    thresholdMax: 15,
    multiplier: 0.88,
    note: "Inside two weeks an unsold berth is worth more sold cheap than unsold.",
  },
  {
    name: "Close in",
    kind: "LEAD_TIME",
    destinationSlug: null,
    thresholdMin: 15,
    thresholdMax: 45,
    multiplier: 1.05,
    note: "Committed buyers, less price shopping.",
  },
  {
    name: "Early bird",
    kind: "LEAD_TIME",
    destinationSlug: null,
    thresholdMin: 180,
    thresholdMax: 1000,
    multiplier: 0.94,
    note: "Rewards booking a season ahead and gives us cash and certainty early.",
  },
  // --- Occupancy (ratio of berths sold)
  {
    name: "Nearly full",
    kind: "OCCUPANCY",
    destinationSlug: null,
    thresholdMin: 0.75,
    thresholdMax: 1.01,
    multiplier: 1.14,
    note: "The last berths on a popular departure are the ones people pay for.",
  },
  {
    name: "Filling well",
    kind: "OCCUPANCY",
    destinationSlug: null,
    thresholdMin: 0.45,
    thresholdMax: 0.75,
    multiplier: 1.05,
    note: "Selling to plan; hold a small premium.",
  },
  {
    name: "Slow to fill",
    kind: "OCCUPANCY",
    destinationSlug: null,
    thresholdMin: 0,
    thresholdMax: 0.2,
    multiplier: 0.93,
    note: "Barely moving. Step down before it becomes distressed inventory.",
  },
];
