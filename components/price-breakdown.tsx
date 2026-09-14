import { formatCents } from "@/lib/money";
import type { CustomerQuote } from "@/lib/pricing/types";
import { Card } from "./ui";

/**
 * The all-in price breakdown.
 *
 * This component is the trust pillar made concrete: every euro the traveller
 * will pay, including the amounts the marina collects on arrival, itemised
 * before they book. It renders a `CustomerQuote` and nothing else — that type
 * carries no cost or margin field, so there is nothing here that could leak
 * even if the markup changed.
 */
export function PriceBreakdown({
  quote,
  referenceCents,
}: {
  quote: CustomerQuote;
  /** Only ever passed when PriceHistory supports the claim. */
  referenceCents?: number | null;
}) {
  const atBooking = quote.lines.filter(
    (l) =>
      l.payableAt === "BOOKING" &&
      (l.kind === "INCLUDED" || l.kind === "MANDATORY_EXTRA"),
  );
  const atMarina = quote.lines.filter(
    (l) =>
      l.payableAt === "MARINA" &&
      (l.kind === "INCLUDED" || l.kind === "MANDATORY_EXTRA"),
  );
  const deposits = quote.lines.filter((l) => l.kind === "REFUNDABLE_DEPOSIT");
  const optional = quote.lines.filter((l) => l.kind === "OPTIONAL");

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-sunk)] px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-[family-name:var(--font-display)] text-lg">
            What you pay
          </p>
          <div className="text-right">
            {referenceCents ? (
              <span className="mr-2 text-sm text-[var(--color-ink-muted)] line-through">
                {formatCents(referenceCents)}
              </span>
            ) : null}
            <span className="font-[family-name:var(--font-display)] text-2xl">
              {formatCents(quote.totalAllInCents)}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          All-in for {quote.berths} {quote.berths === 1 ? "person" : "people"} —{" "}
          {formatCents(quote.perPersonCents)} each. This is the complete figure,
          including what the marina collects on arrival.
        </p>
      </div>

      {/*
        No min-width here. A 28rem floor pushed the amount column off a 375px
        screen and behind a horizontal scroll — hiding the one column the whole
        table exists for. Labels wrap instead; the amounts stay put.
      */}
      <div className="scroll-x">
        <table className="w-full text-sm">
          <tbody>
            <PriceGroup title="Payable at booking" lines={atBooking} />
            {atMarina.length > 0 ? (
              <PriceGroup
                title="Payable at the marina"
                lines={atMarina}
                note="Collected locally on arrival or departure. Included in the total above."
              />
            ) : null}
            {optional.length > 0 ? (
              <PriceGroup
                title="Extras you selected"
                lines={optional}
                note="Included in the total above."
              />
            ) : null}
            {deposits.length > 0 ? (
              <PriceGroup
                title="Refundable"
                lines={deposits}
                note="Held against damage and returned in full. Not part of your total."
              />
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[var(--color-line)] px-5 py-4 text-xs text-[var(--color-ink-muted)]">
        <p>
          Nothing else is payable to us or to the operator. If a cost is not on
          this list, you will not be asked for it at the dock.
        </p>
      </div>
    </Card>
  );
}

function PriceGroup({
  title,
  lines,
  note,
}: {
  title: string;
  lines: CustomerQuote["lines"];
  note?: string;
}) {
  if (lines.length === 0) return null;

  const subtotal = lines.reduce((acc, l) => acc + l.amountCents, 0);

  /*
    A one-line group is already its own subtotal, and repeating the figure
    reads as a second charge — the refundable deposit showed €2,000 twice.
    For the same reason the group note is redundant when the only line
    carries a note saying the same thing.
  */
  const showSubtotal = lines.length > 1;
  const showNote = Boolean(note) && (lines.length > 1 || !lines[0].note);

  return (
    <>
      <tr>
        <th
          colSpan={2}
          className="bg-[var(--color-surface)] px-5 pt-5 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]"
        >
          {title}
        </th>
      </tr>
      {lines.map((line, index) => (
        <tr key={`${line.label}-${index}`} className="align-top">
          <td className="px-5 py-2">
            <span>{line.label}</span>
            {line.perPerson ? (
              <span className="ml-1.5 text-xs text-[var(--color-ink-muted)]">
                per person
              </span>
            ) : null}
            {line.note ? (
              <p className="mt-0.5 max-w-md text-xs text-[var(--color-ink-muted)]">
                {line.note}
              </p>
            ) : null}
          </td>
          <td className="whitespace-nowrap px-5 py-2 text-right tabular-nums">
            {line.amountCents === 0 ? (
              <span className="text-[var(--color-ink-muted)]">Included</span>
            ) : (
              formatCents(line.amountCents)
            )}
          </td>
        </tr>
      ))}
      {showNote || showSubtotal ? (
        <tr>
          <td className="px-5 pb-2 pt-1">
            {showNote ? (
              <p className="max-w-md text-xs text-[var(--color-ink-muted)]">
                {note}
              </p>
            ) : null}
          </td>
          <td className="whitespace-nowrap px-5 pb-2 pt-1 text-right text-sm font-medium tabular-nums">
            {showSubtotal ? formatCents(subtotal) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}
