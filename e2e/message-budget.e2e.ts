import { expect, test, type Page } from "@playwright/test";
import { closePlayers, createRoom, newPlayer } from "./room-helpers";

/**
 * The per-socket message budget (issue 20), through the real Worker and room
 * object: a burst of 20, then 5 a second. A flood is answered RATE_LIMITED and
 * the socket stays open.
 *
 * The flooding socket has no seat, so a request within budget is answered
 * NOT_IN_ROOM. That tells the two answers apart without changing the room.
 * Counts are ranges, not exact: against a preview or the live site some
 * budget refills while the messages travel.
 */

test.describe.configure({ timeout: 60_000 });
test.afterEach(closePlayers);

interface Flood {
  codes: Array<string>;
  openAfterFlood: boolean;
  later: string;
}

/**
 * From the page, open a second socket to the room, send `garbage` unreadable
 * strings and then `valid` `lobby:ready` requests in one go, and collect the
 * acks. Then wait `waitMs` and send one more request.
 */
function flood(
  page: Page,
  code: string,
  options: { garbage: number; valid: number; waitMs: number },
): Promise<Flood> {
  return page.evaluate(
    async ({ code, garbage, valid, waitMs }) => {
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

      // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the browser, so it cannot live in this module's scope
      const request = (id: number) =>
        JSON.stringify({ id, event: "lobby:ready", payload: { ready: true } });
      const until = (done: () => boolean) =>
        new Promise<void>((resolve, reject) => {
          const started = Date.now();

          const check = () => {
            if (done()) {
              resolve();
            } else if (Date.now() - started > 10_000) {
              reject(new Error(`Only ${acks.size} acks arrived.`));
            } else {
              window.setTimeout(check, 20);
            }
          };

          check();
        });

      for (let i = 0; i < garbage; i += 1) {
        socket.send("this is not JSON");
      }

      for (let id = 1; id <= valid; id += 1) {
        socket.send(request(id));
      }

      await until(() => acks.size >= valid);
      const codes = Array.from({ length: valid }, (_, i) => acks.get(i + 1));
      const openAfterFlood = socket.readyState === WebSocket.OPEN;

      await new Promise((resolve) => {
        window.setTimeout(resolve, waitMs);
      });
      const lastId = valid + 1;

      socket.send(request(lastId));
      await until(() => acks.has(lastId));
      const later = acks.get(lastId) ?? "none";

      socket.close();

      return {
        codes: codes.map((c) => c ?? "none"),
        openAfterFlood,
        later,
      };
    },
    { code, ...options },
  );
}

test("a flood is answered RATE_LIMITED and the socket stays open", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");
  const result = await flood(host.page, code, {
    garbage: 0,
    valid: 40,
    waitMs: 1200,
  });
  const limited = result.codes.filter((c) => c === "RATE_LIMITED").length;

  // The first burst is within budget: an unseated socket gets NOT_IN_ROOM.
  expect(result.codes.slice(0, 20)).toEqual(Array(20).fill("NOT_IN_ROOM"));
  expect(limited).toBeGreaterThanOrEqual(15);
  expect(result.openAfterFlood).toBe(true);
  // The budget refills: a request a second later is handled again.
  expect(result.later).toBe("NOT_IN_ROOM");
  // The room is untouched for everyone else.
  await expect(
    host.page.locator('[data-testid="connection"][data-online="true"]'),
  ).toBeVisible();
});

test("unreadable messages spend the budget too", async ({ browser }) => {
  const host = await newPlayer(browser);
  const code = await createRoom(host.page, "Wren");
  const result = await flood(host.page, code, {
    garbage: 20,
    valid: 1,
    waitMs: 0,
  });

  // Twenty dropped messages, no ack for any of them, and the budget is gone.
  expect(result.codes).toEqual(["RATE_LIMITED"]);
  expect(result.openAfterFlood).toBe(true);
});
