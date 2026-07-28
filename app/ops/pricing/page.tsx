import { db } from "@/lib/db";
import { computeSellPrice, type PricingRuleInput } from "@/lib/pricing/yield";
import { formatCents, formatPct } from "@/lib/money";
import { runYieldNow, togglePricingRule } from "@/app/actions/ops";
import { Button, Card, Container, Pill, Section } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing rules" };

const KIND_LABEL: Record<string, string> = {
  SEASON: "Month of departure",
  LEAD_TIME: "Days until departure",
  OCCUPANCY: "Share of berths sold",
  DAY_OF_WEEK: "Day of week",
};

function describeBand(kind: string, min: number, max: number): string {
  switch (kind) {
    case "SEASON": {
      const name = (m: number) =>
        new Date(Date.UTC(2026, m - 1, 1)).toLocaleDateString("en-GB", {
          month: "short",
          timeZone: "UTC",
        });
      return max - min <= 1 ? name(min) : `${name(min)}–${name(max - 1)}`;
    }
    case "LEAD_TIME":
      return `${min}–${max >= 1000 ? "∞" : max} days out`;
    case "OCCUPANCY":
      return `${Math.round(min * 100)}–${Math.round(Math.min(max, 1) * 100)}% sold`;
    default:
      return `${min}–${max}`;
  }
}

/**
 * The pricing rules editor, with a live preview.
 *
 * Yield logic lives in the database rather than in code so the two founders can
 * retune it without a deploy. The preview matters as much as the editor: it
 * runs the real engine against real future departures, so the effect of
 * switching a rule off is visible before anything is published.
 */
export default async function PricingPage() {
  const now = new Date();

  const [rules, departures] = await Promise.all([
    db.pricingRule.findMany({
      include: { destination: { select: { name: true } } },
      orderBy: [{ kind: "asc" }, { thresholdMin: "asc" }],
    }),
    db.departure.findMany({
      where: { startDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 12,
      include: {
        trip: {
          select: {
            name: true,
            destinationId: true,
            destination: { select: { name: true, demandIndex: true } },
          },
        },
      },
    }),
  ]);

  const activeInputs: PricingRuleInput[] = rules
    .filter((r) => r.active)
    .map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      destinationId: r.destinationId,
      thresholdMin: r.thresholdMin,
      thresholdMax: r.thresholdMax,
      multiplier: r.multiplier,
      active: true,
    }));

  const preview = departures.map((departure) => {
    const computation = computeSellPrice(
      {
        netRateCents: departure.netRateCents,
        marginFloorPct: departure.marginFloorPct,
        marginCeilingPct: departure.marginCeilingPct,
      },
      {
        destinationId: departure.trip.destinationId,
        startDate: departure.startDate,
        berthsTotal: departure.berthsTotal,
        berthsBooked: departure.berthsBooked,
        demandIndex: departure.trip.destination.demandIndex,
      },
      activeInputs,
      now,
    );
    return { departure, computation };
  });

  const wouldChange = preview.filter(
    (p) => p.computation.priceCents !== p.departure.sellPriceCents && !p.computation.clamped,
  ).length;

  return (
    <Section className="!py-8">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          {/* --------------------------------------------------- Rules */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--color-line)] px-5 py-4">
              <p className="font-[family-name:var(--font-display)] text-lg">
                Yield rules
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                At most one rule of each kind fires per departure. A
                destination-specific rule beats a global one.
              </p>
            </div>

            <ul>
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-line)] px-5 py-4 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Pill tone={rule.active ? "positive" : "neutral"}>
                        ×{rule.multiplier.toFixed(2)}
                      </Pill>
                      {rule.destination ? (
                        <Pill tone="accent">{rule.destination.name}</Pill>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                      {KIND_LABEL[rule.kind]} ·{" "}
                      {describeBand(rule.kind, rule.thresholdMin, rule.thresholdMax)}
                    </p>
                    {rule.note ? (
                      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                        {rule.note}
                      </p>
                    ) : null}
                  </div>

                  <form action={togglePricingRule}>
                    <input type="hidden" name="id" value={rule.id} />
                    <Button
                      type="submit"
                      variant={rule.active ? "secondary" : "quiet"}
                      className="!px-3 !py-1 text-xs"
                    >
                      {rule.active ? "On" : "Off"}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>

          {/* ------------------------------------------------- Preview */}
          <div className="min-w-0 space-y-5">
            <Card className="p-5">
              <p className="font-[family-name:var(--font-display)] text-lg">
                Live preview
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                The real engine, run against the next {preview.length}{" "}
                departures with the rules as they stand right now.{" "}
                {wouldChange === 0
                  ? "Nothing would move."
                  : `${wouldChange} would move if you ran the engine.`}
              </p>
              <form action={runYieldNow} className="mt-4">
                <Button type="submit">Run the yield engine</Button>
              </form>
              <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                The engine can only publish inside the margin band. When the
                rules want to go well beyond a guardrail, the guardrail wins and
                you get a queue item saying so.
              </p>
            </Card>

            <Card className="overflow-hidden">
              <div className="scroll-x">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                      <th className="px-4 py-2 font-medium">Departure</th>
                      <th className="px-3 py-2 text-right font-medium">Now</th>
                      <th className="px-3 py-2 text-right font-medium">Would be</th>
                      <th className="px-4 py-2 text-right font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(({ departure, computation }) => {
                      const delta =
                        computation.priceCents - departure.sellPriceCents;
                      return (
                        <tr
                          key={departure.id}
                          className="border-t border-[var(--color-line)] align-top"
                        >
                          <td className="px-4 py-2.5">
                            <p className="line-clamp-1">{departure.trip.name}</p>
                            <p className="text-xs text-[var(--color-ink-muted)]">
                              {departure.startDate.toISOString().slice(0, 10)} ·{" "}
                              {departure.berthsBooked}/{departure.berthsTotal}{" "}
                              sold
                            </p>
                            {computation.appliedRules.length > 0 ? (
                              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                                {computation.appliedRules
                                  .map((r) => r.name)
                                  .join(" · ")}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatCents(departure.sellPriceCents)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {formatCents(computation.priceCents)}
                            {delta !== 0 ? (
                              <span
                                className={`ml-1 text-xs ${delta > 0 ? "text-[var(--color-positive)]" : "text-[var(--color-caution)]"}`}
                              >
                                {delta > 0 ? "+" : ""}
                                {Math.round(delta / 100)}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatPct(computation.marginPct)}
                            {computation.clamped ? (
                              <span className="ml-1 text-xs text-[var(--color-caution)]">
                                clamped
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
}
