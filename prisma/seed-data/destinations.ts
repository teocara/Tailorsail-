/**
 * The six launch cruising grounds.
 *
 * These briefings are not marketing copy. They are the grounding corpus every
 * generated itinerary and readiness programme is written from, and they are
 * what a first-timer reads to work out whether they can actually do this. The
 * wind sections in particular carry real operational weight — the difference
 * between the maestral and the bora is the difference between a beginner week
 * and one that needs a skipper who knows the escape harbours.
 */

export interface DestinationSeed {
  slug: string;
  name: string;
  regionSlug: string;
  tagline: string;
  summary: string;
  windPattern: string;
  bestMonths: string;
  seaState: string;
  skillLevel: "FIRST_TIMER" | "COMPETENT_CREW" | "SKIPPER";
  nauticalHighlights: string;
  marinaNotes: string;
  localRules: string;
  gettingThere: string;
  heroFrom: string;
  heroTo: string;
  /** Feeds the yield engine. 1.0 is neutral. */
  demandIndex: number;
}

export const REGIONS = [
  {
    slug: "italy",
    name: "Italy",
    country: "Italy",
    summary:
      "Three very different coastlines: the volcanic Aeolians off Sicily, the crowded and spectacular Amalfi, and the granite archipelago of northern Sardinia.",
  },
  {
    slug: "croatia",
    name: "Croatia",
    country: "Croatia",
    summary:
      "The most reliable beginner sailing in the Mediterranean, on a coast with more than a thousand islands and a dependable afternoon breeze.",
  },
  {
    slug: "balearics",
    name: "Balearics",
    country: "Spain",
    summary:
      "Short hops, clear water and the most sociable anchorages we sell — the natural home of the Tailorsail Crew line.",
  },
];

export const DESTINATIONS: DestinationSeed[] = [
  // -------------------------------------------------------------- Croatia
  {
    slug: "dalmatia",
    name: "Dalmatia",
    regionSlug: "croatia",
    tagline: "The week that teaches people to sail without them noticing",
    summary:
      "Split, Brač, Hvar and Vis, with the Kornati archipelago within reach if you want a quieter loop north. Short passages between islands, deep clear water, somewhere to tie up every night, and a breeze that turns up on schedule. If you have never sailed and you want to find out whether you like it, this is the ground we would send you to first.",
    windPattern:
      "The maestral dominates the summer. It is a thermal sea breeze: nothing at breakfast, filling in from the north-west around late morning, settling at 10-18 knots through the afternoon, and dying away near sunset. Because it is driven by the land heating up, it is genuinely predictable — you can plan a week of beam reaches around it. Two winds interrupt it. The bora is a north-easterly katabatic that falls off the mountains, cold, dry and violently gusty; it is a shoulder-season and winter feature here rather than a July one, but it can appear in summer and it builds fast. The jugo is a south-easterly that arrives slowly over a day or two, bringing humidity, rain and a real swell — it is uncomfortable rather than dangerous, and it is the one that keeps boats in harbour.",
    bestMonths:
      "Late May to early October. June and September are the sweet spot: reliable maestral, warm water, and far less pressure on berths. July and August are hot, busy and the most expensive, and popular harbours fill by mid-afternoon.",
    seaState:
      "Sheltered for most of the week. The islands break up the fetch, so even a windy afternoon rarely builds more than a short chop. The exception is the open crossing to Vis, which is exposed and can be lively when the maestral is at full strength.",
    skillLevel: "FIRST_TIMER",
    nauticalHighlights:
      "The afternoon crossing to Hvar with the maestral on the beam. Palmižana in the Pakleni islands, a short hop from Hvar town but a completely different evening. Vis, closed to foreign boats until 1989 and still noticeably its own place, with Komiža on the far side. The Blue Cave on Biševo, best early before the tripper boats. Stiniva's cliff-framed cove. Northward, the bare limestone of the Kornati archipelago.",
    marinaNotes:
      "The ACI chain covers most of the coast and can be booked in advance, which is worth doing in high summer. Split's ACI marina is the usual base and sits ten minutes from the old town. Trogir and Kaštela are quieter alternatives with easier road access. In July and August aim to be approaching your harbour by mid-afternoon — Hvar town and Palmižana both fill early, and the alternative is a long motor to somewhere with space.",
    localRules:
      "Kornati National Park charges a daily entry ticket per boat, cheaper bought in advance than from the ranger who will find you. Telašćica nature park is charged separately. Croatia requires a valid sailing licence and VHF certificate for bareboat charter, and the charter base will check both against the crew list before you leave. Anchoring is restricted inside some park zones and marked buoy fields must be used where they exist.",
    gettingThere:
      "Split airport is 25 minutes from the marinas and served directly from most European cities through the summer. Zadar is the alternative if you are starting further north. Ferries connect the islands, so a late-arriving crew member can catch up with the boat.",
    heroFrom: "#0d2a4a",
    heroTo: "#3fa39b",
    demandIndex: 1.08,
  },
  {
    slug: "kvarner",
    name: "Kvarner & the Northern Adriatic",
    regionSlug: "croatia",
    tagline: "Bora country — the coast that rewards knowing what you are doing",
    summary:
      "Istria, Cres, Lošinj, Rab and Krk, with Venice-era harbour towns and far fewer charter boats than Dalmatia. It is a beautiful, slightly serious cruising ground: the sailing is better and the harbours are emptier, but the Velebit channel produces the most severe wind in the Adriatic and the week needs planning around it.",
    windPattern:
      "This is the home of the bora. Cold air pools behind the Velebit range and falls through the gaps as a north-easterly katabatic wind, arriving with almost no warning and gusting far above the average — a channel that was flat an hour ago can be unmanageable, and Senj is the most notorious stretch on the whole coast. It is most frequent from October to April but summer episodes happen. The compensation is that it is forecast well and its onset is usually visible: a hard-edged cloud cap on the mountains, and unusual clarity in the air. In settled summer weather the maestral behaves as it does further south, giving pleasant north-westerly afternoons. The jugo brings the same slow, wet southerly as in Dalmatia.",
    bestMonths:
      "June to September for the most settled conditions. May and October sail beautifully and are the quietest weeks of the year, but bora risk is materially higher and we only sell them with a skipper aboard.",
    seaState:
      "Generally protected between the islands. In a bora the channels become steep and short very quickly, and the Velebit channel in particular is somewhere to be off the water rather than crossing.",
    skillLevel: "COMPETENT_CREW",
    nauticalHighlights:
      "Rovinj's harbour under the campanile, which is the best-looking arrival in the northern Adriatic. The Cres–Lošinj channel and the swing bridge at Osor, which opens twice a day. Rab's four bell towers from seaward. Susak's sand island, geologically unlike anything else here. The Kvarner dolphins around Lošinj, which are resident rather than a rumour.",
    marinaNotes:
      "Punat on Krk is one of the largest marinas in the Adriatic and a common base. Pula, Rovinj and Vrsar cover Istria; Mali Lošinj and Cres serve the islands. Berths are far easier to find than in Dalmatia even in August. Because the bora is the planning constraint, we brief crews to think in terms of which harbour they could reach rather than which one they had intended.",
    localRules:
      "Bareboat charter requires a sailing licence and VHF certificate. Brijuni National Park has restricted access and requires prior arrangement — you cannot simply anchor there. Lošinj's dolphin reserve carries approach restrictions.",
    gettingThere:
      "Pula and Rijeka airports serve the region directly; Trieste, Venice and Ljubljana are all within a comfortable transfer and are often better connected.",
    heroFrom: "#12233d",
    heroTo: "#2f6f8f",
    demandIndex: 0.92,
  },
  // ---------------------------------------------------------------- Italy
  {
    slug: "amalfi-pontine",
    name: "Amalfi & the Pontine Islands",
    regionSlug: "italy",
    tagline: "The most beautiful coastline we sell, and the least relaxing",
    summary:
      "Capri, Positano, Amalfi and Ischia, with the quieter Pontine islands — Ponza, Palmarola, Ventotene — a day's sail north-west. Spectacular, and genuinely demanding for reasons that have nothing to do with wind: this is busy, expensive water with heavy commercial traffic and scarce berths. We sell it skippered by default and think that is the right call.",
    windPattern:
      "Lighter and less reliable than the Adriatic. Summer days are thermal: calm mornings, a sea breeze filling in from the west or south-west during the afternoon at 8-15 knots, easing at dusk. There are more motoring hours here than on any other ground we sell, and a week with two genuinely good sailing days is normal rather than disappointing. Autumn brings the libeccio, a south-westerly that pushes swell straight onto the Amalfi shore and makes the exposed anchorages untenable.",
    bestMonths:
      "May, June, September and early October. July and August are hot, extremely crowded and at their most expensive, and the day-tripper traffic around Capri is at its peak.",
    seaState:
      "The Gulf of Naples is usually calm, but it is rarely still: the wash from hydrofoils and ferries is constant and comes from every direction. The open water out to the Pontine islands is more exposed and wants a settled forecast.",
    skillLevel: "COMPETENT_CREW",
    nauticalHighlights:
      "Capri from the water at seven in the morning, before the first hydrofoil, which is a completely different island from the one the day trips see. The Faraglioni stacks. Positano stacked up the hillside as you approach from the west. Ventotene's Roman harbour, cut directly into the tufa two thousand years ago and still in use. Palmarola, which is essentially uninhabited and the most surprising anchorage in the group. The Li Galli islets off Positano.",
    marinaNotes:
      "This is the constraint that shapes the week. Berths on the Amalfi coast are limited and among the most expensive in the Mediterranean, and in season they must be reserved well ahead — arriving at Capri's Marina Grande in August without a booking means anchoring off or going elsewhere. Salerno's Marina d'Arechi, Marina di Stabia and Procida are the practical bases. Ischia and Procida both offer better value than the mainland side.",
    localRules:
      "The Punta Campanella marine reserve between Sorrento and Capri is zoned, with anchoring prohibited in the strictest areas. Capri has its own restrictions around the Faraglioni and the Blue Grotto. Naples has commercial traffic separation that recreational boats are expected to keep clear of. Expect the Guardia Costiera to be present and attentive.",
    gettingThere:
      "Naples airport is well connected and sits under an hour from the Salerno and Stabia marinas. Rome Fiumicino works for the Pontine islands via Anzio or Formia.",
    heroFrom: "#1b3454",
    heroTo: "#c98a4b",
    demandIndex: 1.12,
  },
  {
    slug: "aeolian-islands",
    name: "The Aeolian Islands",
    regionSlug: "italy",
    tagline: "Seven volcanic islands, one of which is still erupting",
    summary:
      "Lipari, Vulcano, Salina, Panarea, Stromboli and the two far western islands, Filicudi and Alicudi. Short passages, deep water, and the single most memorable night sail in the Mediterranean. It is a compact archipelago that feels much bigger than it is, and the sailing between the islands is more interesting than the distances suggest.",
    windPattern:
      "Thermal in the main, but heavily modified by the islands themselves. Air accelerating between two of them can double in strength over a mile — the gap between Lipari and Vulcano and the channel north of Salina are both reliable for this, and it catches crews out because the forecast is for the open sea rather than the gap. Expect to reef before entering a channel and shake it out on the other side. The dominant summer flow is north-westerly at 10-18 knots. In the lee of a high island you may lose the wind entirely for half a mile and then have all of it back at once.",
    bestMonths:
      "June to September. May and October sail well but the ferry service thins out, which matters if anyone needs to join or leave mid-week.",
    seaState:
      "Deep water right up to the shore, so there is little shoaling swell, but the channels get choppy quickly when the wind funnels. The crossing from the Sicilian mainland is the most exposed leg of a typical week.",
    skillLevel: "COMPETENT_CREW",
    nauticalHighlights:
      "Stromboli after dark. The Sciara del Fuoco is the scar on the north-west flank where the eruptions run down into the sea, and standing off it at night while the volcano throws material every twenty minutes is the reason people book this ground. Panarea's Cala Junco and the Basiluzzo stack. Pollara on Salina, the flooded half-crater the Postino was filmed in. Alicudi, which has no cars and about a hundred residents.",
    marinaNotes:
      "Marina facilities are limited and the archipelago runs largely on anchoring and mooring buoys. Portorosa and Milazzo on the Sicilian mainland are the usual bases. Lipari has the most services; Panarea in August is busy and buoy fields fill early. Provision properly before leaving Sicily, because island prices are high and choice is thin.",
    localRules:
      "Anchoring is prohibited in several zones around Panarea and Basiluzzo, where buoy fields must be used instead. Landing on Stromboli's Sciara del Fuoco is forbidden and the summit route is regulated with mandatory guides. Volcanic sand gives notoriously poor holding — anchors drag in what looks like perfect sand, and setting properly with plenty of scope matters more here than anywhere else we sell.",
    gettingThere:
      "Catania is the best-connected airport, around two hours to Milazzo. Palermo is a similar drive. Hydrofoils link Milazzo to all the islands, so a late crew member can meet the boat.",
    heroFrom: "#2a1c33",
    heroTo: "#d4762f",
    demandIndex: 1.05,
  },
  {
    slug: "la-maddalena",
    name: "La Maddalena & the Costa Smeralda",
    regionSlug: "italy",
    tagline: "Granite, turquoise water, and the strongest wind in the Tyrrhenian",
    summary:
      "The archipelago between Sardinia and Corsica — Caprera, Spargi, Budelli, Santa Maria — with the Costa Smeralda marinas along the Sardinian shore. Some of the clearest water and best anchorages in the Mediterranean, sitting immediately next to the Strait of Bonifacio, which is the windiest stretch of water we sell into.",
    windPattern:
      "The mistral is the defining feature. It is a north-westerly that forms over southern France and funnels through the gap between Corsica and Sardinia, compressing and accelerating as it goes; 30 knots in the Strait of Bonifacio while the open sea has 18 is entirely normal, and it can hold for three days. It is well forecast, and the whole archipelago is a lee shore playground once you know where to sit out a blow. In its absence the summer pattern is a pleasant westerly thermal at 12-18 knots. The Strait itself should be treated as a decision point rather than a passage: crews plan a mistral week around whether they cross it at all.",
    bestMonths:
      "May to October. July and August bring the most settled conditions and the highest prices; June and September give better value and still-warm water, with slightly more mistral risk.",
    seaState:
      "Well protected inside the archipelago, with short hops between sheltered anchorages. The Strait of Bonifacio in a mistral builds a steep, close-period sea that is genuinely hard work.",
    skillLevel: "COMPETENT_CREW",
    nauticalHighlights:
      "Cala Coticcio on Caprera, which people compare to Tahiti and which is reachable only from the water. The granite of Spargi and Budelli, sculpted into shapes that look deliberate. Porto Cervo, if you want to see the other end of the yachting world for an evening. Bonifacio's harbour on the Corsican side, entered through a cleft in white cliffs that does not appear to be there until you are lined up on it.",
    marinaNotes:
      "Portisco, Cannigione and Palau are the practical bases, with Porto Cervo available if you want it and are prepared for what it costs. Berths are expensive across the Costa Smeralda in August. Most nights of a good week here are spent at anchor or on a park buoy rather than in a marina.",
    localRules:
      "La Maddalena National Park requires a daily permit per boat, bought online or through the charter base, and enforces detailed zoning: some areas are no-anchor, some no-entry, and rangers do check. The pink beach at Budelli, the Spiaggia Rosa, is strictly protected — you may not land on it or swim from it, and this is enforced with substantial fines. Buoy fields must be used where they are laid.",
    gettingThere:
      "Olbia airport is 30-40 minutes from the northern marinas and busy with direct European flights through the summer.",
    heroFrom: "#0f3245",
    heroTo: "#5fc0b4",
    demandIndex: 1.1,
  },
  // ------------------------------------------------------------- Balearics
  {
    slug: "ibiza-formentera",
    name: "Ibiza & Formentera",
    regionSlug: "balearics",
    tagline: "Short hops, clear water, and the best evenings we sell",
    summary:
      "Two islands close enough together that the sailing is never a chore and the anchorages do the work. Formentera's sandbanks are as good as anywhere in Europe, Ibiza's west coast has proper cliffs and sunsets, and the whole thing is compact enough that a first-timer can enjoy it. This is where most of our Crew departures run.",
    windPattern:
      "Moderate and generally friendly. The summer pattern is the embat, a thermal sea breeze that fills in from the south-west through the afternoon at 10-16 knots and drops in the evening — enough to sail properly, rarely enough to be intimidating. Two named winds change the picture: the tramuntana from the north, which is stronger and can make the north coast uncomfortable, and the levante from the east, which pushes swell into the Formentera anchorages and is the usual reason to move. Neither is common in high summer.",
    bestMonths:
      "May to October. June and September are the best combination of warm water, reliable breeze and prices that are not silly. July and August are peak in every sense — the sailing is easy, the anchorages are full and the marinas are at their most expensive.",
    seaState:
      "Short passages and generally calm water. The Es Freus channel between the two islands can get choppy when the breeze is against the tide, and the exposed western anchorages become untenable in a levante.",
    skillLevel: "FIRST_TIMER",
    nauticalHighlights:
      "Es Vedrà, the limestone island off the south-west coast, which is genuinely startling from sea level. The sandbanks off Illetes and Espalmador at the north end of Formentera, where the water is waist-deep and the colour is hard to believe. Cala Salada and Cala Comte for the sunsets. The old town of Dalt Vila from the water on the approach to Ibiza town.",
    marinaNotes:
      "Marina Botafoch and Ibiza Magna sit opposite the old town and are priced accordingly. Santa Eulalia is calmer and better value. Formentera has very limited berthing at La Savina, which is why most crews anchor. San Antonio suits the west coast. In August, book everything.",
    localRules:
      "This is the ground where local rules matter most, and where crews most often get caught out. Posidonia seagrass is protected under Balearic law, and anchoring on it is illegal and heavily fined — you must anchor on clear sand, which means reading the bottom rather than dropping wherever there is room. Aerial-photography apps showing the seagrass beds are effectively mandatory. Formentera operates a booking system for its mooring buoy fields in the protected areas around Illetes and Espalmador: buoys are limited, they must be reserved in advance, and turning up hoping for one in August does not work. There is a per-boat daily fee for the Ses Salines natural park.",
    gettingThere:
      "Ibiza airport is 15 minutes from the marinas and is one of the best-connected airports in the Mediterranean through the summer. Formentera is reached by ferry from Ibiza town if anyone is joining mid-week.",
    heroFrom: "#13324f",
    heroTo: "#e08a4b",
    demandIndex: 1.18,
  },
];
