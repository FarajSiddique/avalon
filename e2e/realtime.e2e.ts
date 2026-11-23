import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { field, players } from "./room-helpers";

/**
 * The real-time proof for this checkpoint: two separate browsers (separate
 * storage, like two phones) join one room through the real Worker and its room
 * object, and see each other arrive, leave and come back.
 */

const stateMessage = z.object({
  type: z.string(),
  view: z.object({ you: z.object({ id: z.string() }) }).optional(),
});

/** Record the `you.id` of every state message a page receives. */
const watch = (page: Page): Array<string> => {
  const seen: Array<string> = [];

  page.on("websocket", (socket) => {
    if (!socket.url().includes("/api/socket/")) {
      return;
    }

    socket.on("framereceived", (frame) => {
      if (typeof frame.payload !== "string" || frame.payload === "pong") {
        return;
      }

      const parsed = stateMessage.safeParse(JSON.parse(frame.payload));

      if (parsed.success && parsed.data.type === "state" && parsed.data.view) {
        seen.push(parsed.data.view.you.id);
      }
    });
  });

  return seen;
};

/** The page's own WebSocket to the room is open. */
async function expectConnected(page: Page) {
  await expect(page.getByTestId("connection")).toHaveAttribute(
    "data-online",
    "true",
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
  await expect(host.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
  const code = await host.getByTestId("room-code").innerText();

  await expect(host).toHaveURL(new RegExp(`/room/${code}$`));
  await expect(players(host)).toHaveCount(1);
  await expect(players(host).first()).toContainText("Wren (you)");
  await expectConnected(host);

  // Guest joins with the code from the landing page.
  await guest.goto("/");
  await field(guest, "Have a room code?").fill(code.toLowerCase());
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  // The address changes before the new screen is drawn, so wait for the screen.
  await expect(guest.getByTestId("room-code")).toHaveText(code);
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
  await expectConnected(guest);

  // A name that is already taken is refused with a message.
  const strangerContext = await browser.newContext();
  const stranger = await strangerContext.newPage();

  await stranger.goto(`/room/${code}`);
  await field(stranger, "Your name").fill("wren");
  await stranger.getByRole("button", { name: "Join room" }).click();
  await expect(
    stranger.getByRole("main").getByRole("alert").filter({ hasText: /./ }),
  ).toContainText("has that name");
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

test("each browser is only ever sent its own view", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const hostSaw = watch(host);
  const guestSaw = watch(guest);

  await host.goto("/");
  await field(host, "Your name").fill("Wren");
  await host.getByRole("button", { name: "Create a room" }).click();
  await expect(host.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
  const code = await host.getByTestId("room-code").innerText();

  await guest.goto(`/room/${code}`);
  await field(guest, "Your name").fill("Ansel");
  await guest.getByRole("button", { name: "Join room" }).click();
  await expect(players(host)).toHaveCount(2);
  await expect(players(guest)).toHaveCount(2);

  expect(hostSaw.length).toBeGreaterThan(1);
  expect(guestSaw.length).toBeGreaterThan(0);
  expect(new Set(hostSaw).size).toBe(1);
  expect(new Set(guestSaw).size).toBe(1);
  expect(hostSaw[0]).not.toBe(guestSaw[0]);

  await hostContext.close();
  await guestContext.close();
});

test("an unknown room code says so", async ({ page }) => {
  await page.goto("/room/ZZZZ");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "does not exist",
  );
  await expect(field(page, "Your name")).toHaveCount(0);
});

test("a malformed room code shows the not-found page", async ({ page }) => {
  await page.goto("/room/not-a-code");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByTestId("room-code")).toHaveCount(0);
});

interface SentView {
  players: Array<{ name: string; ready: boolean }>;
  settings?: { optionalRoles: Array<string>; ladyOfTheLake: boolean };
  startBlockers?: Array<{ kind: string; allowed?: number }>;
}

/**
 * Open a second socket from this page, take the page's seat with its stored
 * token, then send one request. Returns its answer and the view in the state
 * that followed. Phase 1 has no lobby controls on the real room screen yet,
 * so this drives the protocol directly.
 */
async function sendRequest(
  page: Page,
  code: string,
  event: string,
  payload: unknown,
) {
  return page.evaluate(
    async ({ code, event, payload }) => {
      const token = window.localStorage.getItem(`avalon:seat:${code}`);
      const url = new URL(`/api/socket/${code}`, window.location.href);

      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(url);
      const frames: Array<{
        type: string;
        id?: number;
        result?: { ok: boolean; data?: unknown; error?: { code: string } };
        view?: SentView;
      }> = [];

      await new Promise((resolve) => {
        socket.addEventListener("open", resolve);
      });
      socket.addEventListener("message", (message) => {
        if (typeof message.data === "string" && message.data !== "pong") {
          frames.push(JSON.parse(message.data));
        }
      });
      const answer = (id: number) =>
        new Promise<(typeof frames)[number]>((resolve) => {
          const check = () => {
            const ack = frames.find((f) => f.type === "ack" && f.id === id);

            if (ack) {
              resolve(ack);
            } else {
              window.setTimeout(check, 20);
            }
          };

          check();
        });

      socket.send(
        JSON.stringify({ id: 1, event: "room:resume", payload: { token } }),
      );
      await answer(1);
      const before = frames.length;

      socket.send(JSON.stringify({ id: 2, event, payload }));
      const ack = await answer(2);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 200);
      });
      const state = frames
        .slice(before)
        .findLast((f) => f.type === "state" && f.view);

      socket.close();

      return { result: ack.result, view: state?.view ?? null };
    },
    { code, event, payload },
  );
}

async function sendReady(page: Page, code: string, ready: boolean) {
  const { result, view } = await sendRequest(page, code, "lobby:ready", {
    ready,
  });

  return {
    result,
    seats: view?.players.map((p) => [p.name, p.ready]) ?? null,
  };
}

test("a guest readies up, and the host cannot", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  await host.goto("/");
  await field(host, "Your name").fill("Wren");
  await host.getByRole("button", { name: "Create a room" }).click();
  await expect(host.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
  const code = await host.getByTestId("room-code").innerText();

  await guest.goto(`/room/${code}`);
  await field(guest, "Your name").fill("Ansel");
  await guest.getByRole("button", { name: "Join room" }).click();
  await expect(players(host)).toHaveCount(2);
  await expect(players(guest)).toHaveCount(2);

  const readied = await sendReady(guest, code, true);

  expect(readied.result).toEqual({ ok: true, data: null });
  expect(readied.seats).toEqual([
    ["Wren", false],
    ["Ansel", true],
  ]);

  const hostTried = await sendReady(host, code, true);

  expect(hostTried.result).toMatchObject({
    ok: false,
    error: { code: "NOT_ALLOWED" },
  });

  const unreadied = await sendReady(guest, code, false);

  expect(unreadied.seats).toEqual([
    ["Wren", false],
    ["Ansel", false],
  ]);

  await hostContext.close();
  await guestContext.close();
});

test("the host saves any role mix, and too many Evil roles block Start", async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 5 }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const [host, ...guests] = pages;

  if (!host) {
    throw new Error("No host page");
  }

  await host.goto("/");
  await field(host, "Your name").fill("Wren");
  await host.getByRole("button", { name: "Create a room" }).click();
  await expect(host.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
  const code = await host.getByTestId("room-code").innerText();

  for (const [i, guest] of guests.entries()) {
    await guest.goto(`/room/${code}`);
    await field(guest, "Your name").fill(`Guest${i + 1}`);
    await guest.getByRole("button", { name: "Join room" }).click();
    await expect(players(guest)).toHaveCount(i + 2);
    await sendReady(guest, code, true);
  }

  const tooMany = await sendRequest(host, code, "lobby:settings", {
    optionalRoles: ["morgana", "mordred"],
    ladyOfTheLake: true,
  });

  expect(tooMany.result).toEqual({ ok: true, data: null });
  expect(tooMany.view, "a state frame after the change").not.toBeNull();
  expect(tooMany.view?.settings).toEqual({
    optionalRoles: ["morgana", "mordred"],
    ladyOfTheLake: true,
  });
  expect(tooMany.view?.startBlockers).toEqual([
    { kind: "too_many_evil_roles", allowed: 2 },
  ]);

  const guest = guests[0];

  if (!guest) {
    throw new Error("No guest page");
  }

  const guestTried = await sendRequest(guest, code, "lobby:settings", {
    optionalRoles: [],
    ladyOfTheLake: false,
  });

  expect(guestTried.result).toMatchObject({
    ok: false,
    error: { code: "NOT_HOST" },
  });

  // A lone Morgana and the Lady at 5 seats are hints, not blockers.
  const fits = await sendRequest(host, code, "lobby:settings", {
    optionalRoles: ["morgana"],
    ladyOfTheLake: true,
  });

  expect(fits.view, "a state frame after the change").not.toBeNull();
  expect(fits.view?.startBlockers).toEqual([]);
  expect(fits.view?.players.slice(1).every((p) => p.ready)).toBe(true);

  await Promise.all(contexts.map((c) => c.close()));
});
