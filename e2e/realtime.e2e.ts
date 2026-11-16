import { expect, test, type Page } from "@playwright/test";

/**
 * The real-time proof for this checkpoint: two separate browsers (separate
 * storage, like two phones) join one room through the real custom server and
 * see each other arrive, leave and come back.
 */

const players = (page: Page) => page.getByTestId("player");

/**
 * Next.js keeps the previous route mounted but hidden after a client-side
 * navigation, so fields are looked up by role (which skips hidden elements).
 */
const field = (page: Page, name: string) => page.getByRole("textbox", { name });

async function expectWebSocket(page: Page) {
  await expect(page.getByTestId("connection")).toHaveAttribute(
    "data-transport",
    "websocket",
  );
}

test("two players see each other join, drop and return", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  // Host creates a room from the landing page.
  await host.goto("/");
  await field(host, "Your name").fill("Wren");
  await host.getByRole("button", { name: "Create a room" }).click();
  await host.waitForURL(/\/room\/[A-Z]{4}$/);
  const code = await host.getByTestId("room-code").innerText();
  await expect(players(host)).toHaveCount(1);
  await expect(players(host).first()).toContainText("Wren (you)");
  await expectWebSocket(host);

  // Guest joins with the code from the landing page.
  await guest.goto("/");
  await field(guest, "Have a room code?").fill(code.toLowerCase());
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await guest.waitForURL(`**/room/${code}`);
  await field(guest, "Your name").fill("Ansel");
  await guest.getByRole("button", { name: "Join room" }).click();

  // Both browsers now show both players, without a reload.
  for (const page of [host, guest]) {
    await expect(players(page)).toHaveCount(2);
    await expect(players(page).nth(0)).toContainText("Wren");
    await expect(players(page).nth(1)).toContainText("Ansel");
  }
  await expect(players(guest).nth(1)).toContainText("Ansel (you)");
  await expect(players(host).nth(0)).toContainText("Host");
  await expectWebSocket(guest);

  // A name that is already taken is refused with a message.
  const strangerContext = await browser.newContext();
  const stranger = await strangerContext.newPage();
  await stranger.goto(`/room/${code}`);
  await field(stranger, "Your name").fill("wren");
  await stranger.getByRole("button", { name: "Join room" }).click();
  await expect(stranger.getByRole("main").getByRole("alert")).toContainText(
    "has that name",
  );
  await strangerContext.close();

  // Guest's phone drops: the host sees them as away, and the seat is kept.
  await guest.close();
  await expect(players(host).nth(1)).toHaveAttribute("data-connected", "false");
  await expect(players(host)).toHaveCount(2);

  // Guest comes back in a new tab of the same browser: same seat, no name form.
  const guestAgain = await guestContext.newPage();
  await guestAgain.goto(`/room/${code}`);
  await expect(players(guestAgain)).toHaveCount(2);
  await expect(players(guestAgain).nth(1)).toContainText("Ansel (you)");
  await expect(players(host).nth(1)).toHaveAttribute("data-connected", "true");

  // A reload keeps the host's seat too.
  await host.reload();
  await expect(players(host).nth(0)).toContainText("Wren (you)");
  await expect(players(host)).toHaveCount(2);

  await hostContext.close();
  await guestContext.close();
});

test("an unknown room code says so", async ({ page }) => {
  await page.goto("/room/ZZZZ");
  await field(page, "Your name").fill("Wren");
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "does not exist",
  );
});

test("a malformed room code shows the not-found page", async ({ page }) => {
  await page.goto("/room/not-a-code");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
  await expect(page.getByTestId("room-code")).toHaveCount(0);
});
