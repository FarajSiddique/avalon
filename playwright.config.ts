import { defineConfig } from "@playwright/test";

const port = Number.parseInt(process.env.PORT ?? "3100", 10);
/** Set E2E_BASE_URL to run against a deployed site instead of a local build. */
const remoteURL = process.env.E2E_BASE_URL;
const baseURL = remoteURL ?? `http://localhost:${port}`;
/**
 * A deployed site answers over the network while several browsers load the
 * landing scene on one CI runner, so it gets twice the time to act and assert.
 */
const slow = remoteURL ? 2 : 1;

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
  timeout: 30_000 * slow,
  expect: { timeout: 5000 * slow },
  use: { baseURL, trace: "retain-on-failure", actionTimeout: 10_000 * slow },
  projects: [
    {
      name: "e2e",
      testMatch: /.*\.e2e\.ts/,
      // A headless CI runner draws the 3D scene in software. Animating it in
      // every page of a multi-player test starves the runner's CPU until
      // clicks and fills time out. With reduced motion the scene draws one
      // still frame and stops. The files that test the scene itself
      // (game.e2e.ts, shell.e2e.ts) opt back in to full motion.
      use: { reducedMotion: "reduce" },
    },
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
