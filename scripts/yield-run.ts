import { runYield } from "../lib/yield-run";
import { db } from "../lib/db";

/**
 * Reprice every future departure. Intended to run nightly on a cron.
 *
 * Anything the guardrails clamp is not published — it opens a PRICE_OUT_OF_BAND
 * task instead, so the founders see that the rules wanted to go somewhere they
 * were not allowed to rather than finding out from the margin report a month
 * later.
 */
async function main() {
  const started = Date.now();
  const result = await runYield();

  console.log(`Yield run finished in ${Date.now() - started}ms`);
  console.log(`  considered: ${result.considered}`);
  console.log(`  repriced:   ${result.changed} (${result.raised} up, ${result.lowered} down)`);
  console.log(`  clamped:    ${result.clamped} (${result.escalated} escalated as straining the band)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
