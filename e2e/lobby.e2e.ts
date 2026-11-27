import { expect, test, type Locator, type Page } from "@playwright/test";
import { CLOAKS } from "../src/shared/avatar";
import { listNames } from "../src/shared/copy";
import {
  STAGE_TIMEOUT,
  closePlayers,
  createRoom,
  joinRoom,
  newPlayer,
} from "./room-helpers";

/**
 * The lobby screen on the Star Table: the look picker and its portrait
 * camera.
 */

test.afterEach(closePlayers);

/** The name tag over a player's figure, as this page's stage draws it. */
const tagOf = (page: Page, name: string): Locator =>
  page.locator("[data-tag]", { hasText: name });

/** The cloak in a tag's `data-look` (body/skin/cloak/headwear/emblem). */
async function cloakOf(tag: Locator): Promise<string> {
  const look = await tag.getAttribute("data-look");

  return look?.split("/")[2] ?? "";
}

/** Count the `lobby:avatar` requests a page sends. */
function countLookRequests(page: Page) {
  const count = { sent: 0 };

  page.on("websocket", (socket) => {
    socket.on("framesent", (frame) => {
      if (
        typeof frame.payload === "string" &&
        frame.payload.includes('"lobby:avatar"')
      ) {
        count.sent += 1;
      }
    });
  });

  return count;
}

const picker = (page: Page) => page.getByRole("dialog", { name: "Your look" });

const openPicker = (page: Page) =>
  page.getByRole("button", { name: /^Your look/ }).click();

/** A cloak other than this one. */
const otherCloak = (cloak: string) => CLOAKS.find((c) => c !== cloak) ?? "";

test("a picked look reaches the table once, on Done", async ({ browser }) => {
  const host = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");
  const guest = await newPlayer(browser);
  const sent = countLookRequests(guest.page);

  await joinRoom(guest.page, code, "Ansel");
  const hostsView = tagOf(host.page, "Ansel");

  await expect(hostsView).toHaveAttribute("data-look", /\//);
  const before = await cloakOf(hostsView);
  const chosen = otherCloak(before);

  // While the picker is open the camera is close on your figure.
  await openPicker(guest.page);
  await expect(picker(guest.page)).toBeVisible();
  await expect(guest.page.locator("[data-stage-host]")).toHaveAttribute(
    "data-shot",
    "portrait",
  );
  await picker(guest.page).locator(`[data-look="cloak:${chosen}"]`).click();
  // A draft is not sent: the host still sees the old look.
  await expect(hostsView).toHaveAttribute(
    "data-look",
    new RegExp(`/${before}/`),
  );
  await picker(guest.page).getByRole("button", { name: "Done" }).click();
  await expect(picker(guest.page)).toHaveCount(0);
  await expect(guest.page.locator("[data-stage-host]")).toHaveAttribute(
    "data-shot",
    "lobby",
  );
  await expect(hostsView).toHaveAttribute(
    "data-look",
    new RegExp(`/${chosen}/`),
  );
  expect(sent.sent).toBe(1);

  // Opened and closed with no change: nothing is sent.
  await openPicker(guest.page);
  await picker(guest.page).getByRole("button", { name: "Done" }).click();
  await expect(picker(guest.page)).toHaveCount(0);
  expect(sent.sent).toBe(1);

  // Escape saves too.
  const third = otherCloak(chosen);

  await openPicker(guest.page);
  await picker(guest.page).locator(`[data-look="cloak:${third}"]`).click();
  await guest.page.keyboard.press("Escape");
  await expect(picker(guest.page)).toHaveCount(0);
  await expect(hostsView).toHaveAttribute(
    "data-look",
    new RegExp(`/${third}/`),
  );
  expect(sent.sent).toBe(2);
});

test("a look is kept on reload and carried to the next room", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");
  const guest = await newPlayer(browser);

  await joinRoom(guest.page, code, "Ansel");
  const before = await cloakOf(tagOf(host.page, "Ansel"));
  const chosen = otherCloak(before);

  await openPicker(guest.page);
  await picker(guest.page).locator(`[data-look="cloak:${chosen}"]`).click();
  // A tap outside the picker saves and closes it. Clicking the backdrop
  // itself fails loudly if the sheet or another control covers that spot.
  await guest.page
    .getByRole("button", { name: "Close your look" })
    .click({ position: { x: 10, y: 300 } });
  await expect(picker(guest.page)).toHaveCount(0);
  await expect(tagOf(host.page, "Ansel")).toHaveAttribute(
    "data-look",
    new RegExp(`/${chosen}/`),
  );

  // Saved in this browser once the room has accepted it.
  await expect
    .poll(() =>
      guest.page.evaluate(() =>
        window.localStorage.getItem("avalon:starlit-avatar:v1"),
      ),
    )
    .toContain(`"cloak":"${chosen}"`);

  // The room keeps it.
  await guest.page.reload();
  await expect(tagOf(guest.page, "Ansel")).toHaveAttribute(
    "data-look",
    new RegExp(`/${chosen}/`),
    STAGE_TIMEOUT,
  );

  // This browser keeps it for the next room it joins.
  const other = await newPlayer(browser);
  const next = await createRoom(other.page, "Mira");

  await joinRoom(guest.page, next, "Ansel");
  await expect(tagOf(other.page, "Ansel")).toHaveAttribute(
    "data-look",
    new RegExp(`/${chosen}/`),
  );
});

const startButton = (page: Page) =>
  page.getByRole("button", { name: "Start", exact: true });

const blockers = (page: Page) =>
  page.getByRole("status", { name: "Before the game starts" });

test("five players ready up, and Start waits for the last", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const host = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");
  const names = ["Ansel", "Bram", "Cora", "Dov"];
  const guests = [];

  for (const name of names) {
    const guest = await newPlayer(browser);

    await joinRoom(guest.page, code, name);
    guests.push(guest);
  }

  await expect(startButton(host.page)).toBeDisabled();
  await expect(blockers(host.page)).toHaveText(
    "Waiting for Ansel, Bram, Cora and Dov to ready up.",
  );

  const waiting = [...names];

  for (const guest of guests) {
    const ready = guest.page.getByRole("button", { name: "I'm ready" });

    await ready.click();
    await expect(ready).toHaveAttribute("aria-pressed", "true");
    waiting.shift();

    if (waiting.length > 0) {
      await expect(blockers(host.page)).toHaveText(
        `Waiting for ${listNames(waiting)} to ready up.`,
      );
      await expect(startButton(host.page)).toBeDisabled();
    }
  }

  await expect(blockers(host.page)).toHaveText("Everyone is here and ready.");
  await expect(startButton(host.page)).toBeEnabled();

  // Until the game exists (Phase 2) the room refuses Start, and says so.
  await startButton(host.page).click();
  await expect(
    host.page.getByRole("alert").filter({ hasText: /./ }),
  ).toHaveText("That is not available yet.");

  // One guest changes their mind: Start waits again.
  const bram = guests[1];

  if (!bram) {
    throw new Error("No second guest");
  }

  await bram.page.getByRole("button", { name: "I'm ready" }).click();
  await expect(startButton(host.page)).toBeDisabled();
  await expect(blockers(host.page)).toHaveText("Waiting for Bram to ready up.");
});

test("when the host leaves, the table is told who hosts now", async ({
  browser,
}) => {
  const wren = await newPlayer(browser);
  const code = await createRoom(wren.page, "Wren");
  const ansel = await newPlayer(browser);
  const bram = await newPlayer(browser);

  await joinRoom(ansel.page, code, "Ansel");
  await joinRoom(bram.page, code, "Bram");
  // Nobody is told anything on arrival.
  await expect(ansel.page.getByTestId("notice")).toHaveCount(0);

  await wren.page.getByRole("button", { name: "Leave room" }).click();
  await wren.page
    .getByRole("group", { name: "Leave the room?" })
    .getByRole("button", { name: "Leave" })
    .click();

  await expect(ansel.page.getByTestId("notice")).toHaveText(
    "You are now the host",
  );
  await expect(bram.page.getByTestId("notice")).toHaveText(
    "Ansel is now the host",
  );
  // The crown moves in the list, and the notice goes after 5 seconds.
  await expect(
    bram.page.getByTestId("player").filter({ hasText: "Ansel" }),
  ).toContainText("Host");
  await expect(bram.page.getByTestId("notice")).toHaveCount(0, {
    timeout: 10_000,
  });
  // A reload says nothing.
  await ansel.page.reload();
  await expect(
    ansel.page.getByTestId("player").filter({ hasText: "Ansel (you)" }),
  ).toContainText("Host", STAGE_TIMEOUT);
  await expect(ansel.page.getByTestId("notice")).toHaveCount(0);
});
