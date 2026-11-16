import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { io as connect, type Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SOCKET_PATH,
  type ClientToServerEvents,
  type Result,
  type SeatGrant,
  type ServerToClientEvents,
} from "@/shared/protocol";
import type { RoomView } from "@/shared/views";
import { attachRealtime, type Realtime } from "./attach";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let realtime: Realtime;
let url: string;
const clients: Client[] = [];

/** A connected client that records every view it is sent. */
async function client(): Promise<{ socket: Client; views: RoomView[] }> {
  const socket: Client = connect(url, {
    path: SOCKET_PATH,
    transports: ["websocket"],
    forceNew: true,
  });
  clients.push(socket);
  const views: RoomView[] = [];
  socket.on("room:state", (view) => views.push(view));
  await new Promise<void>((resolve) => socket.on("connect", () => resolve()));
  return { socket, views };
}

function grant(result: Result<SeatGrant>): SeatGrant {
  if (!result.ok) throw new Error(result.error.code);
  return result.data;
}

async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !check(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(check()).toBe(true);
}

beforeEach(async () => {
  httpServer = createServer();
  realtime = attachRealtime(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const socket of clients.splice(0)) socket.disconnect();
  await realtime.close();
});

describe("realtime", () => {
  it("sends each player only their own view", async () => {
    const host = await client();
    const guest = await client();

    const created = grant(
      await host.socket.emitWithAck("room:create", { name: "Wren" }),
    );
    grant(
      await guest.socket.emitWithAck("room:join", {
        code: created.code.toLowerCase(),
        name: "  Ansel ",
      }),
    );

    await until(
      () => host.views.at(-1)?.players.length === 2 && guest.views.length > 0,
    );
    const hostView = host.views.at(-1);
    const guestView = guest.views.at(-1);

    expect(hostView?.players.map((p) => p.name)).toEqual(["Wren", "Ansel"]);
    expect(hostView?.you.isHost).toBe(true);
    expect(guestView?.you.isHost).toBe(false);
    expect(guestView?.you.id).not.toBe(hostView?.you.id);
    // Neither socket was ever sent a view addressed to the other player.
    expect(host.views.every((v) => v.you.id === hostView?.you.id)).toBe(true);
    expect(guest.views.every((v) => v.you.id === guestView?.you.id)).toBe(true);
  });

  it("gives a returning player their seat back", async () => {
    const host = await client();
    const first = await client();
    const created = grant(
      await host.socket.emitWithAck("room:create", { name: "Wren" }),
    );
    const seat = grant(
      await first.socket.emitWithAck("room:join", {
        code: created.code,
        name: "Ansel",
      }),
    );

    first.socket.disconnect();
    await until(() => host.views.at(-1)?.players[1]?.connected === false);

    const second = await client();
    grant(
      await second.socket.emitWithAck("room:resume", { token: seat.token }),
    );
    await until(() => host.views.at(-1)?.players[1]?.connected === true);

    expect(host.views.at(-1)?.players).toHaveLength(2);
    expect(second.views.at(-1)?.you.id).toBe(first.views.at(-1)?.you.id);
  });

  it("answers bad requests with an error instead of throwing", async () => {
    const { socket } = await client();

    const empty = await socket.emitWithAck("room:create", { name: "   " });
    const missing = await socket.emitWithAck("room:join", {
      code: "ZZZZ",
      name: "Wren",
    });
    const forged = await socket.emitWithAck("room:resume", { token: "nope" });

    expect(empty).toMatchObject({
      ok: false,
      error: { code: "INVALID_PAYLOAD" },
    });
    expect(missing).toMatchObject({
      ok: false,
      error: { code: "ROOM_NOT_FOUND" },
    });
    expect(forged).toMatchObject({
      ok: false,
      error: { code: "SESSION_INVALID" },
    });
  });
});
