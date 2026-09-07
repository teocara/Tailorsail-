import { runTriage } from "../lib/ai/triage";
import { db } from "../lib/db";

/**
 * The nightly sweep. Finds expiring documents, inventory that is not selling,
 * distressed weeks worth buying, and generated content nobody has read, and
 * turns each into a queue item.
 *
 * Deterministic and needs no API key — the *finding* is SQL and arithmetic.
 * Claude enriches these tasks with drafts elsewhere.
 */
async function main() {
  const started = Date.now();
  const summary = await runTriage();

  console.log(`Triage finished in ${Date.now() - started}ms`);
  console.log(`  expiring documents:   ${summary.expiringDocuments}`);
  console.log(`  distressed inventory: ${summary.distressedInventory}`);
  console.log(`  low occupancy:        ${summary.lowOccupancy}`);
  console.log(`  slow operators:       ${summary.slowOperators}`);
  console.log(`  unreviewed content:   ${summary.unreviewedContent}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
