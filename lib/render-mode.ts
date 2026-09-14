import { connection } from "next/server";
import { IS_STATIC } from "./static-mode";

/**
 * Opt a page out of build-time prerendering — server build only.
 *
 * These pages read Prisma directly rather than through `fetch`, so Next has no
 * cache tag to invalidate and treats them as static by default. That is wrong
 * for the server build: a yield run would reprice every departure and the
 * homepage would keep showing the prices from whenever it was last built.
 *
 * `export const dynamic = "force-dynamic"` used to say this, but Next reads
 * that config by static analysis and rejects anything but a literal, so it
 * cannot be made conditional — and under `output: "export"` it is a hard
 * contradiction rather than a preference. `connection()` is the runtime
 * equivalent and is therefore branchable: awaited on the server, skipped when
 * prerendering to HTML, where a frozen snapshot is the entire point.
 *
 * Call it first thing in the page body, before any query.
 */
export async function perRequest(): Promise<void> {
  if (!IS_STATIC) await connection();
}
