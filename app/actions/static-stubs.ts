/**
 * Stand-ins for the server actions, used only by the static export.
 *
 * Deliberately *not* a `"use server"` module. `output: "export"` fails the
 * build if a single server action exists anywhere in the module graph, and
 * imports are static — so branching inside the pages is not enough, the action
 * modules have to be absent. `next.config.ts` aliases every `app/actions/*`
 * specifier here when `STATIC_EXPORT=1`, which lets the pages keep their
 * ordinary imports and keeps the diff in the pages down to what actually
 * differs: what gets rendered.
 *
 * Nothing here is ever called. The pages check `IS_STATIC` and render a
 * disabled control with an explanation rather than binding a form to one of
 * these, so a call means a page missed its branch — hence the throw rather
 * than a silent no-op.
 */

function unavailable(name: string): never {
  throw new Error(
    `${name} was called in the static build. Server actions do not exist there — ` +
      `the page should have rendered its IS_STATIC branch instead.`,
  );
}

/* --- booking */
export async function createBooking(): Promise<void> {
  unavailable("createBooking");
}
export async function toggleReadiness(): Promise<void> {
  unavailable("toggleReadiness");
}

/* --- concierge */
export async function sendConciergeMessage(): Promise<void> {
  unavailable("sendConciergeMessage");
}

/* --- host */
export async function submitHostApplication(): Promise<void> {
  unavailable("submitHostApplication");
}

/* --- search */
export async function searchTrips(): Promise<void> {
  unavailable("searchTrips");
}

/* --- ops */
export async function resolveOpsTask(): Promise<void> {
  unavailable("resolveOpsTask");
}
export async function approveHostApplication(): Promise<void> {
  unavailable("approveHostApplication");
}
export async function togglePricingRule(): Promise<void> {
  unavailable("togglePricingRule");
}
export async function runYieldNow(): Promise<void> {
  unavailable("runYieldNow");
}
export async function runTriageNow(): Promise<void> {
  unavailable("runTriageNow");
}
export async function markContentReviewed(): Promise<void> {
  unavailable("markContentReviewed");
}
