import type { TripFilters } from "@/lib/trips";

/**
 * Keyword fallback for the natural-language search box.
 *
 * When `ANTHROPIC_API_KEY` is absent the search box would otherwise be a dead
 * control, which is a poor way to demonstrate a product. This handles the
 * common shapes — a place, a month, a group size, "beginners", "young" — well
 * enough to be genuinely useful, and the UI is explicit about which parser ran
 * so nobody mistakes it for the model.
 *
 * It is deliberately not clever. Anything ambiguous is left unset, because an
 * over-eager filter hides trips the visitor would have liked.
 */

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9,
  sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Place words mapped to destination slugs, longest match wins. */
const PLACES: [string, string][] = [
  ["formentera", "ibiza-formentera"],
  ["ibiza", "ibiza-formentera"],
  ["balearic", "ibiza-formentera"],
  ["aeolian", "aeolian-islands"],
  ["eolie", "aeolian-islands"],
  ["stromboli", "aeolian-islands"],
  ["lipari", "aeolian-islands"],
  ["sicily", "aeolian-islands"],
  ["maddalena", "la-maddalena"],
  ["sardinia", "la-maddalena"],
  ["sardegna", "la-maddalena"],
  ["smeralda", "la-maddalena"],
  ["bonifacio", "la-maddalena"],
  ["amalfi", "amalfi-pontine"],
  ["capri", "amalfi-pontine"],
  ["naples", "amalfi-pontine"],
  ["napoli", "amalfi-pontine"],
  ["positano", "amalfi-pontine"],
  ["ischia", "amalfi-pontine"],
  ["procida", "amalfi-pontine"],
  ["ponza", "amalfi-pontine"],
  ["pontine", "amalfi-pontine"],
  ["kvarner", "kvarner"],
  ["istria", "kvarner"],
  ["rovinj", "kvarner"],
  ["losinj", "kvarner"],
  ["lošinj", "kvarner"],
  ["rab", "kvarner"],
  ["krk", "kvarner"],
  ["pula", "kvarner"],
  ["dalmatia", "dalmatia"],
  ["dalmatian", "dalmatia"],
  ["split", "dalmatia"],
  ["hvar", "dalmatia"],
  ["kornati", "dalmatia"],
  ["brac", "dalmatia"],
  ["brač", "dalmatia"],
  ["vis", "dalmatia"],
  ["trogir", "dalmatia"],
];

const REGIONS: [string, string][] = [
  ["croatia", "croatia"],
  ["croatian", "croatia"],
  ["italy", "italy"],
  ["italian", "italy"],
  ["spain", "balearics"],
  ["spanish", "balearics"],
];

const BEGINNER = [
  "never sailed",
  "never been sailing",
  "beginner",
  "beginners",
  "first time",
  "first-time",
  "no experience",
  "complete novice",
  "novices",
];

const CREW = [
  "young",
  "twenties",
  "20s",
  "party",
  "nightlife",
  "solo",
  "sociable",
  "festival",
  "meet people",
];

const WORD_NUMBERS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
};

export interface FallbackParse {
  filters: TripFilters;
  rationale: string;
}

export function parseQueryWithoutAi(query: string): FallbackParse {
  const text = query.toLowerCase();
  const filters: TripFilters = {};
  const understood: string[] = [];

  // Place. Longest keyword first so "formentera" beats a stray "ibiza".
  for (const [word, slug] of PLACES) {
    if (text.includes(word)) {
      filters.destinationSlug = slug;
      understood.push(word);
      break;
    }
  }
  if (!filters.destinationSlug) {
    for (const [word, slug] of REGIONS) {
      if (text.includes(word)) {
        filters.regionSlug = slug;
        understood.push(word);
        break;
      }
    }
  }

  for (const [word, month] of Object.entries(MONTHS)) {
    // Word boundary so "may" doesn't fire on "maybe" and "mar" on "marina".
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      filters.month = month;
      understood.push(word);
      break;
    }
  }

  if (BEGINNER.some((phrase) => text.includes(phrase))) {
    filters.skillLevel = "FIRST_TIMER";
    understood.push("beginners");
  }

  if (CREW.some((phrase) => text.includes(phrase))) {
    filters.crewOnly = true;
    understood.push("Crew trips");
  }

  // Group size: "6 friends", "for six", "group of 8", "we are 4".
  const digitMatch = text.match(
    /\b(\d{1,2})\s*(?:friends|people|of us|adults|guys|berths|pax)\b/,
  );
  const ofMatch = text.match(/\bgroup of\s+(\d{1,2})\b/);
  const weAre = text.match(/\bwe(?:'re| are)\s+(\d{1,2})\b/);
  const wordMatch = Object.keys(WORD_NUMBERS).find((w) =>
    new RegExp(`\\b${w}\\s+(?:friends|people|of us)\\b`).test(text),
  );

  const groupSize =
    (digitMatch && Number(digitMatch[1])) ||
    (ofMatch && Number(ofMatch[1])) ||
    (weAre && Number(weAre[1])) ||
    (wordMatch ? WORD_NUMBERS[wordMatch] : undefined);

  if (groupSize && groupSize >= 1 && groupSize <= 20) {
    filters.minBerthsAvailable = groupSize;
    understood.push(`${groupSize} berths`);
  }

  // Budget: "under €1200", "up to 900 pp", "budget 1500".
  const budget = text.match(
    /(?:under|below|max|up to|budget(?: of)?|less than)\s*(?:€|eur)?\s*(\d{3,5})/,
  );
  if (budget) {
    filters.maxPricePerPersonCents = Number(budget[1]) * 100;
    understood.push(`under €${budget[1]} per person`);
  }

  if (text.includes("catamaran")) {
    filters.boatType = "CATAMARAN";
    understood.push("catamaran");
  }
  if (text.includes("bareboat")) {
    filters.skipper = "BAREBOAT";
    understood.push("bareboat");
  }
  if (text.includes("skipper")) {
    filters.skipper = "SKIPPERED";
    understood.push("skippered");
  }

  const rationale =
    understood.length > 0
      ? `Matched on ${understood.join(", ")}. This is the keyword search — set an API key for the full natural-language version.`
      : "We could not pick anything specific out of that, so this is everything we sell. Try naming a place, a month, or your group size.";

  return { filters, rationale };
}
