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
  await page.goto("/");
  await field(page, "Your name").fill(name);
  await page.getByRole("button", { name: "Create a room" }).click();
  await expect(page.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
  await expect(players(page)).toHaveCount(1);

  return page.getByTestId("room-code").innerText();
}

export async function joinRoom(page: Page, code: string, name: string) {
  await page.goto(`/room/${code}`);
  await field(page, "Your name").fill(name);
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(players(page).filter({ hasText: `${name} (you)` })).toHaveCount(
    1,
  );
}

/** Close every context `newPlayer` made. Call it from `afterEach`. */
export async function closePlayers(): Promise<void> {
  await Promise.all(opened.splice(0).map((context) => context.close()));
}
