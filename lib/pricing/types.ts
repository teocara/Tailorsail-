/**
 * Shared pricing types.
 *
 * These are deliberately structural rather than importing Prisma model types:
 * the pricing functions are pure and unit-testable with plain fixtures, and
 * they must not accidentally accept a whole Prisma row (which would carry
 * `netRateCents` into a customer-facing code path).
 */

export type PriceComponentKind =
  | "INCLUDED"
  | "MANDATORY_EXTRA"
  | "REFUNDABLE_DEPOSIT"
  | "OPTIONAL";

export type PayableAt = "BOOKING" | "MARINA";
export type Visibility = "CUSTOMER" | "INTERNAL";

export interface PriceComponentInput {
  label: string;
  amountCents: number;
  kind: PriceComponentKind;
  payableAt: PayableAt;
  visibility: Visibility;
  perPerson: boolean;
  note?: string | null;
  order?: number;
}

export interface AddOnInput {
  id: string;
  name: string;
  sellPriceCents: number;
  perPerson: boolean;
  /** Quantity selected. Defaults to 1. */
  quantity?: number;
}

/** A single line as shown to the customer. Carries no cost information. */
export interface QuoteLine {
  label: string;
  kind: PriceComponentKind;
  payableAt: PayableAt;
  /** Total for this line across all berths, in cents. */
  amountCents: number;
  /** True when `amountCents` was derived by multiplying by berths. */
  perPerson: boolean;
  note?: string | null;
}

/**
 * The complete customer-facing quote. Note what is absent: no net rate, no
 * margin, no internal component. `buildCustomerQuote` is the only supported
 * way for a public route to obtain a price, which is what makes the absence
 * structural rather than a convention people have to remember.
 */
export interface CustomerQuote {
  currency: "EUR";
  berths: number;
  lines: QuoteLine[];
  /** Charter base plus mandatory extras payable at booking. */
  dueAtBookingCents: number;
  /** Mandatory extras the marina collects on arrival. */
  dueAtMarinaCents: number;
  /** Refundable security deposit — held, not spent. Excluded from the total. */
  refundableDepositCents: number;
  /** Selected optional extras and add-ons. */
  optionalExtrasCents: number;
  /**
   * The honest headline: everything the traveller actually pays, whether at
   * booking or at the dock. Excludes the refundable deposit (they get it back)
   * and unselected optional extras.
   */
  totalAllInCents: number;
  /** `totalAllInCents` divided across berths, remainder-safe. */
  perPersonCents: number;
}
