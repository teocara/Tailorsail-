/**
 * Pre-trip readiness programmes, one per cruising ground.
 *
 * These are the committed output of `lib/ai/generate-readiness.ts` — generated
 * from the destination briefings, then read and edited by a human. They ship in
 * the seed so the app is fully populated with no API key, and so the quality
 * bar is visible in the repository rather than dependent on a model call at
 * runtime.
 *
 * The test of a good programme is whether the tasks would be wrong somewhere
 * else. A packing list that works for Ibiza and the Kvarner equally is a
 * packing list that is not doing its job.
 */

export type Phase = "BOOK" | "PREPARE" | "PACK" | "ARRIVE";

export interface ReadinessSeed {
  phase: Phase;
  title: string;
  body: string;
  weeksBefore: number;
}

export const READINESS: Record<string, ReadinessSeed[]> = {
  // ---------------------------------------------------------------- Dalmatia
  dalmatia: [
    {
      phase: "BOOK",
      title: "Decide who is skippering, and be honest about it",
      body: "Croatia requires a recognised sailing licence and a VHF certificate for bareboat charter, and the base will check both against the crew list before you leave the dock. If nobody aboard holds them, book skippered — it is not a downgrade, and on a first week it is usually the better trip anyway.",
      weeksBefore: 10,
    },
    {
      phase: "BOOK",
      title: "Agree the week's ambition with your crew",
      body: "Dalmatia can be a gentle four-hour-a-day cruise or a proper passage-making week out to Vis and back. Groups fall out when half of them wanted one and half the other. Have the conversation now, while the itinerary can still change.",
      weeksBefore: 9,
    },
    {
      phase: "PREPARE",
      title: "Learn what the maestral does to your day",
      body: "The maestral is a thermal wind: nothing in the morning, filling from the north-west late morning, 10-18 knots through the afternoon, gone by sunset. It means early starts are motoring and mid-afternoons are sailing. Plan your longest legs to leave around eleven rather than at first light.",
      weeksBefore: 6,
    },
    {
      phase: "PREPARE",
      title: "Read the bora and jugo briefing and know the difference",
      body: "The bora is a north-easterly that arrives fast and gusts hard; the jugo is a south-easterly that builds slowly over a day and brings swell and rain. One is a reason to already be in harbour, the other is a reason to change your plan for tomorrow. Both are well forecast — learn which is which before you need to know.",
      weeksBefore: 5,
    },
    {
      phase: "PREPARE",
      title: "Practise picking up a mooring line under power",
      body: "Almost every Dalmatian harbour is stern-to with a lazy line: you back in, someone hands you a slimy line from the bow, and you walk it forward. It is the single manoeuvre you will do most and the one that causes the most shouting. Ten minutes of watching videos now saves a genuinely bad first evening.",
      weeksBefore: 4,
    },
    {
      phase: "PREPARE",
      title: "Book Hvar and Palmižana if you are sailing in high season",
      body: "In July and August the popular harbours fill by mid-afternoon. ACI berths can be reserved in advance and it is worth doing for the nights you actually care about. For everything else, plan to be approaching by three rather than six.",
      weeksBefore: 3,
    },
    {
      phase: "PACK",
      title: "Soft bags only — there is nowhere to put a suitcase",
      body: "Yacht lockers are shaped for holdalls that collapse. A hard shell suitcase has to live on a bunk all week, which means someone is sleeping with it. This is the single most common packing mistake and the one your crew will least forgive.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Pack for a cold night watch as well as a hot afternoon",
      body: "August afternoons are 30 degrees and the same night at anchor with a breeze is not. A light fleece and a windproof layer take almost no space and get used every single evening. Deck shoes or trainers with a pale sole — dark soles mark the deck and the base will charge you for it.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Buy the Kornati permit before you go if you are heading north",
      body: "The national park charges a daily ticket per boat, and it is noticeably cheaper bought in advance than from the ranger who intercepts you inside the park. Telašćica is charged separately. If your route stays south around Hvar and Vis you need neither.",
      weeksBefore: 1,
    },
    {
      phase: "ARRIVE",
      title: "Do the handover properly, even though everyone is impatient",
      body: "Walk the boat with the base engineer and film it on your phone: seacocks, bilge pump, engine belt, gas, the position of every fire extinguisher, and any damage that already exists. The video takes four minutes and settles every deposit argument at the end of the week.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Provision in Split, not on the islands",
      body: "The supermarkets near the Split marinas are a fraction of island prices and carry far more choice. Buy the bulk of the week's food and all of your water before you leave. Restock fresh bread and fruit as you go — that part is a pleasure rather than a chore.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Agree the man-overboard plan before you leave the berth",
      body: "Everyone aboard should know where the lifebuoy is, how to stop the engine, and how to call for help on channel 16. Five minutes, once, on the first morning. Do it before the first drink rather than after.",
      weeksBefore: 0,
    },
  ],

  // ----------------------------------------------------------------- Kvarner
  kvarner: [
    {
      phase: "BOOK",
      title: "Take a skipper if you are sailing in May or October",
      body: "Shoulder-season Kvarner is the best sailing on this coast and carries materially higher bora risk. We only sell those weeks skippered, and the reason is the Velebit channel rather than caution for its own sake.",
      weeksBefore: 11,
    },
    {
      phase: "BOOK",
      title: "Check licences early — the base does not bend on this",
      body: "Bareboat charter in Croatia needs a recognised sailing licence and a VHF certificate. If yours is due for renewal, start now; replacements take weeks and the base will not release the boat without them.",
      weeksBefore: 10,
    },
    {
      phase: "PREPARE",
      title: "Learn to read a bora forecast, not just the wind number",
      body: "The bora is katabatic: cold air falls off the Velebit and accelerates through gaps, so the gusts are far above the average and the average is what the app shows you. Learn to look at the pressure gradient across the mountains and at the cap cloud on the ridge. A forecast of 15 knots in a bora setup can deliver 40 in the channel.",
      weeksBefore: 7,
    },
    {
      phase: "PREPARE",
      title: "Pick your bailout harbours for each leg before you sail it",
      body: "The way this coast is sailed safely is by always knowing where you would run to. For each planned passage, agree two harbours you could reach on the current forecast — one ahead, one behind. Write them on the chart. This is the single habit that makes the Kvarner a comfortable week rather than a tense one.",
      weeksBefore: 6,
    },
    {
      phase: "PREPARE",
      title: "Practise reefing until it is boring",
      body: "The bora arrives faster than you can discuss it. Reefing needs to be a thing your crew does without a committee meeting, in the dark, with wind noise. Rehearse it on a calm afternoon at the start of the week so the first real one is not the first attempt.",
      weeksBefore: 5,
    },
    {
      phase: "PREPARE",
      title: "Check the Osor bridge times into your route",
      body: "The swing bridge at Osor between Cres and Lošinj opens twice a day, morning and evening, and closes the channel the rest of the time. It is a lovely shortcut and a long detour if you miss it. Build the opening time into the plan rather than discovering it on the approach.",
      weeksBefore: 4,
    },
    {
      phase: "PACK",
      title: "Bring proper foul-weather gear, not a summer jacket",
      body: "The bora is cold, dry and relentless, and it takes the temperature down hard even in July. A real waterproof shell and a mid-layer are not optional on this coast the way they nearly are further south.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Gloves, and a hat that will not leave",
      body: "Sheets under load in 30 knots take the skin off unprotected hands within a day. Sailing gloves are cheap. Any hat you value needs a retaining cord or it belongs to the Adriatic now.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Soft bags, pale-soled shoes",
      body: "Same as anywhere: hard suitcases will not stow and dark soles mark the deck. Worth repeating because it is still the most common mistake.",
      weeksBefore: 1,
    },
    {
      phase: "ARRIVE",
      title: "Ask the base what the bora has done this week",
      body: "The people at Punat or Pula have watched the weather every day since April and know which channels have been unpleasant. Two minutes of local knowledge at handover is worth more than any amount of forecasting from home.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Set up the boat for heavy weather on day one",
      body: "Find the reefing lines, check the storm-jib arrangement, locate the emergency tiller, and stow everything on deck that could go over the side. Do it while it is calm and sunny, because the point of the exercise is that you will not be doing it later.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Brief the crew on VHF channel 16 and the lifebuoy",
      body: "Everyone aboard should be able to make a distress call and deploy the horseshoe without help. On this coast that briefing carries more weight than most, so do it before you leave the berth.",
      weeksBefore: 0,
    },
  ],

  // ----------------------------------------------------------- Amalfi/Pontine
  "amalfi-pontine": [
    {
      phase: "BOOK",
      title: "Reserve your berths now, especially Capri",
      body: "This is the constraint that shapes an Amalfi week. Berths are scarce, expensive, and gone months ahead in season. Decide the two or three nights you actually care about and book them today; improvise the rest around Procida and Ischia, which are easier and better value.",
      weeksBefore: 12,
    },
    {
      phase: "BOOK",
      title: "Budget for the marinas honestly",
      body: "A night on the Amalfi coast in August can cost more than a night in a hotel, and it surprises people who budgeted for the charter alone. Your Tailorsail price covers the boat and everything we listed — marina fees on this coast are paid as you go, and we would rather you knew the scale now.",
      weeksBefore: 10,
    },
    {
      phase: "PREPARE",
      title: "Accept that you will motor, and plan around it",
      body: "The Tyrrhenian in summer is light. Mornings are usually calm, the sea breeze fills in mid-afternoon at 8-15 knots, and a week with two proper sailing days is normal here. Groups who arrive expecting Croatia are disappointed; groups who arrive expecting a beautiful coastal cruise with some good sailing in it are not.",
      weeksBefore: 7,
    },
    {
      phase: "PREPARE",
      title: "Learn the ferry and hydrofoil pattern",
      body: "The Gulf of Naples has constant fast commercial traffic between Naples, Sorrento, Capri and Ischia, and the wash comes from all directions. Hydrofoils are fast and do not manoeuvre for you. Know the main routes, keep a proper lookout astern as well as ahead, and cross traffic lanes at right angles.",
      weeksBefore: 6,
    },
    {
      phase: "PREPARE",
      title: "Read the Punta Campanella zoning",
      body: "The marine reserve between Sorrento and Capri is zoned, and anchoring is prohibited in the strictest areas. Capri has further restrictions around the Faraglioni and the Blue Grotto. The Guardia Costiera is present and does enforce. Have the zones on the chart before you are looking for somewhere to stop.",
      weeksBefore: 5,
    },
    {
      phase: "PREPARE",
      title: "Decide whether the Pontine islands are in or out",
      body: "Ponza, Palmarola and Ventotene are the quietest and in some ways the best part of this ground, but they are a full open-water day north-west and want a settled forecast. It is a genuine either/or with the Amalfi coast in a one-week charter — pick one and do it properly.",
      weeksBefore: 4,
    },
    {
      phase: "PACK",
      title: "One outfit for a restaurant that has a dress code",
      body: "Capri and Positano are not a barefoot coastline in the evening. One shirt and one pair of shoes that are not deck shoes will get worn, and their absence will be felt.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Serious sun protection — this is the hottest ground we sell",
      body: "Little natural shade on deck, water that reflects everything back, and August temperatures in the mid-thirties. High-factor sunscreen, a proper hat, and a long-sleeved rash vest for swimming. Sunburn on day one ruins the remaining six.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Soft bags, pale-soled shoes, and a dry bag for the tender",
      body: "Standard yacht packing, plus a dry bag: many of the good stops here are anchor-and-dinghy rather than step-ashore, and phones do not enjoy that discovery.",
      weeksBefore: 1,
    },
    {
      phase: "ARRIVE",
      title: "Confirm every booked berth by phone on arrival",
      body: "Reservations on this coast go astray more often than they should, and the time to find out is at the base with a phone in your hand, not at six in the evening off Capri with a tired crew.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Provision at Salerno or Stabia",
      body: "Mainland supermarkets are far cheaper and better stocked than anything on Capri or the Amalfi shore. Load up before you leave; buy bread, tomatoes and mozzarella as you go, because that is genuinely one of the pleasures of this coast.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Set an early alarm for Capri",
      body: "If you do one thing on this trip, be off the Faraglioni at seven in the morning before the first hydrofoil arrives. It is a completely different island for about ninety minutes, and everyone who does it says it was the best part of the week.",
      weeksBefore: 0,
    },
  ],

  // ----------------------------------------------------------- Aeolian Islands
  "aeolian-islands": [
    {
      phase: "BOOK",
      title: "Decide whether you want the Stromboli night",
      body: "Standing off the Sciara del Fuoco after dark while the volcano erupts is the reason most people book this ground, and it means a late arrival and a night at anchor or under way rather than a comfortable harbour. It is worth it. But agree it as a crew now, because it shapes the whole week's routing.",
      weeksBefore: 10,
    },
    {
      phase: "BOOK",
      title: "Check who is joining, and how",
      body: "Hydrofoils link Milazzo to every island, so a crew member arriving a day late is solvable — but only in June to September when the service is frequent. In May and October the timetable thins out considerably.",
      weeksBefore: 9,
    },
    {
      phase: "PREPARE",
      title: "Understand what the channels do to the wind",
      body: "Air accelerating between two high islands can double in strength over a mile. The gap between Lipari and Vulcano and the channel north of Salina are both reliable for it, and the forecast will not show it because it is for open sea. The habit to build: reef before you enter a channel, shake it out on the other side.",
      weeksBefore: 7,
    },
    {
      phase: "PREPARE",
      title: "Practise anchoring in poor holding",
      body: "Volcanic sand looks like perfect anchoring ground and holds far worse than it appears. Anchors drag here that would hold anywhere else. Practise setting properly — plenty of scope, astern on the engine to dig in, and a transit ashore to check you are not moving — because you will need it every night.",
      weeksBefore: 6,
    },
    {
      phase: "PREPARE",
      title: "Plan an anchor watch for exposed nights",
      body: "Given the holding, on any night at anchor with wind forecast someone should be checking the transit and the chart plotter through the night. Agree the rota as a crew rather than leaving it to whoever wakes up worried.",
      weeksBefore: 5,
    },
    {
      phase: "PREPARE",
      title: "Read the Panarea anchoring restrictions",
      body: "Anchoring is prohibited in several zones around Panarea and Basiluzzo, where laid buoy fields must be used instead. In August those fill early. Know which they are and arrive before the middle of the afternoon.",
      weeksBefore: 4,
    },
    {
      phase: "PACK",
      title: "Head torches for everyone, with red light",
      body: "The Stromboli night is the point of the trip, and it involves moving around a dark deck. One torch per person, red mode so nobody destroys their night vision, and a spare set of batteries.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Warm layers for the night sail",
      body: "A Sicilian August afternoon is 33 degrees. Standing off Stromboli at one in the morning under way is not, and people who packed only for the afternoon spend that night below rather than watching the volcano.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Walking shoes if anyone wants the craters",
      body: "The volcano routes on Vulcano and Stromboli are on sharp volcanic scree, and Stromboli's summit route is regulated and requires a licensed guide, booked ahead. Deck shoes are not adequate footwear for either.",
      weeksBefore: 1,
    },
    {
      phase: "ARRIVE",
      title: "Provision heavily in Milazzo or Portorosa",
      body: "Island shops are small, expensive and sometimes shut. Buy the whole week on the mainland, including far more water than you think you need — this is the hottest, driest ground we sell and crews consistently underestimate it.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Book the Stromboli guide before you leave the dock",
      body: "If anyone wants the summit, it must be booked with a licensed guide in advance and the groups fill. Sort it at the base with wifi, not from an anchorage with one bar of signal.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Check the eruption reporting for the week",
      body: "Stromboli's activity varies and access restrictions change with it. The base will know the current status. It changes where you can stand off and how close is sensible, so ask before you plan the night.",
      weeksBefore: 0,
    },
  ],

  // ------------------------------------------------------------ La Maddalena
  "la-maddalena": [
    {
      phase: "BOOK",
      title: "Buy the national park permit through the base",
      body: "La Maddalena National Park requires a daily permit per boat. The charter base can arrange it with the booking and it is far less hassle than doing it yourself on arrival. Rangers do check, and the fine is many times the permit.",
      weeksBefore: 10,
    },
    {
      phase: "BOOK",
      title: "Agree whether Corsica is part of the plan",
      body: "Bonifacio is a spectacular day out and it means crossing the Strait, which is the windiest water in the region. It also means clearing into France. Decide now — it changes the paperwork you need and the flexibility you have if the mistral sets in.",
      weeksBefore: 9,
    },
    {
      phase: "PREPARE",
      title: "Learn how the mistral behaves in the Strait",
      body: "The mistral funnels between Corsica and Sardinia and accelerates as it compresses: 30 knots in the Strait with 18 in the open sea is routine, and it can hold for three days. It is well forecast. The skill is not surviving it — it is planning a week that does not need to cross the Strait on the day it blows.",
      weeksBefore: 7,
    },
    {
      phase: "PREPARE",
      title: "Study the park zoning map properly",
      body: "The archipelago is divided into zones with different rules: some no-anchor, some no-entry, some buoys-only. It is genuinely detailed and it is enforced. Have the current map aboard and marked before you arrive rather than working it out anchorage by anchorage.",
      weeksBefore: 6,
    },
    {
      phase: "PREPARE",
      title: "Know that Budelli's pink beach is off limits",
      body: "The Spiaggia Rosa is strictly protected: you may not land on it and you may not swim ashore from it. People still try, and the fines are substantial. You can see it perfectly well from the water, which is the intended arrangement.",
      weeksBefore: 5,
    },
    {
      phase: "PREPARE",
      title: "Plan a mistral week and a no-mistral week",
      body: "The archipelago is a superb place to sit out a blow — there is a sheltered corner for every wind direction. Sketch two routes before you go: the one you sail in settled weather, and the tucked-in version. Crews with a plan B enjoy a mistral; crews without one lose two days to arguing.",
      weeksBefore: 4,
    },
    {
      phase: "PACK",
      title: "Snorkelling kit, because the water justifies it",
      body: "Visibility here is the best of any ground we sell and the granite underwater is as good as the granite above it. Masks are the single most-used item people bring and the one most often forgotten.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "A windproof layer for the mistral days",
      body: "A mistral is dry and sunny and deceptively cold once it is blowing 25 knots across the deck. A light windproof shell makes the difference between a bracing day and a miserable one.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Cash for the park and the small harbours",
      body: "Park fees and some of the smaller island facilities still prefer cash, and the nearest reliable cash machine may be a day's sail away. Bring some euro in notes rather than assuming a card will do.",
      weeksBefore: 1,
    },
    {
      phase: "ARRIVE",
      title: "Confirm the permit is on the boat, not just paid for",
      body: "The paperwork needs to be aboard and produceable. Check it is physically there at handover along with the boat's registration and insurance documents.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Provision at Palau or Cannigione",
      body: "Both have proper supermarkets within walking distance of the marinas. The islands themselves have very little — Maddalena town has a few shops, and the rest have none at all.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Get the current mistral forecast at handover",
      body: "The base watches this every day. Ask them what the week looks like and which way they would route it. It is the single most useful conversation of the trip and it takes five minutes.",
      weeksBefore: 0,
    },
  ],

  // -------------------------------------------------------- Ibiza & Formentera
  "ibiza-formentera": [
    {
      phase: "BOOK",
      title: "Book Formentera's mooring buoys the day they open",
      body: "The protected areas around Illetes and Espalmador are buoy-only, the number of buoys is limited, and they are reserved through an online system that fills fast for July and August. There is no turning-up-and-hoping version of this. If Formentera is the reason you are coming, this is the task that matters most.",
      weeksBefore: 12,
    },
    {
      phase: "BOOK",
      title: "Sort out who is sharing with whom",
      body: "On a Crew departure you may be sharing a cabin with someone you have not met, and on a private booking someone is getting the forepeak. Both are fine; both are better agreed now than at ten at night on the first evening.",
      weeksBefore: 9,
    },
    {
      phase: "PREPARE",
      title: "Learn to anchor on sand, not on seagrass",
      body: "Posidonia is protected under Balearic law and anchoring on it is illegal and heavily fined. This is the rule that catches out more visiting crews than any other here. In practice it means reading the bottom before you drop: dark patches are seagrass, pale patches are sand, and you want to be over pale. Get comfortable with this before you need to do it in a busy anchorage with people watching.",
      weeksBefore: 7,
    },
    {
      phase: "PREPARE",
      title: "Put a seagrass-mapping app on someone's phone",
      body: "Several apps overlay aerial survey data showing exactly where the posidonia beds are. On this ground they are effectively required kit rather than a nice extra. Download it, learn to read it, and make sure it is on more than one phone.",
      weeksBefore: 6,
    },
    {
      phase: "PREPARE",
      title: "Understand the embat, and what changes when it does not blow",
      body: "The normal summer pattern is a south-westerly thermal filling in through the afternoon at 10-16 knots — easy, pleasant sailing. The two that change the plan are the tramuntana from the north, which makes the north coast unpleasant, and the levante from the east, which pushes swell into the Formentera anchorages and is the usual reason to move.",
      weeksBefore: 5,
    },
    {
      phase: "PREPARE",
      title: "Have a levante plan for the Formentera nights",
      body: "The Illetes anchorages are beautiful and completely exposed to the east. If a levante is forecast overnight, the answer is to move rather than to hope. Know in advance where you would go — the south side of Espalmador or back across to Ibiza — so the decision is quick.",
      weeksBefore: 4,
    },
    {
      phase: "PACK",
      title: "Reef-safe sunscreen and a rash vest",
      body: "You will be in and out of the water constantly and the middle-of-the-day sun here is unforgiving. A long-sleeved rash vest means you can swim at two in the afternoon without paying for it later, and reef-safe formulations matter in protected water.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "One good evening outfit, and shoes that are not flip-flops",
      body: "Ibiza's evenings range from a beach bar to somewhere with a door policy. One outfit that covers the second case is enough, and it takes up almost no room.",
      weeksBefore: 2,
    },
    {
      phase: "PACK",
      title: "Soft bags, a dry bag, and a waterproof phone pouch",
      body: "Almost everything here is anchor-and-swim or anchor-and-dinghy rather than step-ashore. A dry bag and a phone pouch get used every single day, and hard suitcases still will not stow.",
      weeksBefore: 1,
    },
    {
      phase: "ARRIVE",
      title: "Check the buoy reservations are on the boat",
      body: "Have the confirmations saved offline on more than one phone. Signal in the Formentera anchorages is patchy, and a booking you cannot produce is a booking you do not have.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Provision in Ibiza town before you cross",
      body: "Formentera has one small supermarket at La Savina and island prices throughout. Buy the week in Ibiza, and buy more water than seems reasonable — everyone underestimates it and the swimming makes it worse.",
      weeksBefore: 0,
    },
    {
      phase: "ARRIVE",
      title: "Agree the daily rhythm with your crew on night one",
      body: "The thing that makes or breaks this week is whether everyone wants the same balance of sailing, swimming and late nights. Ten minutes on the first evening agreeing roughly what each day looks like prevents the entire category of problem where half the boat wants to leave at nine and half is asleep.",
      weeksBefore: 0,
    },
  ],
};
