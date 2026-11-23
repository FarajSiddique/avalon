import { expect, type Browser, type Page } from "@playwright/test";

/** Shared steps for the room's browser tests. */

export const players = (page: Page) => page.getByTestId("player");

export const field = (page: Page, name: string) =>
  page.getByRole("textbox", { name });

export async function newPlayer(browser: Browser) {
  const context = await browser.newContext();
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
