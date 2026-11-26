import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

/** Shared steps for the room's browser tests. */

export const players = (page: Page) => page.getByTestId("player");

export const field = (page: Page, name: string) =>
  page.getByRole("textbox", { name });

/** Long enough for software WebGL to build the scene on a busy runner. */
export const STAGE_TIMEOUT = { timeout: 60_000 };

/**
 * Wait until the stage has settled on a framing. Building the scene in
 * software freezes the page for seconds on a CI runner, so a test waits for
 * this before its first click. The engine writes `data-stage` only once the
 * scene runs, which is also after hydration.
 */
export async function onStage(page: Page, phase?: string): Promise<void> {
  await expect(page.locator("[data-stage-host]")).toHaveAttribute(
    "data-stage",
    phase ?? /^(hero|lobby|role|table)$/,
    STAGE_TIMEOUT,
  );
}

/** Open the landing and wait for its stage. */
export async function openLanding(page: Page): Promise<void> {
  await page.goto("/");
  await onStage(page, "hero");
}

/** Contexts made by `newPlayer`, closed by `closePlayers`. */
const opened: Array<BrowserContext> = [];

/** A new player: a separate browser context (storage), like a phone. */
export async function newPlayer(browser: Browser) {
  const context = await browser.newContext();

  opened.push(context);
  const page = await context.newPage();

  return { context, page };
}

export async function createRoom(page: Page, name: string): Promise<string> {
  await openLanding(page);
  await field(page, "Your name").fill(name);
  await page.getByRole("button", { name: "Create a room" }).click();
  await onStage(page, "lobby");
  await expect(page.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
  await expect(players(page)).toHaveCount(1);

  return page.getByTestId("room-code").innerText();
}

export async function joinRoom(page: Page, code: string, name: string) {
  await page.goto(`/room/${code}`);
  await onStage(page, "lobby");
  await field(page, "Your name").fill(name);
  await page.getByRole("button", { name: "Join room" }).click();
  await onStage(page, "lobby");
  await expect(players(page).filter({ hasText: `${name} (you)` })).toHaveCount(
    1,
  );
}

/** Close every context `newPlayer` made. Call it from `afterEach`. */
export async function closePlayers(): Promise<void> {
  await Promise.all(opened.splice(0).map((context) => context.close()));
}
