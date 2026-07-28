import { defineConfig, devices } from "@playwright/test";

import { existsSync } from "node:fs";

/**
 * Smoke tests covering the path that has to work: find a trip, check the
 * price, book it, land on the confirmation with a readiness checklist.
 *
 * Chromium is preinstalled in this environment, but its build number will not
 * always match the one the installed Playwright expects. Rather than
 * downloading a second copy, point at the binary that is already here when we
 * can find it and let Playwright resolve normally otherwise — so this config
 * works both in the sandbox and on a developer machine.
 */
const PREINSTALLED = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
].find((path) => existsSync(path));
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3100",
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
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npx next dev -p 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
