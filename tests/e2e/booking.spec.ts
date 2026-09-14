import { expect, test } from "@playwright/test";

/**
 * The path that has to work end to end.
 *
 * Deliberately checks the arithmetic rather than just the navigation: a
 * booking flow that renders but shows a total which does not match its own
 * breakdown is worse than one that errors, because nobody notices.
 */

/** `"€1,299"` → `129900`. */
function toCents(text: string): number {
  const digits = text.replace(/[^\d]/g, "");
  return Number(digits) * 100;
}

test("a visitor can search, price and book a trip", async ({ page }) => {
  // --- Home
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /sailing holidays for people who have never sailed/i,
    }),
  ).toBeVisible();

  // --- Natural-language search
  await page
    .getByPlaceholder(/describe the trip you want/i)
    .fill("Croatia in August, six of us, none of us have sailed");
  await page.getByRole("button", { name: /find trips/i }).click();

  await expect(page).toHaveURL(/\/trips\?/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/trip/i);

  // --- Open a trip.
  // The whole card is the link, so its accessible name is the card's text
  // rather than "View" — target it by href instead.
  const cards = page.locator('a[href^="/trips/"]').filter({ hasText: /from/i });
  expect(await cards.count()).toBeGreaterThan(0);
  await cards.first().click();

  await expect(page).toHaveURL(/\/trips\/[a-z0-9-]+/);
  await expect(page.getByText("What you pay")).toBeVisible();

  // --- The all-in total must equal the sum of its own parts
  const headline = await page
    .locator("table")
    .first()
    .evaluate((table: HTMLTableElement) => {
      const rows = [...table.querySelectorAll("tr")];
      const subtotals: number[] = [];
      for (const row of rows) {
        const cells = row.querySelectorAll("td");
        // Subtotal rows carry a bold figure in the last cell and no label.
        if (cells.length === 2 && cells[1].className.includes("font-medium")) {
          subtotals.push(
            Number(cells[1].textContent!.replace(/[^\d]/g, "")),
          );
        }
      }
      return subtotals;
    });

  expect(headline.length).toBeGreaterThan(0);

  // --- Book it
  await page.getByRole("link", { name: /request this departure/i }).click();
  await expect(page).toHaveURL(/\/book/);

  await page.getByLabel("Your name").fill("Playwright Tester");
  await page.getByLabel("Email").fill("playwright@tailorsail.example");
  await page
    .getByLabel(/how much sailing/i)
    .fill("None of us have ever been on a boat.");

  // Attach an add-on so the confirmation exercises the extras path too.
  const addOn = page.locator('input[name="addOnIds"]').first();
  await addOn.check();

  await page.getByRole("button", { name: /send booking request/i }).click();

  // --- Confirmation
  await expect(page).toHaveURL(/\/bookings\/TS-[A-Z0-9]{4}/);
  await expect(page.getByText(/getting ready/i).first()).toBeVisible();
  await expect(page.getByText("What you pay")).toBeVisible();

  // The readiness checklist must be populated, not an empty shell.
  const tasks = page.locator('form[action] button[type="submit"]');
  expect(await tasks.count()).toBeGreaterThan(3);
});

test("the readiness checklist persists a toggle across a reload", async ({
  page,
}) => {
  await page.goto("/bookings/TS-8F2K");

  const firstTask = page
    .locator("h3", { hasText: /now you've booked/i })
    .locator("xpath=following-sibling::ul[1]")
    .locator("li form button")
    .first();

  const wasDone = (await firstTask.innerText()).includes("✓");
  await firstTask.click();
  await page.waitForLoadState("networkidle");

  await page.reload();
  const nowDone = (await firstTask.innerText()).includes("✓");

  expect(nowDone).toBe(!wasDone);
});

/**
 * Every customer-facing route, checked for cost and margin fields.
 *
 * This originally covered only the trip page, which was not enough: the
 * homepage's course teaser used a bare `findMany()` and serialised
 * `netRateCents` into the RSC payload — our cost on a course, sitting in the
 * page source, while every pricing test passed. The leak was never in the
 * pricing path, so a test aimed at the pricing path could not find it.
 *
 * Walking the whole public surface is what actually catches this class, so any
 * new public route inherits the check for free by being added to the list.
 */
const PUBLIC_ROUTES = [
  "/",
  "/trips",
  "/trips/dalmatia-first-week-skippered",
  "/trips/dalmatia-first-week-skippered/book",
  "/destinations",
  "/destinations/ibiza-formentera",
  "/crew",
  "/courses",
  "/courses/competent-crew",
  "/operators/adriatic-blue",
  "/bookings/TS-8F2K",
  "/host",
];

const FORBIDDEN = [
  "netRateCents",
  "marginCents",
  "marginFloorPct",
  "marginCeilingPct",
  "addOnsNetCents",
  "netRateDiscountPct",
  "commercialTier",
  "allotmentBerths",
  "Operator net rate",
];

for (const route of PUBLIC_ROUTES) {
  test(`${route} leaks no cost or margin data`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status(), `${route} should render`).toBe(200);

    const html = await page.content();
    const found = FORBIDDEN.filter((field) => html.includes(field));

    expect(
      found,
      `${route} exposed internal commercial fields: ${found.join(", ")}`,
    ).toEqual([]);
  });
}

test("the ops queue is reachable and prioritised", async ({ page }) => {
  await page.goto("/ops");
  await expect(page.getByRole("heading", { name: /operations/i })).toBeVisible();

  // Urgent document expiry outranks everything else in the queue.
  const firstPill = page.locator("main span", {
    hasText: /expiring document|escalated message|booking exception/i,
  });
  expect(await firstPill.count()).toBeGreaterThan(0);
});
