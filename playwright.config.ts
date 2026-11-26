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
      // The room needs WebGL (a browser without it may not take a seat, see
      // "3D gate" in docs/architecture.md), so every test runs with
      // software WebGL. A headless CI runner draws the scene in software:
      // building it (one still frame, even with reduced motion) froze a
      // page's main thread for 7 to 8 seconds on a 4-vCPU runner. So tests
      // wait for the stage to settle (`onStage` in e2e/room-helpers.ts)
      // before their first click, and reduced motion stays on. Files that
      // watch the scene move set full motion themselves.
      use: {
        reducedMotion: "reduce",
        launchOptions: {
          args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        },
      },
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
