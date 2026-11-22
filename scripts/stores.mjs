/**
 * Print every Zustand store on a page, for checking state by hand or from
 * an agent. Needs `pnpm dev` running: production builds do not list stores.
 *
 *   pnpm stores /design/starlit/lobby
 *   pnpm stores /room/ABCD --wait 3000 --history
 *
 * Each store is made with createDevStore (src/client/dev-store.ts) and is
 * listed on window.__AVALON_STORES__ once the page uses it.
 */
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const path = args.find((a) => a.startsWith("/")) ?? "/";
const waitIndex = args.indexOf("--wait");
const waitMs = waitIndex === -1 ? 1500 : Number(args[waitIndex + 1]);
const withHistory = args.includes("--history");
const base = process.env.BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];

page.on("pageerror", (error) => errors.push(String(error)));
await page.goto(base + path);
await page.waitForTimeout(waitMs);

const stores = await page.evaluate(
  (history) =>
    Object.fromEntries(
      Object.entries(window.__AVALON_STORES__ ?? {}).map(([name, entry]) => [
        name,
        history
          ? { state: entry.getState(), history: entry.history }
          : { state: entry.getState(), changes: entry.history.length - 1 },
      ]),
    ),
  withHistory,
);

await browser.close();

if (Object.keys(stores).length === 0) {
  console.error(
    `No stores on ${base + path}. Is \`pnpm dev\` running? Production builds do not list them.`,
  );
  process.exitCode = 1;
}

console.log(
  JSON.stringify(
    stores,
    (_key, value) =>
      // Refs to DOM nodes do not serialise; name them instead.
      typeof value === "object" && value !== null && "nodeType" in value
        ? `<${String(value.nodeName).toLowerCase()}>`
        : value,
    2,
  ),
);

if (errors.length > 0) {
  console.error("Page errors:", errors);
  process.exitCode = 1;
}
