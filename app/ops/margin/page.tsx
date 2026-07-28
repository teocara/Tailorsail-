import { loadBookingSnapshots, loadInventoryHealth } from "@/lib/ops-queries";
import {
  attachRate,
  marginByDimension,
  summarise,
  type MarginDimension,
} from "@/lib/pricing/margin";
import { formatCents, formatPct } from "@/lib/money";
import { Card, Container, Section, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Margin" };

const DIMENSIONS: { key: MarginDimension; title: string; blurb: string }[] = [
  {
    key: "destination",
    title: "By destination",
    blurb: "Where the margin actually comes from.",
  },
  {
    key: "operator",
    title: "By operator",
    blurb:
      "Whose terms are working. A tier that stops earning its discount shows up here first.",
  },
  {
    key: "acquisition",
    title: "By how we bought it",
    blurb:
      "Whether pre-committing to allotment is beating buying on request — the core bet of the merchant model.",
  },
  {
    key: "line",
    title: "Core vs Crew",
    blurb:
      "Cabin charters sell a boat by the berth and should yield more per hull.",
  },
];

/**
 * The margin dashboard.
 *
 * Everything here reads the frozen commercial snapshot on each booking rather
 * than recomputing from current departure prices — a booking's economics are
 * whatever they were when it was taken, and a later yield run must not
 * retroactively rewrite what we think we earned.
 */
export default async function MarginPage() {
  const [bookings, health] = await Promise.all([
    loadBookingSnapshots(),
    loadInventoryHealth(),
  ]);

  const overall = summarise(bookings);
  const attach = attachRate(bookings);

  return (
    <Section className="!py-8">
      <Container>
        <Card className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <Stat
              label="Revenue"
              value={formatCents(overall.revenueCents)}
              hint={`${overall.bookings} bookings`}
            />
            <Stat label="Cost of sales" value={formatCents(overall.costCents)} />
            <Stat
              label="Gross margin"
              value={formatCents(overall.marginCents)}
            />
            <Stat
              label="Blended take rate"
              value={formatPct(overall.takeRate)}
              hint="Margin as a share of revenue"
            />
            <Stat
              label="Attach rate"
              value={formatPct(attach)}
              hint="Bookings that bought an extra"
            />
          </div>

          <div className="mt-6 grid gap-6 border-t border-[var(--color-line)] pt-5 sm:grid-cols-3">
            <Stat label="Average order value" value={formatCents(overall.aovCents)} />
            <Stat
              label="Berths sold, future"
              value={String(health.soldBerths)}
              hint={`against ${health.committedBerths} committed`}
            />
            <Stat
              label="Departures outside band"
              value={String(health.belowFloor + health.aboveCeiling)}
              hint={`${health.belowFloor} below floor, ${health.aboveCeiling} above ceiling`}
            />
          </div>
        </Card>

        {bookings.length === 0 ? (
          <Card className="mt-8 p-8 text-sm text-[var(--color-ink-muted)]">
            No bookings yet, so there is nothing to break down. Take a booking on
            the public site and this fills in.
          </Card>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {DIMENSIONS.map((dimension) => {
              const rows = marginByDimension(bookings, dimension.key);
              return (
                <Card key={dimension.key} className="overflow-hidden">
                  <div className="border-b border-[var(--color-line)] px-5 py-4">
                    <p className="font-[family-name:var(--font-display)] text-lg">
                      {dimension.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                      {dimension.blurb}
                    </p>
                  </div>

                  <div className="scroll-x">
                    <table className="w-full min-w-[26rem] text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                          <th className="px-5 py-2 font-medium">&nbsp;</th>
                          <th className="px-3 py-2 text-right font-medium">
                            Bookings
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Revenue
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Margin
                          </th>
                          <th className="px-5 py-2 text-right font-medium">
                            Take
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.key}
                            className="border-t border-[var(--color-line)]"
                          >
                            <td className="px-5 py-2.5">{row.label}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {row.bookings}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatCents(row.revenueCents)}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatCents(row.marginCents)}
                            </td>
                            <td className="px-5 py-2.5 text-right tabular-nums">
                              {formatPct(row.takeRate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="mt-8 p-6">
          <p className="font-[family-name:var(--font-display)] text-lg">
            How these numbers are built
          </p>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Margin is revenue minus what we owe the operator and the add-on
            suppliers, taken from the snapshot frozen on each booking at the
            moment it was made. Take rate is margin as a share of revenue, not a
            markup on cost — so a 30% take rate means we keep 30 cents of every
            euro the customer pays, which is the number to compare against an
            agency commission. None of this is visible on any customer surface:
            the only pricing function the public site can call returns a quote
            with no cost field on it at all.
          </p>
        </Card>
      </Container>
    </Section>
  );
}
