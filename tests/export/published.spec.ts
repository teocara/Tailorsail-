import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { FORBIDDEN_PUBLIC_FIELDS } from "@/lib/public-select";

/**
 * The published build, audited as published.
 *
 * The dev-server suite checks that a *render* of these pages leaks no cost.
 * This checks the files that actually go on the internet, which is a different
 * claim once there is a build step between the two — a prerendered RSC payload
 * is not the same artefact as a streamed response, and only one of them is
 * what a stranger downloads.
 *
 * It matters more here than it did before. On the published site the ops
 * screens — which carry net rates, margins and operator commercial terms by
 * design — sit one URL away from the customer pages with nothing in front of
 * them. The guarantee that separates the two is a projection in code, so this
 * is the test that says the projection held all the way to the file.
 */

/**
 * GitHub Pages serves a project site under /<repo>, and every published URL
 * carries that prefix. Applied here rather than in the base URL: a
 * leading-slash path replaces the base URL's path entirely, so putting it
 * there would drop it on every request.
 */
const BASE = process.env.PAGES_BASE_PATH ?? "/Tailorsail-";
const url = (route: string) => `${BASE}${route}`;

/** Everything a visitor can reach without being handed a link. */
const PUBLIC_ROUTES = [
  "/",
  "/trips/",
  "/trips/dalmatia-first-week-skippered/",
  "/trips/dalmatia-first-week-skippered/book/",
  "/destinations/",
  "/destinations/ibiza-formentera/",
  "/crew/",
  "/courses/",
  "/courses/competent-crew/",
  "/operators/adriatic-blue/",
  "/bookings/TS-8F2K/",
  "/host/",
  "/host/submitted/",
];

for (const route of PUBLIC_ROUTES) {
  test(`${route} is published`, async ({ page }) => {
    const response = await page.goto(url(route));
    expect(response?.status(), `${route} should be published`).toBe(200);
  });
}

/**
 * Every file, not every route.
 *
 * Walking routes and reading `page.content()` sees rendered HTML and nothing
 * else, which is no longer where the risk is. A static export writes an RSC
 * payload beside each page — 72 `.txt` files — and *that* is where anything
 * handed to a client component ends up. The trip pages now hand a map of
 * precomputed quotes across that boundary, so those payloads carry pricing
 * data by design and would go completely unexamined by a route walk.
 *
 * Scanning the published directory instead covers the payloads, the JSON
 * catalogue, and the JavaScript chunks in one pass, and lets the guarantee be
 * stated without exceptions: no file we publish contains any of these names.
 *
 * The ops screens are included deliberately. They show cost — that is their
 * job — but they show *figures*, and a field name appearing in one would mean
 * a whole row had been serialised rather than the numbers picked out of it.
 */
const TEXT_FILE = /\.(html|txt|json|js|css)$/;

function publishedFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return publishedFiles(full);
    return TEXT_FILE.test(entry.name) ? [full] : [];
  });
}

test("no published file contains a cost or margin field", () => {
  const root = resolve("out");
  const files = publishedFiles(root);

  // If this is empty the test would pass vacuously, which is the one way a
  // guarantee like this fails silently.
  expect(files.length, "expected a built export in out/").toBeGreaterThan(50);

  const offenders: string[] = [];
  for (const file of files) {
    const body = readFileSync(file, "utf8");
    const found = FORBIDDEN_PUBLIC_FIELDS.filter((f) => body.includes(f));
    if (found.length > 0) {
      offenders.push(`${relative(root, file)} → ${found.join(", ")}`);
    }
  }

  expect(
    offenders,
    `internal commercial fields reached the published build:\n  ${offenders.join("\n  ")}`,
  ).toEqual([]);
});

test("the trip catalogue the browser downloads is populated", async ({
  request,
}) => {
  const response = await request.get(url("/trip-index.json"));
  expect(response.status()).toBe(200);
  const index = (await response.json()) as { trips: unknown[] };
  expect(index.trips.length).toBeGreaterThan(0);
});

test("the ops screens declare that their figures are seeded", async ({
  page,
}) => {
  // These are the pages that legitimately show cost. Public and unauthenticated
  // is a deliberate choice; publishing them unlabelled would not be.
  for (const route of [
    "/ops/",
    "/ops/margin/",
    "/ops/pricing/",
    "/ops/spend/",
  ]) {
    const response = await page.goto(url(route));
    expect(response?.status(), `${route} should be published`).toBe(200);
    await expect(
      page.getByText("Demo data.", { exact: false }).first(),
      `${route} should carry the seeded-data banner`,
    ).toBeVisible();
  }
});

test("every asset the pages ask for is actually published", async ({
  page,
}) => {
  /*
   * The `.nojekyll` failure mode, mostly. Without that file GitHub Pages runs
   * the output through Jekyll, which ignores directories beginning with an
   * underscore — taking `_next/` and the entire JS and CSS bundle with it. The
   * HTML still renders, every asset 404s, and nothing in the build log says so.
   */
  const missing: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`);
  });

  for (const route of [
    "/",
    "/trips/",
    "/trips/dalmatia-first-week-skippered/",
  ]) {
    await page.goto(url(route), { waitUntil: "networkidle" });
  }

  expect(missing, `missing assets:\n  ${missing.join("\n  ")}`).toEqual([]);
});

test("the price breakdown is in the HTML, not only after hydration", async ({
  browser,
}) => {
  // A statically exported page that needs JavaScript to show its price is a
  // page that shows no price to a crawler, a reader-mode view, or anyone whose
  // bundle failed to load. This is the screen where that matters most.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(url("/trips/dalmatia-first-week-skippered/"));

  const body = await page.locator("body").innerText();
  expect(body).toMatch(/ALL-IN, \d+ (PERSON|PEOPLE)/i);
  expect(body).toContain("What you pay");
  expect(body).toMatch(/Priced for \d+ (person|people)/i);
  await context.close();
});

test("the 404 is a real page, not an empty file", async ({ page }) => {
  const response = await page.goto(url("/definitely-not-a-real-route/"));
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: /nothing at this address/i }),
  ).toBeVisible();
});
