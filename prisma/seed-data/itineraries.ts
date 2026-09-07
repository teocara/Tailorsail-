/**
 * Route templates, one or two per cruising ground.
 *
 * Committed output of `lib/ai/generate-itinerary.ts`, human-reviewed. Trips
 * reference a template by key rather than each carrying a bespoke itinerary —
 * two boats running the same Dalmatian loop genuinely do sail the same route,
 * and pretending otherwise would be padding.
 *
 * Distances are real day sails for a cruising yacht. Where a leg is shaped by
 * the local wind — the maestral filling in at midday, the acceleration between
 * the Aeolians, the mistral in the Strait of Bonifacio — the description says
 * so, because that is the difference between an itinerary and a list of places.
 */

export interface ItineraryDaySeed {
  dayNumber: number;
  title: string;
  fromPort: string;
  toPort: string;
  nauticalMiles: number;
  description: string;
  highlight: string;
}

export const ITINERARIES: Record<string, ItineraryDaySeed[]> = {
  // ------------------------------------------------------- Dalmatia, classic
  "dalmatia-classic": [
    {
      dayNumber: 1,
      title: "Split to Milna",
      fromPort: "Split",
      toPort: "Milna, Brač",
      nauticalMiles: 14,
      description:
        "A deliberately short first leg. You will not leave the base before mid-afternoon once the handover and provisioning are done, which is exactly when the maestral is at its best — a beam reach across the Brač channel with enough breeze to feel like sailing and not enough to frighten anyone. Milna is a sheltered inlet on the west end of Brač with an easy stern-to berth and one good restaurant on the quay.",
      highlight: "First proper beam reach, ninety minutes after leaving the dock",
    },
    {
      dayNumber: 2,
      title: "Milna to Hvar town",
      fromPort: "Milna, Brač",
      toPort: "Hvar",
      nauticalMiles: 22,
      description:
        "Out of the Brač channel and down the north side of Hvar. Morning is usually glassy, so plan to motor for the first hour and be under sail by eleven when the north-westerly fills in. Hvar town fills early in summer — aim to be on approach by three, or take a buoy at Palmižana across the water in the Pakleni islands and take the tender in for the evening.",
      highlight: "Arriving under sail into one of the Adriatic's great harbours",
    },
    {
      dayNumber: 3,
      title: "Hvar to Vis",
      fromPort: "Hvar",
      toPort: "Vis town",
      nauticalMiles: 24,
      description:
        "The most exposed leg of the week and the best sailing. Open water all the way across, so the maestral has fetch to work with and you will see the top of the wind range. Vis was closed to foreign boats until 1989 and still feels like its own country — the harbour is broad and calm, and the town has none of Hvar's polish, which most crews decide they prefer.",
      highlight: "Open-water crossing with the maestral at full strength",
    },
    {
      dayNumber: 4,
      title: "Vis to Komiža, by way of the Blue Cave",
      fromPort: "Vis town",
      toPort: "Komiža",
      nauticalMiles: 16,
      description:
        "Round the south of the island with an early start for Biševo. The Blue Cave is worth seeing and only worth seeing before the tripper boats arrive, which means being there by eight. Continue to Stiniva, a cove almost closed off by cliffs with a gap barely wide enough for a tender, then into Komiža on the west coast for the evening.",
      highlight: "Biševo's Blue Cave at eight in the morning, before anyone else",
    },
    {
      dayNumber: 5,
      title: "Komiža to Palmižana",
      fromPort: "Komiža",
      toPort: "Palmižana, Pakleni Islands",
      nauticalMiles: 26,
      description:
        "Back north-east across the open water, which on a maestral day is a long, fast, single-tack run and the leg most crews remember. Palmižana sits in the Pakleni islands twenty minutes by tender from Hvar town — you get the anchorage and the pine trees, and Hvar's evening if you want it, without paying for the berth.",
      highlight: "A single-tack reach the whole way back across",
    },
    {
      dayNumber: 6,
      title: "Palmižana to Bol",
      fromPort: "Palmižana, Pakleni Islands",
      toPort: "Bol, Brač",
      nauticalMiles: 18,
      description:
        "A relaxed day back up the Hvar channel to Bol on the south coast of Brač, past the Zlatni Rat spit that shifts its shape with the current. Short enough to swim twice on the way. The marina is small, so it is worth calling ahead in July and August.",
      highlight: "Zlatni Rat from the water, changing shape as you pass",
    },
    {
      dayNumber: 7,
      title: "Bol to Split",
      fromPort: "Bol, Brač",
      toPort: "Split",
      nauticalMiles: 20,
      description:
        "An early return so the boat is back for the handover with time to spare. The morning is usually calm, which suits a gentle motor-sail up the Brač channel and a last swim off Šolta. Diocletian's Palace comes into view for the final half hour, which is a good way to end a week.",
      highlight: "Split's waterfront from the sea on the last morning",
    },
  ],

  // ------------------------------------------------------ Dalmatia, Kornati
  "dalmatia-kornati": [
    {
      dayNumber: 1,
      title: "Trogir to Rogoznica",
      fromPort: "Trogir",
      toPort: "Rogoznica",
      nauticalMiles: 19,
      description:
        "North-west out of Trogir along a coast of low islands and fish farms. An easy shakedown leg with the afternoon breeze on the beam. Rogoznica sits in a near-landlocked bay that is one of the most protected harbours on this stretch, which makes it a comfortable first night while the crew is still finding where everything is stowed.",
      highlight: "A first night in an almost completely enclosed bay",
    },
    {
      dayNumber: 2,
      title: "Rogoznica to Žirje",
      fromPort: "Rogoznica",
      toPort: "Žirje",
      nauticalMiles: 21,
      description:
        "Out past Primošten and into the outer island chain. The scenery changes here — the pine of the mainland gives way to the bare limestone that defines the Kornati. Žirje is the outermost inhabited island of the Šibenik group and has two sheltered bays and very little else, which is the point.",
      highlight: "The landscape turning from green to bare white rock",
    },
    {
      dayNumber: 3,
      title: "Žirje into the Kornati",
      fromPort: "Žirje",
      toPort: "Kornati National Park",
      nauticalMiles: 17,
      description:
        "Into the park proper, with the daily ticket bought in advance. The Kornati are eighty-odd islands with almost no permanent population and a landscape closer to a desert than to a coastline. Anchoring is restricted in places and buoys must be used where laid. Most crews take a buoy in one of the enclosed bays and eat at one of the handful of konobas that run off generators.",
      highlight: "Eighty islands, almost no people, and the crown of the park",
    },
    {
      dayNumber: 4,
      title: "Kornati to Telašćica",
      fromPort: "Kornati National Park",
      toPort: "Telašćica, Dugi Otok",
      nauticalMiles: 12,
      description:
        "A short hop north to the nature park at the southern end of Dugi Otok, charged separately from the Kornati ticket. The bay is enormous and deeply protected; on the seaward side the cliffs drop 160 metres straight into the water, and the salt lake behind the ridge is a twenty-minute walk and a considerably warmer swim.",
      highlight: "Cliffs falling 160 metres into the sea, a mile from a flat calm bay",
    },
    {
      dayNumber: 5,
      title: "Telašćica to Šibenik",
      fromPort: "Telašćica, Dugi Otok",
      toPort: "Šibenik",
      nauticalMiles: 28,
      description:
        "The longest leg of the week, back inshore with the maestral behind you, finishing with the approach to Šibenik through the St Anthony channel — a narrow gorge that opens into the town without warning. The fort above the entrance was built to make this exact approach unwise for anyone unwelcome.",
      highlight: "The St Anthony channel opening into Šibenik",
    },
    {
      dayNumber: 6,
      title: "Šibenik to Primošten",
      fromPort: "Šibenik",
      toPort: "Primošten",
      nauticalMiles: 14,
      description:
        "A short, unhurried day with time for a long swim stop. Primošten is a walled old town on what was an island until somebody built a causeway, and it looks its best from the water on the approach. The vineyards on the slopes behind are on the UNESCO list for the dry-stone walling.",
      highlight: "Primošten's old town on its near-island, seen from seaward",
    },
    {
      dayNumber: 7,
      title: "Primošten to Trogir",
      fromPort: "Primošten",
      toPort: "Trogir",
      nauticalMiles: 16,
      description:
        "An easy morning back down the coast, timed to be alongside for the handover. Trogir's old town is a compact medieval island connected by two bridges and is a considerably nicer place to spend a last evening than the airport road suggests.",
      highlight: "A last swim off the Drvenik islands on the way in",
    },
  ],

  // ----------------------------------------------------------------- Kvarner
  "kvarner-islands": [
    {
      dayNumber: 1,
      title: "Punat to Rab town",
      fromPort: "Punat, Krk",
      toPort: "Rab",
      nauticalMiles: 24,
      description:
        "South out of the Punat bay and down the Krk channel. This is bora water, so the first thing the skipper does is agree the two bailout harbours for the leg — an old habit on this coast and a good one. Rab's four bell towers stand up on the peninsula from a long way out and make the approach unmistakable.",
      highlight: "Rab's four campaniles rising out of the peninsula",
    },
    {
      dayNumber: 2,
      title: "Rab to Mali Lošinj",
      fromPort: "Rab",
      toPort: "Mali Lošinj",
      nauticalMiles: 26,
      description:
        "West across the Kvarnerić with the maestral on the beam if the weather is settled. This is resident dolphin water — the Lošinj population is genuinely there rather than a brochure claim, and approach restrictions apply if you find them. Mali Lošinj has the deepest natural harbour in the region and a waterfront that was built on nineteenth-century shipping money.",
      highlight: "Kvarner dolphins, which are resident rather than rumoured",
    },
    {
      dayNumber: 3,
      title: "Mali Lošinj to Susak",
      fromPort: "Mali Lošinj",
      toPort: "Susak",
      nauticalMiles: 11,
      description:
        "A short westward hop to an island that has no business being here: Susak is built on sand rather than the limestone of everything around it, with vineyards growing in the dunes and no cars or roads at all. The anchorage is open to the north, so it is a settled-forecast stop and a poor idea in a bora.",
      highlight: "A sand island in a limestone sea",
    },
    {
      dayNumber: 4,
      title: "Susak to Cres through the Osor bridge",
      fromPort: "Susak",
      toPort: "Cres town",
      nauticalMiles: 22,
      description:
        "Back east and north through the channel at Osor, where a swing bridge separating Cres from Lošinj opens twice a day. Time it right and you save hours; time it wrong and you wait or go the long way round. Cres town sits in a deep sheltered inlet and is the quietest good harbour in the Kvarner.",
      highlight: "Threading the Osor swing bridge on its opening",
    },
    {
      dayNumber: 5,
      title: "Cres to Rovinj",
      fromPort: "Cres town",
      toPort: "Rovinj",
      nauticalMiles: 33,
      description:
        "The long leg, west across the top of the Kvarner to the Istrian coast. Open water and the most committed day of the week, so it wants a clean forecast — this is the crossing you move for the bora rather than sail through it. Rovinj's harbour under the campanile of St Euphemia is the best-looking arrival in the northern Adriatic.",
      highlight: "Rovinj under the campanile, at the end of a long crossing",
    },
    {
      dayNumber: 6,
      title: "Rovinj to Vrsar",
      fromPort: "Rovinj",
      toPort: "Vrsar",
      nauticalMiles: 12,
      description:
        "A deliberately easy day up the Istrian coast after the crossing, with time to take the tender into the Lim fjord — a flooded karst canyon running ten kilometres inland, with oyster beds along it and a very good lunch at the far end.",
      highlight: "The Lim fjord by tender, and the oysters at the head of it",
    },
    {
      dayNumber: 7,
      title: "Vrsar to Pula",
      fromPort: "Vrsar",
      toPort: "Pula",
      nauticalMiles: 27,
      description:
        "South down the Istrian coast to finish. The approach to Pula runs past the Brijuni islands, which are a national park with restricted access you cannot simply anchor in. Pula's Roman amphitheatre stands directly above the harbour and is visible for the last few miles of the trip.",
      highlight: "A Roman amphitheatre standing over the final approach",
    },
  ],

  // ----------------------------------------------------------------- Amalfi
  "amalfi-classic": [
    {
      dayNumber: 1,
      title: "Salerno to Amalfi",
      fromPort: "Marina d'Arechi, Salerno",
      toPort: "Amalfi",
      nauticalMiles: 16,
      description:
        "West out of Salerno along a coast that gets steeper by the mile. The wind will likely be light, so treat the first afternoon as a coastal cruise rather than a sail and use the time to get the crew comfortable with the boat. Amalfi's berth was booked months ago, because the alternative in season is not having one.",
      highlight: "The Amalfi cliffs steepening as you run west",
    },
    {
      dayNumber: 2,
      title: "Amalfi to Capri",
      fromPort: "Amalfi",
      toPort: "Capri",
      nauticalMiles: 18,
      description:
        "Past Positano stacked up its hillside and the Li Galli islets, then across to Capri. Keep a proper lookout: this is the busiest hydrofoil water in Italy, the traffic is fast, and it does not manoeuvre around you. The Punta Campanella reserve zoning applies on the way past, so anchoring stops are limited to the permitted areas.",
      highlight: "Positano from the water, which is the way it was meant to be seen",
    },
    {
      dayNumber: 3,
      title: "Capri, early",
      fromPort: "Capri",
      toPort: "Capri",
      nauticalMiles: 6,
      description:
        "Set an alarm. Being off the Faraglioni at seven in the morning, before the first hydrofoil from Sorrento, is the single best hour of this itinerary and it is a completely different island from the one the day trips see. Circumnavigate slowly, then take a buoy or a berth and go up to Anacapri while everyone else is queueing for the Blue Grotto.",
      highlight: "The Faraglioni at seven in the morning, alone",
    },
    {
      dayNumber: 4,
      title: "Capri to Ischia",
      fromPort: "Capri",
      toPort: "Ischia",
      nauticalMiles: 20,
      description:
        "North-west across the mouth of the Gulf of Naples. Better sailing than the previous days if the afternoon breeze cooperates, with Vesuvius standing over the whole crossing to starboard. Ischia is a volcanic island with thermal springs, better value than Capri and considerably more relaxed about everything.",
      highlight: "Crossing the Gulf with Vesuvius over your shoulder",
    },
    {
      dayNumber: 5,
      title: "Ischia to Procida",
      fromPort: "Ischia",
      toPort: "Procida",
      nauticalMiles: 8,
      description:
        "A very short hop to the smallest and least developed of the three islands. Marina Corricella is a semicircle of ochre and pink fishermen's houses stacked around a harbour that has been photographed more than it has been visited. The nicest evening of the week and by a distance the cheapest.",
      highlight: "Corricella's stacked pastel houses at dusk",
    },
    {
      dayNumber: 6,
      title: "Procida to Sorrento",
      fromPort: "Procida",
      toPort: "Sorrento",
      nauticalMiles: 21,
      description:
        "Back south-east across the Gulf, crossing the traffic lanes at right angles and keeping well clear of the Naples commercial approaches. Sorrento sits on a cliff above its marina with the whole bay laid out in front of it, and it is the most convenient last-night stop before the run back to Salerno.",
      highlight: "The bay of Naples laid out from the Sorrento cliff",
    },
    {
      dayNumber: 7,
      title: "Sorrento to Salerno",
      fromPort: "Sorrento",
      toPort: "Marina d'Arechi, Salerno",
      nauticalMiles: 25,
      description:
        "Round the Sorrentine peninsula and back east along the Amalfi coast, seeing the whole of it in one run in the opposite direction to the way you started. Leave early — the handover slot does not move, and this coast is not one to be rushing along.",
      highlight: "The entire Amalfi coast in a single morning's run",
    },
  ],

  // ---------------------------------------------------------------- Aeolians
  "aeolian-classic": [
    {
      dayNumber: 1,
      title: "Milazzo to Vulcano",
      fromPort: "Milazzo",
      toPort: "Vulcano",
      nauticalMiles: 20,
      description:
        "North off the Sicilian mainland and into the archipelago. The most exposed crossing of the week, and the first taste of what the channels do to the wind — it accelerates noticeably as you come between Vulcano and Lipari, so reef before you are in it rather than after. Vulcano announces itself by smell before you see it clearly.",
      highlight: "Smelling the sulphur before the island is properly in sight",
    },
    {
      dayNumber: 2,
      title: "Vulcano to Lipari",
      fromPort: "Vulcano",
      toPort: "Lipari",
      nauticalMiles: 8,
      description:
        "A short hop through the gap, which reliably delivers more wind than the forecast because of the funnelling between two high islands. Worth sailing properly rather than motoring. Lipari is the largest island and the only one with real services, so this is the resupply stop and the one night with a proper choice of restaurants.",
      highlight: "The Lipari–Vulcano gap doubling the forecast wind",
    },
    {
      dayNumber: 3,
      title: "Lipari to Salina",
      fromPort: "Lipari",
      toPort: "Santa Marina Salina",
      nauticalMiles: 12,
      description:
        "North-west to the greenest island in the group, which has water where the others do not and grows capers and malvasia because of it. Sail round to Pollara in the afternoon: a half-collapsed crater open to the sea, where Il Postino was filmed, and a spectacular if completely exposed swim stop.",
      highlight: "Pollara's flooded half-crater, straight out of the film",
    },
    {
      dayNumber: 4,
      title: "Salina to Panarea",
      fromPort: "Santa Marina Salina",
      toPort: "Panarea",
      nauticalMiles: 15,
      description:
        "East to the smallest and most fashionable of the seven. Anchoring is prohibited in the zones around Panarea and Basiluzzo and the laid buoys must be used instead — in August they fill by early afternoon, so arrive before three. Cala Junco on the south-east corner is the best-looking anchorage in the archipelago.",
      highlight: "Cala Junco, and the Basiluzzo stack standing offshore",
    },
    {
      dayNumber: 5,
      title: "Panarea to Stromboli, and the night approach",
      fromPort: "Panarea",
      toPort: "Stromboli",
      nauticalMiles: 13,
      description:
        "The day the trip is built around. Sail up in the afternoon, eat early, then move round to stand off the Sciara del Fuoco after dark — the scar on the north-west flank where the eruptions run down into the sea. The volcano throws material every fifteen or twenty minutes, and from a mile offshore in the dark it is the most extraordinary thing in Mediterranean sailing. Head torches on red, warm layers on, engine running.",
      highlight: "Stromboli erupting into the sea, watched from a mile off in the dark",
    },
    {
      dayNumber: 6,
      title: "Stromboli to Lipari",
      fromPort: "Stromboli",
      toPort: "Lipari",
      nauticalMiles: 24,
      description:
        "A long reach back south-west with a tired and very happy crew. This is the leg where the whole group finally sails the boat properly, because by now everybody knows their job. Back into Lipari for the last island night and the last decent restaurant.",
      highlight: "The best-sailed leg of the week, because the crew has finally clicked",
    },
    {
      dayNumber: 7,
      title: "Lipari to Milazzo",
      fromPort: "Lipari",
      toPort: "Milazzo",
      nauticalMiles: 22,
      description:
        "South across the open water to the Sicilian mainland, timed for the handover. The archipelago stacks up astern the whole way, with Stromboli still smoking on the horizon behind the others, which is a fair summary of the week.",
      highlight: "Stromboli still smoking astern as Sicily comes up ahead",
    },
  ],

  // ------------------------------------------------------------ La Maddalena
  "maddalena-classic": [
    {
      dayNumber: 1,
      title: "Portisco to Cala Coticcio",
      fromPort: "Portisco",
      toPort: "Caprera",
      nauticalMiles: 15,
      description:
        "North out of the Costa Smeralda with the park permit aboard and the zoning map marked up. Cala Coticcio on the east side of Caprera is the anchorage people compare to Tahiti, reachable only from the water, and getting there on the first afternoon sets the tone for the rest of the week.",
      highlight: "Cala Coticcio, which you cannot reach any other way",
    },
    {
      dayNumber: 2,
      title: "Caprera to Spargi",
      fromPort: "Caprera",
      toPort: "Spargi",
      nauticalMiles: 10,
      description:
        "West through the middle of the archipelago, threading between islands with the granite sculpted into shapes that look deliberate. Cala Corsara on the south of Spargi is the classic stop. Short mileage on purpose — this ground is about the anchorages rather than the passages, and swimming is the point.",
      highlight: "Cala Corsara's water, which does not look real in photographs",
    },
    {
      dayNumber: 3,
      title: "Spargi to Santa Maria, past Budelli",
      fromPort: "Spargi",
      toPort: "Santa Maria",
      nauticalMiles: 8,
      description:
        "North past Budelli to see the Spiaggia Rosa from the water — you may not land on it or swim ashore, and the fines for doing so are substantial and enforced. The channel between Santa Maria, Razzoli and Budelli is one of the best-protected anchorages in the archipelago and a good place to be if the mistral is building.",
      highlight: "The pink beach from seaward, which is how it is meant to be seen",
    },
    {
      dayNumber: 4,
      title: "Santa Maria to Bonifacio",
      fromPort: "Santa Maria",
      toPort: "Bonifacio, Corsica",
      nauticalMiles: 14,
      description:
        "Across the Strait of Bonifacio, which is the decision point of the week: in a mistral it compresses and accelerates and this is not the day to cross. On a settled forecast it is a straightforward passage into the most dramatic harbour in the Mediterranean — a cleft in white cliffs that is not visibly there until you are lined up on it, opening into a fjord with the town on the clifftop above.",
      highlight: "The entrance to Bonifacio, invisible until you are committed to it",
    },
    {
      dayNumber: 5,
      title: "Bonifacio to Maddalena town",
      fromPort: "Bonifacio, Corsica",
      toPort: "La Maddalena",
      nauticalMiles: 16,
      description:
        "Back south across the Strait, ideally in the morning before the wind builds. Maddalena town is the only real settlement in the archipelago, with shops, cash machines and a Garibaldi museum on Caprera next door — he retired there and is buried on the island.",
      highlight: "Recrossing the Strait early, ahead of the afternoon wind",
    },
    {
      dayNumber: 6,
      title: "La Maddalena to Porto Cervo",
      fromPort: "La Maddalena",
      toPort: "Porto Cervo",
      nauticalMiles: 13,
      description:
        "South-east down to the Costa Smeralda proper. Porto Cervo is the other end of the yachting world and worth one evening for the spectacle, if not for the berthing rates. Anchoring in one of the bays just outside and taking the tender in is the move most crews make and the one we would recommend.",
      highlight: "Anchoring outside Porto Cervo and visiting by tender",
    },
    {
      dayNumber: 7,
      title: "Porto Cervo to Portisco",
      fromPort: "Porto Cervo",
      toPort: "Portisco",
      nauticalMiles: 9,
      description:
        "A very short final leg, leaving time for one more swim on the way. The granite coast on this last stretch is as good as anything further north, and arriving unhurried for the handover is a better end to the week than a dawn delivery.",
      highlight: "One last swim, with no need to hurry",
    },
  ],

  // ------------------------------------------------------ Ibiza, core version
  "ibiza-classic": [
    {
      dayNumber: 1,
      title: "Ibiza town to Cala Llonga",
      fromPort: "Marina Botafoch, Ibiza",
      toPort: "Cala Llonga",
      nauticalMiles: 8,
      description:
        "A short first afternoon north-east up the coast, leaving time for the handover and provisioning in town where the supermarkets are proper ones. Cala Llonga is a wide sandy bay with easy anchoring — and this is the first chance to practise the thing that matters most here: finding the pale sand and staying off the dark seagrass.",
      highlight: "First anchoring on sand rather than seagrass, done properly",
    },
    {
      dayNumber: 2,
      title: "Cala Llonga to Formentera",
      fromPort: "Cala Llonga",
      toPort: "Illetes, Formentera",
      nauticalMiles: 18,
      description:
        "South down the Ibiza coast and across the Es Freus channel, which can kick up a short chop when the breeze runs against the tide. Illetes is the reason people come — waist-deep water over white sand at the north tip of Formentera. The buoys here were reserved months ago; the protected zones are buoy-only and there is no alternative arrangement.",
      highlight: "The first sight of the Illetes sandbanks, which do not look real",
    },
    {
      dayNumber: 3,
      title: "Formentera and Espalmador",
      fromPort: "Illetes, Formentera",
      toPort: "Espalmador",
      nauticalMiles: 4,
      description:
        "Barely a passage at all — a mile north to the uninhabited island between the two, with a sheltered anchorage on its south side. A day for swimming, for taking the tender ashore, and for cycling Formentera if anyone wants to. Watch the forecast for a levante: these anchorages are wide open to the east and the answer to an easterly is to move rather than to hope.",
      highlight: "An uninhabited island a mile from one of the busiest beaches in Spain",
    },
    {
      dayNumber: 4,
      title: "Espalmador to Es Vedrà",
      fromPort: "Espalmador",
      toPort: "Cala d'Hort",
      nauticalMiles: 21,
      description:
        "Back north and round the southern tip of Ibiza to the west coast, which is a genuine sailing day with the afternoon embat filling in on the beam. Es Vedrà is a 400-metre limestone island rising straight out of the sea off the south-west corner, and it is startling at water level in a way that photographs consistently fail to convey.",
      highlight: "Es Vedrà standing 400 metres out of the water beside you",
    },
    {
      dayNumber: 5,
      title: "Cala d'Hort to Cala Comte",
      fromPort: "Cala d'Hort",
      toPort: "Cala Comte",
      nauticalMiles: 9,
      description:
        "A short run up the west coast to the anchorage most people would name if asked where to watch the sun go down in the Balearics. Anchor off, swim ashore, and stay aboard for the sunset rather than fighting for a table — the view is better from the boat anyway.",
      highlight: "The west-coast sunset, watched from the boat rather than the beach bar",
    },
    {
      dayNumber: 6,
      title: "Cala Comte to Cala Salada",
      fromPort: "Cala Comte",
      toPort: "Cala Salada",
      nauticalMiles: 7,
      description:
        "A gentle final full day, north past San Antonio to a pine-backed cove that is quieter than anywhere else on this coast. Good snorkelling on the rocks at either side of the bay, and a last long lunch at anchor before the run back around the top of the island.",
      highlight: "A last quiet anchorage before the boat goes back",
    },
    {
      dayNumber: 7,
      title: "Cala Salada to Ibiza town",
      fromPort: "Cala Salada",
      toPort: "Marina Botafoch, Ibiza",
      nauticalMiles: 16,
      description:
        "Around the north of the island and back down the east coast for the handover, with Dalt Vila's walls coming up on the approach into the harbour. Leave enough time — the last morning always takes longer than anyone plans for.",
      highlight: "Dalt Vila's walls on the final approach",
    },
  ],

  // ------------------------------------------------------------- Ibiza, Crew
  "ibiza-crew": [
    {
      dayNumber: 1,
      title: "Meet the boat, Ibiza town",
      fromPort: "Marina Botafoch, Ibiza",
      toPort: "Talamanca",
      nauticalMiles: 3,
      description:
        "Everyone arrives, everyone meets, and the boat moves precisely far enough to be at anchor rather than on a pontoon. Talamanca is ten minutes from the marina and the right place for a first evening: swim off the back, sort out who is in which cabin, and get the safety brief done before anyone opens anything.",
      highlight: "First swim off the back of the boat, an hour after meeting everyone",
    },
    {
      dayNumber: 2,
      title: "Talamanca to Formentera",
      fromPort: "Talamanca",
      toPort: "Illetes, Formentera",
      nauticalMiles: 16,
      description:
        "The crossing everyone came for. South across the Es Freus with the breeze filling in, and everyone who wants to steer gets to steer — on a Crew week the sailing is a group activity rather than something the skipper does while you sunbathe. Illetes at the far end, on a buoy booked months ago.",
      highlight: "Everyone taking a turn on the helm on the way across",
    },
    {
      dayNumber: 3,
      title: "Formentera day",
      fromPort: "Illetes, Formentera",
      toPort: "Espalmador",
      nauticalMiles: 4,
      description:
        "Hire bikes at La Savina and ride the length of the island, or stay on the boat and swim. Move up to Espalmador for the evening — uninhabited, sheltered on its south side, and the anchorage where this trip's group usually stops being a group of strangers.",
      highlight: "The evening at Espalmador, which is where the crew becomes a crew",
    },
    {
      dayNumber: 4,
      title: "Espalmador to Es Vedrà and the west coast",
      fromPort: "Espalmador",
      toPort: "Cala d'Hort",
      nauticalMiles: 21,
      description:
        "The longest sail of the week and a proper one, round the bottom of Ibiza and up to the south-west corner with the afternoon breeze on the beam. Es Vedrà at the end of it, anchored under a 400-metre rock, with a swim that everyone remembers.",
      highlight: "Anchoring under Es Vedrà after the week's best sail",
    },
    {
      dayNumber: 5,
      title: "Cala d'Hort to Cala Comte",
      fromPort: "Cala d'Hort",
      toPort: "Cala Comte",
      nauticalMiles: 9,
      description:
        "A short hop to the sunset coast, deliberately leaving the afternoon free. Cala Comte is the classic west-coast sundown, and the tender run ashore afterwards is the standard route into an Ibiza evening if the group wants one — with the boat as somewhere to come back to, which is the whole advantage of doing it this way.",
      highlight: "Sundown at Cala Comte, with the boat as your ride home",
    },
    {
      dayNumber: 6,
      title: "Cala Comte to Ibiza town",
      fromPort: "Cala Comte",
      toPort: "Marina Botafoch, Ibiza",
      nauticalMiles: 18,
      description:
        "North around the top of the island and back down to town, with a long swim stop at Cala Salada on the way and everyone sailing the boat properly by now. Back on the pontoon in the evening for the last night, with Dalt Vila lit up above the harbour.",
      highlight: "A crew that can actually sail the boat, on the last leg",
    },
  ],
};
