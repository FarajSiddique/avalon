import { defineConfig } from "@playwright/test";

const port = Number.parseInt(process.env.PORT ?? "3100", 10);
/** Set E2E_BASE_URL to run against a deployed site instead of a local build. */
const remoteURL = process.env.E2E_BASE_URL;
const baseURL = remoteURL ?? `http://localhost:${port}`;

/**
 * Two projects:
 * - e2e: real behaviour through the real Worker and room object (run in CI).
 * - screenshots: regenerates docs/design/screenshots (run by hand).
 *
 * Both run against the production build, served by `vite preview` in
 * Cloudflare's local runtime (run `pnpm build` first), or against a deployed
 * site when E2E_BASE_URL is set.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure", actionTimeout: 10_000 },
  projects: [
    { name: "e2e", testMatch: /.*\.e2e\.ts/ },
    {
      name: "screenshots",
      testMatch: /.*\.shots\.ts/,
      use: { reducedMotion: "reduce" },
    },
  ],
  webServer: remoteURL
    ? undefined
    : {
        command: `pnpm exec vite preview --port ${port} --strictPort`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
