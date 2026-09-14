import { runYield } from "../lib/yield-run";
import { db } from "../lib/db";

/**
 * Reprice every future departure. Intended to run nightly on a cron.
 *
 * A clamped price *is* published — it is inside the margin band by
 * construction. Only a clamp that strains well past the bound opens a
 * PRICE_OUT_OF_BAND task, so the founders see the rules pulling somewhere they
 * are not allowed to go without having every routine clamp in front of them
 * each morning.
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
