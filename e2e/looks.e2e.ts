import { expect, test, type Page } from "@playwright/test";
import {
  BODIES,
  CLOAKS,
  EMBLEMS,
  HEADWEAR,
  SKINS,
  type Avatar,
} from "../src/shared/avatar";
import { closePlayers, createRoom, newPlayer } from "./room-helpers";

/**
 * Looks travel through the real Worker and room object (issue 21): on
 * `room:join` and by `lobby:avatar`. The lobby screen does not draw looks
 * until 1c, so the guest is a raw socket from the page, and the test reads
 * the views the host's own socket receives.
 */

test.afterEach(closePlayers);

interface Seat {
  name: string;
  avatar: Avatar;
}

const look: Avatar = {
  body: "male",
  skin: "starborn",
  cloak: "moss",
  headwear: "helm",
  emblem: "key",
};

/** Every seat list the page's own room socket is sent, in order. */
function watchSeats(page: Page): Array<Array<Seat>> {
  const seen: Array<Array<Seat>> = [];

  page.on("websocket", (socket) => {
    if (!socket.url().includes("/api/socket/")) {
      return;
    }

    socket.on("framereceived", (frame) => {
      if (typeof frame.payload !== "string" || frame.payload === "pong") {
        return;
      }

      const message: { type: string; view?: { players: Array<Seat> } } =
        JSON.parse(frame.payload);

      if (message.type === "state" && message.view) {
        seen.push(message.view.players);
      }
    });
  });

  return seen;
}

/** The look the host was last shown for `name`. */
function lastLookOf(seen: Array<Array<Seat>>, name: string) {
  return seen.at(-1)?.find((seat) => seat.name === name)?.avatar ?? null;
}

/**
 * From the page, open a socket of its own (a second phone, in effect), send
 * each request in turn and wait for its ack. Returns each ack's error code,
 * or "OK".
 */
function rawRequests(
  page: Page,
  code: string,
  requests: Array<{ event: string; payload: unknown }>,
): Promise<Array<string>> {
  return page.evaluate(
    async ({ code, requests }) => {
      const url = new URL(`/api/socket/${code}`, window.location.href);

      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(url);
      const acks = new Map<number, string>();

      socket.addEventListener("message", (message) => {
        if (typeof message.data !== "string" || message.data === "pong") {
          return;
        }

        const frame: {
          type: string;
          id?: number;
          result?: { ok: boolean; error?: { code: string } };
        } = JSON.parse(message.data);

        if (frame.type === "ack" && frame.id !== undefined) {
          acks.set(frame.id, frame.result?.error?.code ?? "OK");
        }
      });
      await new Promise((resolve) => {
        socket.addEventListener("open", resolve);
      });

      const codes: Array<string> = [];

      for (const [index, request] of requests.entries()) {
        const id = index + 1;

        socket.send(JSON.stringify({ id, ...request }));
        await new Promise<void>((resolve, reject) => {
          const started = Date.now();

          const check = () => {
            if (acks.has(id)) {
              resolve();
            } else if (Date.now() - started > 10_000) {
              reject(new Error(`No ack for ${request.event}.`));
            } else {
              window.setTimeout(check, 20);
            }
          };

          check();
        });
        codes.push(acks.get(id) ?? "none");
      }

      // Kept open a moment, so the host sees the guest connected.
      await new Promise((resolve) => {
        window.setTimeout(resolve, 200);
      });
      socket.close();

      return codes;
    },
    { code, requests },
  );
}

function isValidLook(avatar: Avatar | null): boolean {
  return (
    avatar !== null &&
    BODIES.includes(avatar.body) &&
    SKINS.includes(avatar.skin) &&
    CLOAKS.includes(avatar.cloak) &&
    HEADWEAR.includes(avatar.headwear) &&
    EMBLEMS.includes(avatar.emblem)
  );
}

test("a guest who joins with a look is shown with it", async ({ browser }) => {
  const host = await newPlayer(browser);
  const seen = watchSeats(host.page);
  const code = await createRoom(host.page, "Wren");
  const codes = await rawRequests(host.page, code, [
    { event: "room:join", payload: { name: "Ansel", avatar: look } },
  ]);

  expect(codes).toEqual(["OK"]);
  await expect.poll(() => lastLookOf(seen, "Ansel")).toEqual(look);
  // The host has a valid look too, from their seat id.
  expect(isValidLook(lastLookOf(seen, "Wren"))).toBe(true);
});

test("a join with an invalid look still seats the guest, with a valid look", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const seen = watchSeats(host.page);
  const code = await createRoom(host.page, "Wren");
  const invalid = { ...look, cloak: "crimson", crown: "gold" };
  const codes = await rawRequests(host.page, code, [
    { event: "room:join", payload: { name: "Ansel", avatar: invalid } },
  ]);

  expect(codes).toEqual(["OK"]);
  await expect.poll(() => lastLookOf(seen, "Ansel")).not.toBeNull();
  const shown = lastLookOf(seen, "Ansel");

  expect(isValidLook(shown)).toBe(true);
  expect(shown).not.toHaveProperty("crown");
});

test("lobby:avatar changes a seated guest's look; an invalid one is refused", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const seen = watchSeats(host.page);
  const code = await createRoom(host.page, "Wren");
  const changed: Avatar = { ...look, cloak: "plum", emblem: "moon" };
  const codes = await rawRequests(host.page, code, [
    { event: "lobby:avatar", payload: { avatar: changed } },
    { event: "room:join", payload: { name: "Ansel", avatar: look } },
    { event: "lobby:avatar", payload: { avatar: changed } },
    { event: "lobby:avatar", payload: { avatar: { ...look, skin: "plaid" } } },
  ]);

  // Before joining there is no seat to change.
  expect(codes).toEqual(["NOT_IN_ROOM", "OK", "OK", "INVALID_PAYLOAD"]);
  await expect.poll(() => lastLookOf(seen, "Ansel")).toEqual(changed);
});
