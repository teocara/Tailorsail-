import Link from "next/link";
import { findTrips } from "@/lib/trips";
import { TripGrid } from "@/components/trip-card";
import {
  ButtonLink,
  Card,
  Container,
  EmptyState,
  Eyebrow,
  GradientHero,
  Section,
} from "@/components/ui";
import { perRequest } from "@/lib/render-mode";

export const metadata = {
  title: "Tailorsail Crew",
  description:
    "Cabin charters and flotillas in Ibiza and Croatia for travellers in their twenties. Solo travellers welcome — most of the boat books that way.",
};

const FAQ = [
  {
    q: "I'm booking on my own. Is that weird?",
    a: "It is the normal way to do this. On a typical Crew departure most of the boat has booked solo or in pairs, and nobody knows each other on the first evening. By the second night at anchor that has stopped being true — it happens on every trip and it is genuinely the best part of the format.",
  },
  {
    q: "Who am I sharing a cabin with?",
    a: "Someone of the same gender, unless you have booked with a friend and asked to share. We match before departure and tell you who it is. If you would rather not share at all, you can book the second berth in your cabin and have it to yourself.",
  },
  {
    q: "What's the age range, really?",
    a: "Most people are 23 to 32. The published range is 21 to 35 and we hold to it, because a boat where one person is a decade outside the group is not fun for them or for anybody else.",
  },
  {
    q: "Do I need to know how to sail?",
    a: "No, and most people don't. There is a qualified skipper aboard who runs the boat. You will be asked to help — pulling a rope, taking the helm, tying up — and by the end of the week most people can do a useful amount. That is part of the trip rather than a chore.",
  },
  {
    q: "How much drinking is involved?",
    a: "As much or as little as you want. Ibiza departures usually involve two or three big nights and several quiet ones at anchor. Nobody drinks while we are under way, which is not negotiable, and the skipper's call on that is final.",
  },
  {
    q: "What does the price actually cover?",
    a: "Your berth, the skipper, the boat, and the mooring fees on the nights we are in a marina. Food and drink aboard are shared in a kitty the group agrees on day one — usually €120 to €180 for the week. Everything payable is itemised on the trip page before you book.",
  },
];

export default async function CrewPage() {
  await perRequest();
  const trips = await findTrips({ crewOnly: true, sort: "date" });

  return (
    <div data-brand="crew">
      <GradientHero from="#2a1230" to="#f2703f" className="text-white">
        <Container className="relative py-20 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/75">
            Tailorsail Crew
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.08] sm:text-6xl">
            A cabin each, a boat full of people you haven&rsquo;t met yet
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90">
            Six and seven-day cabin charters in Ibiza, Formentera and the
            Dalmatian islands, for travellers in their twenties. Book solo —
            most of the boat does.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#departures">See departures</ButtonLink>
            <Link
              href="#how"
              className="inline-flex items-center rounded-full border border-white/40 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              How it works
            </Link>
          </div>
        </Container>
      </GradientHero>

      {/* ------------------------------------------------------ How it works */}
      <Section id="how">
        <Container>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                title: "Book a berth, not a boat",
                body: "You pay for your cabin. We fill the rest of the boat with people in the same age range doing the same thing.",
              },
              {
                title: "A skipper runs it",
                body: "A professional skipper handles the sailing and the route, and adjusts both around the weather. You help as much as you want to.",
              },
              {
                title: "The boat is the hotel",
                body: "You wake up somewhere different every day, swim off the back before breakfast, and never pack a bag mid-trip.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  {item.title}
                </h2>
                <p className="mt-2 text-[var(--color-ink-muted)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* -------------------------------------------------------- Departures */}
      <Section id="departures" className="bg-[#fff8f4]">
        <Container>
          <Eyebrow>Departures</Eyebrow>
          <h2 className="mt-2 text-3xl">
            {trips.length} Crew {trips.length === 1 ? "trip" : "trips"} running
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--color-ink-muted)]">
            Concentrated in Ibiza and Hvar, because that is where this format
            works. Each one is the same boat, the same skipper and the same
            group for the whole week.
          </p>

          <div className="mt-8">
            {trips.length > 0 ? (
              <TripGrid trips={trips} />
            ) : (
              <EmptyState title="No Crew departures with space right now">
                <p>
                  They sell out early in the season.{" "}
                  <Link
                    href="/trips"
                    className="text-[var(--accent-strong)] hover:underline"
                  >
                    Browse everything else
                  </Link>
                  .
                </p>
              </EmptyState>
            )}
          </div>
        </Container>
      </Section>

      {/* --------------------------------------------------------- Solo note */}
      <Section>
        <Container>
          <Card className="grid gap-8 p-8 lg:grid-cols-[1.2fr_1fr] lg:p-10">
            <div>
              <Eyebrow>Booking solo</Eyebrow>
              <h2 className="mt-2 text-2xl">
                We match you into the group before you go
              </h2>
              <p className="mt-3 text-[var(--color-ink-muted)]">
                About a fortnight before departure we introduce the boat over a
                group thread: who is coming, where everyone is flying from, who
                is sharing with whom. It means the first evening starts several
                steps in rather than at introductions, which is the part people
                are actually nervous about.
              </p>
              <p className="mt-3 text-[var(--color-ink-muted)]">
                If the mix is wrong — one person a decade outside the group, a
                stag party mixed in with solo travellers — we move people rather
                than let a boat go out badly matched. It is the single thing
                that most determines whether the week works.
              </p>
            </div>

            <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-sunk)] p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                A typical Crew boat
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-ink-muted)]">
                <li>8 to 10 people, 4 or 5 cabins</li>
                <li>Roughly half booked solo, half in pairs</li>
                <li>Usually five or six nationalities</li>
                <li>Most people 23 to 32</li>
                <li>Nobody has sailed before, on most departures</li>
              </ul>
            </div>
          </Card>
        </Container>
      </Section>

      {/* --------------------------------------------------------------- FAQ */}
      <Section className="bg-[#fff8f4]">
        <Container>
          <Eyebrow>Straight answers</Eyebrow>
          <h2 className="mt-2 text-3xl">The things people actually ask</h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {FAQ.map((item) => (
              <Card key={item.q} className="p-6">
                <h3 className="font-[family-name:var(--font-display)] text-lg">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                  {item.a}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </div>
  );
}
