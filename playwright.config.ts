import { defineConfig } from "@playwright/test";

const port = Number.parseInt(process.env.PORT ?? "3100", 10);
const baseURL = `http://localhost:${port}`;

/**
 * Two projects:
 * - e2e: real behaviour through the real server (run in CI).
 * - screenshots: regenerates docs/design/screenshots (run by hand).
 *
 * Both run against the production build so they exercise the same custom
 * server that gets deployed. Run `pnpm build` first.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure", actionTimeout: 10_000 },
  projects: [
    { name: "e2e", testMatch: /.*\.e2e\.ts/ },
    { name: "screenshots", testMatch: /.*\.shots\.ts/ },
  ],
  webServer: {
    command: "pnpm start",
    url: `${baseURL}/api/health`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
