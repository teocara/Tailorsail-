# Tailorsail

Sailing holidays in **Italy, Ibiza and Croatia**, sold by a company that can be run by two people.

Tailorsail contracts charter capacity from local operators at negotiated net rates, packages it with a location-specific preparation programme, courses and concierge support, and resells it. It is a **merchant, not an agent** — it takes inventory risk and sets its own price.

This repository is a working MVP: a Next.js app with a real database, seeded with content for six cruising grounds, where you can search trips in plain English, see a genuinely all-in price, book, and then run the whole business from `/ops`.

---

## Run it

```bash
npm install
cp .env.example .env      # DATABASE_URL="file:./dev.db"
npm run db:push
npm run db:seed
npm run dev               # http://localhost:3000
```

**No API key needed.** Every AI-generated artefact — itineraries, readiness programmes, the seeded concierge thread — ships in the seed, so a fresh clone gives you a fully populated site with zero API calls. Live AI features detect the missing key and either fall back to a deterministic parser or say plainly that they need configuring. Set `ANTHROPIC_API_KEY` in `.env` to turn them on.

### Worth looking at

| Page | Why |
|---|---|
| `/` | Natural-language search. Try *"Croatia in August, six of us, none of us have sailed"* |
| `/trips/dalmatia-first-week-skippered` | The all-in price breakdown — the trust pillar made concrete |
| `/destinations/ibiza-formentera` | A destination briefing and its full preparation programme |
| `/bookings/TS-8F2K` | A live booking: readiness checklist, and a concierge thread showing both an automated answer and a human escalation |
| `/crew` | The youth sub-brand, sharing the layout shell with a different accent palette |
| `/host` | Operator onboarding — paste a boat description, get a structured listing back |
| `/ops` | **The cockpit.** One queue, everything pre-triaged |
| `/ops/margin` | Where the money actually comes from |

---

## The two ideas this is built around

### 1. Two people, and AI does the operations

Every function that would normally need staff is either automated or eliminated:

| Would need a team | What happens instead |
|---|---|
| Partnerships | Operator writes free text → `parse-listing` extracts a structured listing and names the exact missing documents → one click to approve |
| Rate buying | `rate-negotiator` drafts offers citing real comparables from every net rate we have ever paid |
| Revenue management | `lib/pricing/yield.ts` reprices every departure; `pricing-advisor` writes the explanation a founder needs to approve it |
| Content | `generate-itinerary` and `generate-readiness` write from destination briefings, validated against a schema, human-reviewed once |
| Support | `concierge` drafts every reply; safe ones auto-send, the rest escalate with the draft ready |
| Ops management | `/ops` — one prioritised queue, each row carrying context, a recommendation and a draft |

**Where the human stays in the loop.** The concierge auto-sends *only* informational answers — weather, packing, itinerary, skill level, what's included. Anything touching price, cancellation, refunds, safety, medical matters, or a complaint escalates, no matter how confident the model was. That gate is deterministic code in `lib/ai/concierge.ts`, not a judgement the model makes in the moment, and it is exhaustively tested.

### 2. Margin is the business model

Tailorsail buys at a net rate and sells at its own price. Both levers have real machinery:

**Cost down** — tiered net rates by operator (`STANDARD`/`PREFERRED`/`EXCLUSIVE`), pre-committed allotment for the deepest discount, automated capture of distressed and repositioning inventory, and AI-drafted negotiation backed by every rate we have ever agreed. That last one compounds: the more we book, the better we buy.

**Price up** — a deterministic yield engine (`sellPrice = netRate × margin × season × leadTime × occupancy × demand`, clamped to a floor and a ceiling), good-better-best tiering, and add-on attach. Attach is the honest big lever: it raises order value by adding something the traveller wanted rather than charging more for the same week.

**The strongest defence of margin is that a packaged week is not price-comparable to a bare charter** — which is what turns the content pillar from marketing spend into a commercial asset.

---

## How "transparent pricing" and "maximise price" coexist

They are compatible, but only under the merchant model, and only if the copy is precise. Transparency here means **the number you see is the number you pay** — every mandatory extra, tax and deposit disclosed before booking, nothing appearing at the dock. It does *not* mean publishing our cost, and no retailer does.

Three things keep that honest, and they are enforced in code rather than in a style guide:

1. **Cost cannot reach a customer surface.** Two gates, because one was not enough. `buildCustomerQuote()` gates the charter price — its return type has no cost or margin field, and internal price components are filtered inside it. But pages also read courses, add-ons and departures directly, and a bare `findMany()` returns the whole row: that is how our cost on a course once reached the homepage's payload while every pricing test passed. So `lib/public-select.ts` holds the selects every public route uses for those models, a Playwright test walks **every public route** on a running server, and `npm run test:export` scans **every file in the published build** — HTML, RSC payload, JSON catalogue and JS chunk alike — for the same field names.
2. **No invented reference prices.** A struck-through "was" price renders only when `PriceHistory` proves it was genuinely charged and was the lowest in the prior 30 days — the EU Omnibus rule. `referencePriceCents()` returns `null` rather than inventing a saving.
3. **Pricing signals are about the departure, never the shopper.** Season, lead time, occupancy, destination demand. No inferred willingness-to-pay profiling.

---

## Architecture

```
app/
  page.tsx                    home, natural-language search
  trips/                      index (faceted + AI search), detail, booking form
  destinations/               briefings and full readiness programmes
  crew/  courses/  operators/  host/
  bookings/[reference]/       checklist + concierge thread
  ops/                        queue, margin, pricing rules, AI spend
  actions/                    server actions (search, booking, concierge, host, ops)

lib/
  pricing/
    quote.ts                  THE gate — customer-facing quote, no cost fields
    yield.ts                  deterministic revenue management
    margin.ts                 analytics over frozen booking snapshots
  ai/
    client.ts                 single entry point: meters, validates, degrades
    concierge.ts              drafting + the deterministic auto-send gate
    generate-itinerary.ts     generate-readiness.ts   parse-listing.ts
    rate-negotiator.ts        pricing-advisor.ts      trip-finder.ts
    triage.ts                 nightly sweep (no API key needed)
  trips.ts                    the single trip-search path (the query half)
  trip-filters.ts             its pure half — shared with the browser
  trip-index.ts               client-side filtering of the prebuilt catalogue
  trip-pricing.ts             the precomputed quotes a trip page can show
  static-mode.ts              which build this is, and what that changes
  render-mode.ts              per-request rendering, server build only
  verification.ts             trust badges derived from data, never authored
  yield-run.ts  ops.ts  session.ts  money.ts

scripts/
  build-trip-index.ts         writes public/trip-index.json
  verify-trip-index.ts        fails the build if it disagrees with findTrips
  serve-export.mjs            serves out/ the way GitHub Pages does
  yield-run.ts  triage-run.ts

prisma/
  schema.prisma               money is always integer cents
  seed.ts  seed-data/         6 destinations, 8 operators, 18 trips, 216 departures
```

### Decisions worth knowing

- **Money is always integer euro cents.** Never a float. `splitCents()` divides remainder-safe so a per-person figure multiplies back to the total.
- **The yield engine is deterministic.** Same inputs, same price, always — which is what makes it testable, previewable in `/ops/pricing`, and explainable after the fact. Claude *narrates* price moves; it never computes them. Arithmetic that decides what someone pays does not belong in a probabilistic model.
- **Bookings freeze their commercial snapshot.** Net rate, sell price, add-on cost and margin are copied onto the booking row at the moment it is taken, so a later yield run cannot retroactively change what a customer owes or what we think we earned.
- **Trust badges are derived, not authored.** Expiry automatically downgrades a badge, and `findTrips` gates on verification — so an operator whose insurance lapses drops out of search everywhere at once. There is a seeded operator in exactly this state to prove it.
- **AI output never writes silently.** Generated content lands with `source: AI_GENERATED` and a null `reviewedAt`; `/ops` surfaces what nobody has read.
- **Guardrails escalate strain, not routine.** A clamped price is published — it is inside the band by construction — and only a clamp more than 15% past the bound opens a queue item. Escalating every routine clamp would put 44 rows in front of two people every morning and bury the five that matter.

---

## Testing

```bash
npm test            # 116 unit tests
npm run test:e2e    # 15 Playwright tests against a dev server
npm run build       # typecheck + production build
npm run build:static && npm run test:export   # the published build, audited as published
```

`test:export` is the one worth knowing about. It walks the built `out/`
directory and asserts that **no published file** — HTML, RSC payload, JSON
catalogue or JS chunk — contains a cost or margin field name. Auditing the
files rather than a render matters now that client components receive
precomputed quotes as props: those land in the RSC payloads, which a test that
only reads rendered HTML never opens. Confirmed by injection — leaking a net
rate across the client boundary fails it.

Unit tests cover the parts where being wrong is expensive: the quote arithmetic and its cost-leak guarantee, every yield multiplier plus floor/ceiling clamping, margin roll-ups, the Omnibus reference-price rule, verification expiry, filter composition, and the concierge routing policy across every category the schema can produce.

The AI modules are tested through their schemas — an implausible generation (a 400-mile day sail, a phase the UI cannot render, an invented commercial tier) is rejected rather than written.

---

## Operations

```bash
npm run build:static # prerender the whole site to out/ for GitHub Pages
npm run serve:static # serve out/ the way Pages does, under /Tailorsail-
npm run yield:run    # reprice every future departure (cron-able)
npm run triage:run   # find expiring docs, slow sellers, distressed inventory
npm run db:studio    # inspect the database
npm run db:reset     # wipe and reseed
```

Both scripts are deterministic and need no API key — the *finding* is SQL and arithmetic. Claude enriches the resulting tasks with drafts.

---

## What is deliberately not built

- **No payment processing.** Bookings are requests; no card details are collected anywhere.
- **No real authentication.** `lib/session.ts` is a cookie stub that falls back to the seeded demo traveller, shaped like real auth so Auth.js drops in later. `/ops` is not access-controlled.
- **No email.** Confirmations and operator chases exist as ops tasks, not messages.
- **No physical boat inspection.** This one is a business limit, not a scope cut, and the product is explicit about it: verification is document-based (licence, insurance with expiry, safety declaration), continuously re-checked, and the badge copy says exactly what was checked. It never implies anyone visited the boat. A physical-inspection tier is a later, margin-funded addition.

Migrations start at the next milestone — this build uses `prisma db push`.

---

## The published build

`.github/workflows/pages.yml` prerenders the site to GitHub Pages. It is the
same application, not a cut-down one: all 18 trips, the six cruising-ground
briefings, the courses, the operators, the seeded bookings and the four ops
screens, with search, faceted filters, party-size and departure repricing and
the readiness checklist all working. What it cannot do is write — booking,
concierge, host applications and the ops actions keep their controls, disabled,
each saying what it would do locally.

Three things make that possible, and they are the parts worth reading:

- **`lib/render-mode.ts`** — `force-dynamic` cannot be conditional (Next reads
  that config by static analysis), so `connection()` marks pages per-request in
  the server build and is skipped when prerendering.
- **`next.config.ts`** — the export fails if a single server action exists
  anywhere in the module graph, so the five action modules are aliased to a
  stub. The pages keep their ordinary imports.
- **`lib/trip-filters.ts`** — the pure half of trip search, shared by
  `findTrips` and by the browser filtering `trip-index.json`.
  `scripts/verify-trip-index.ts` runs both over the seeded database across 55
  filter sets and fails the build if they disagree.

Enabling it is a repository setting: **Settings → Pages → Source: GitHub
Actions**. The workflow also runs weekly, because `prisma/seed.ts` anchors on
`new Date()` — a reseed rolls the departure dates forward, and without it the
published site would slowly fill with weeks that have already sailed.
