import { expect, test, type Page } from "@playwright/test";
import { withoutWebGL } from "./no-webgl";
import {
  closePlayers,
  createRoom,
  joinRoom,
  newPlayer,
  players,
} from "./room-helpers";

/**
 * The 3D gate: the game is played at the 3D table, so a browser without
 * WebGL2 sees a notice instead of the form, and never opens a socket to a
 * room (it would take a seat it cannot play from).
 */

test.afterEach(closePlayers);

const notice = (page: Page) =>
  page.getByRole("heading", { name: "This game needs 3D graphics" });

/** Count the room sockets a page opens. */
function countSockets(page: Page) {
  const count = { opened: 0 };

  page.on("websocket", (socket) => {
    if (socket.url().includes("/api/socket/")) {
      count.opened += 1;
    }
  });

  return count;
}

test("without WebGL the landing shows the notice, not the form", async ({
  page,
}) => {
  await withoutWebGL(page);
  await page.goto("/");
  await expect(notice(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create a room" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Join" })).toHaveCount(0);
});

test("a room link without WebGL shows the notice and takes no seat", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");
  const stranger = await newPlayer(browser);
  const sockets = countSockets(stranger.page);

  await withoutWebGL(stranger.page);
  await stranger.page.goto(`/room/${code}`);
  await expect(notice(stranger.page)).toBeVisible();
  await expect(
    stranger.page.getByRole("textbox", { name: "Your name" }),
  ).toHaveCount(0);
  // Give a socket time to open, were one going to.
  await stranger.page.waitForTimeout(1000);
  expect(sockets.opened).toBe(0);
  await expect(players(host.page)).toHaveCount(1);
});

test("a seated guest who reopens without WebGL is away, not reseated", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");
  const guest = await newPlayer(browser);

  await joinRoom(guest.page, code, "Ansel");
  await expect(players(host.page).nth(1)).toHaveAttribute(
    "data-connected",
    "true",
  );

  const again = await guest.context.newPage();
  const sockets = countSockets(again);

  await withoutWebGL(again);
  await guest.page.close();
  await again.goto(`/room/${code}`);
  await expect(notice(again)).toBeVisible();
  await expect(players(host.page).nth(1)).toHaveAttribute(
    "data-connected",
    "false",
  );
  expect(sockets.opened).toBe(0);
});

test("a context lost after joining shows Reload and keeps the seat", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");
  const guest = await newPlayer(browser);

  await joinRoom(guest.page, code, "Ansel");
  // The GPU drops the table, as a phone under memory pressure can.
  await guest.page.evaluate(() => {
    document
      .querySelector<HTMLCanvasElement>("[data-stage-host] canvas")
      ?.getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  });
  await expect(notice(guest.page)).toBeVisible();
  await expect(
    guest.page.getByRole("button", { name: "Reload" }),
  ).toBeVisible();
  // The socket and the seat are untouched.
  await guest.page.waitForTimeout(1000);
  await expect(players(host.page).nth(1)).toHaveAttribute(
    "data-connected",
    "true",
  );
});
