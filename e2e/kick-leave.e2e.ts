import { expect, test, type Page } from "@playwright/test";
import {
  createRoom,
  field,
  joinRoom,
  newPlayer,
  players,
} from "./room-helpers";

/**
 * Kick, leave and rejoin in the lobby (issue 17), through the real Worker and
 * room object. Each player is a separate browser context, like a phone.
 */

// Several browsers each load the landing and its scene, so allow longer than
// the default 30 seconds.
test.describe.configure({ timeout: 90_000 });

async function kick(host: Page, name: string) {
  await host.getByRole("button", { name: `Remove ${name}` }).click();
  await host
    .getByRole("group", { name: `Remove ${name}?` })
    .getByRole("button", { name: "Remove" })
    .click();
}

async function leave(page: Page) {
  await page.getByRole("button", { name: "Leave room" }).click();
  await page
    .getByRole("group", { name: "Leave the room?" })
    .getByRole("button", { name: "Leave" })
    .click();
}

/**
 * The landing page, where Create and Join are. Its form waits for the stage,
 * which can take a while when several browsers load the scene at once.
 */
async function expectHome(page: Page) {
  await expect(page.getByRole("button", { name: "Create a room" })).toBeVisible(
    { timeout: 30_000 },
  );
}

test("the host kicks a connected player, who can join again under the same name", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");

  await joinRoom(guest.page, code, "Ansel");
  await expect(players(host.page)).toHaveCount(2);

  // Only the host sees remove buttons, and never for their own seat.
  await expect(guest.page.getByRole("button", { name: /^Remove/ })).toHaveCount(
    0,
  );
  await expect(
    host.page.getByRole("button", { name: "Remove Wren" }),
  ).toHaveCount(0);

  // Cancel keeps the seat.
  await host.page.getByRole("button", { name: "Remove Ansel" }).click();
  await host.page.getByRole("button", { name: "Cancel" }).click();
  await expect(players(host.page)).toHaveCount(2);

  await kick(host.page, "Ansel");
  await expect(players(host.page)).toHaveCount(1);
  await expect(guest.page.getByRole("main").getByRole("alert")).toContainText(
    "The host removed you",
  );
  expect(
    await guest.page.evaluate(
      (key) => window.localStorage.getItem(key),
      `avalon:seat:${code}`,
    ),
  ).toBeNull();

  // No ban: the same name is free again, and the new seat goes at the end.
  await guest.page.getByRole("button", { name: "Join again" }).click();
  await field(guest.page, "Your name").fill("Ansel");
  await guest.page.getByRole("button", { name: "Join room" }).click();
  await expect(players(host.page)).toHaveCount(2);
  await expect(players(guest.page).nth(1)).toContainText("Ansel (you)");

  await host.context.close();
  await guest.context.close();
});

test("a seat kicked while away finds the join form when it wakes", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");

  await joinRoom(guest.page, code, "Ansel");
  await guest.page.close();
  await expect(players(host.page).nth(1)).toHaveAttribute(
    "data-connected",
    "false",
  );

  await kick(host.page, "Ansel");
  await expect(players(host.page)).toHaveCount(1);

  const woke = await guest.context.newPage();

  await woke.goto(`/room/${code}`);
  await expect(field(woke, "Your name")).toBeVisible();
  await expect(
    woke.getByRole("main").getByRole("alert").filter({ hasText: /./ }),
  ).toContainText("That seat no longer exists");

  await host.context.close();
  await guest.context.close();
});

test("leaving closes every tab of that seat and goes home", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");

  await joinRoom(guest.page, code, "Ansel");
  const secondTab = await guest.context.newPage();

  await secondTab.goto(`/room/${code}`);
  await expect(players(secondTab).nth(1)).toContainText("Ansel (you)");

  // Stay keeps the seat.
  await guest.page.getByRole("button", { name: "Leave room" }).click();
  await guest.page.getByRole("button", { name: "Stay" }).click();
  await expect(players(host.page)).toHaveCount(2);

  await leave(guest.page);
  await expectHome(guest.page);
  await expectHome(secondTab);
  await expect(players(host.page)).toHaveCount(1);

  // The name is free at once.
  const other = await newPlayer(browser);

  await joinRoom(other.page, code, "Ansel");
  await expect(players(host.page)).toHaveCount(2);

  await host.context.close();
  await guest.context.close();
  await other.context.close();
});

test("a leaving host hands over at once, and the last seat out ends the room", async ({
  browser,
}) => {
  const wren = await newPlayer(browser);
  const ansel = await newPlayer(browser);
  const mira = await newPlayer(browser);
  const code = await createRoom(wren.page, "Wren");

  await joinRoom(ansel.page, code, "Ansel");
  await joinRoom(mira.page, code, "Mira");

  // Ansel is away, so host skips to the next connected seat: Mira.
  await ansel.page.close();
  await expect(players(wren.page).nth(1)).toHaveAttribute(
    "data-connected",
    "false",
  );

  await leave(wren.page);
  await expectHome(wren.page);
  await expect(players(mira.page)).toHaveCount(2);
  await expect(players(mira.page).nth(1)).toContainText("Host");
  await expect(
    mira.page.getByRole("button", { name: "Remove Ansel" }),
  ).toBeVisible();

  await kick(mira.page, "Ansel");
  await expect(players(mira.page)).toHaveCount(1);

  await leave(mira.page);
  await expectHome(mira.page);

  const late = await newPlayer(browser);

  await late.page.goto(`/room/${code}`);
  await expect(late.page.getByRole("main").getByRole("alert")).toContainText(
    "does not exist",
  );

  await wren.context.close();
  await ansel.context.close();
  await mira.context.close();
  await late.context.close();
});
