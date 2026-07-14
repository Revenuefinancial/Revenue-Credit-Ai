import { defineConfig, devices } from "@playwright/test";

// Smoke tests cover the public, statically-rendered pages. By default they
// run against a local production build (`next start`) on port 3100. Set
// PLAYWRIGHT_BASE_URL to run them against a live deploy instead — e.g.
//   PLAYWRIGHT_BASE_URL=https://score-logic-pro.vercel.app npm run test:e2e
// The authenticated upload/review flow is verified separately once the
// verification_documents migration is applied to the live database.
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: externalBaseURL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // When targeting an external URL, don't spin up a local server.
  webServer: externalBaseURL
    ? undefined
    : {
        command: "npm run start -- --port 3100",
        url: "http://localhost:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
