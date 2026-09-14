import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

/**
 * The published build, checked as published.
 *
 * The main config drives a dev server. This one drives `out/` through the same
 * path-prefix and directory-index resolution GitHub Pages uses, so the cost
 * audit runs against the exact bytes that go on the public internet rather
 * than against a render of them. That distinction earns its keep here: the ops
 * screens genuinely do carry net rates and margins, and on the published site
 * they sit one URL away from the customer pages with no authentication between
 * them.
 *
 * Run `npm run build:static` first — this asserts things about a directory, it
 * does not build one.
 */
const PREINSTALLED = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
].find((path) => existsSync(path));

const BASE = process.env.PAGES_BASE_PATH ?? "/Tailorsail-";
const PORT = 4173;

export default defineConfig({
  testDir: "./tests/export",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    // Origin only. A leading-slash path in `page.goto` replaces the whole path
    // of the base URL, so the prefix would silently vanish if it lived here —
    // the spec prepends it explicitly instead.
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: PREINSTALLED
          ? { executablePath: PREINSTALLED }
          : undefined,
      },
    },
  ],
  webServer: {
    command: "node scripts/serve-export.mjs",
    url: `http://127.0.0.1:${PORT}${BASE}/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
