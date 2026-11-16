/**
 * Socket.IO wiring. Thin on purpose: validate the payload, call the room
 * store, then send every connected player their own view.
 */

import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import type { z } from "zod";
import {
  SOCKET_PATH,
  createRoomSchema,
  joinRoomSchema,
  resumeSchema,
  type Ack,
  type ClientToServerEvents,
  type ProtocolError,
  type SeatGrant,
  type ServerToClientEvents,
} from "@/shared/protocol";
import type { PlayerId, RoomCode } from "@/shared/views";
import {
  RoomError,
  RoomStore,
  type RoomRecord,
  type Seat,
} from "@/server/rooms/room-store";
import { projectView } from "./project-view";

type NoEvents = Record<string, never>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents, NoEvents>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, NoEvents>;

const SWEEP_INTERVAL_MS = 60_000;

/** Each player has a private channel. Views are only ever sent to these. */
function playerChannel(code: RoomCode, playerId: PlayerId): string {
  return `player:${code}:${playerId}`;
}

function toProtocolError(error: unknown): ProtocolError {
  if (error instanceof RoomError) {
    return { code: error.code, message: error.message };
  }
  throw error;
}

export interface Realtime {
  io: AppServer;
  store: RoomStore;
  close: () => Promise<void>;
}

export function attachRealtime(
  httpServer: HttpServer,
  store: RoomStore = new RoomStore(),
): Realtime {
  const io: AppServer = new Server(httpServer, {
    path: SOCKET_PATH,
    serveClient: false,
  });

  /** Send every connected player in the room their own filtered view. */
  function publish(room: RoomRecord): void {
    for (const player of room.players) {
      if (player.socketIds.size === 0) continue;
      io.to(playerChannel(room.code, player.id)).emit(
        "room:state",
        projectView(room, player.id),
      );
    }
  }

  async function seat(
    socket: AppSocket,
    next: Seat & { token: string },
  ): Promise<SeatGrant> {
    const previous = store.attachSocket(next, socket.id);
    if (previous) {
      await socket.leave(playerChannel(previous.room.code, previous.player.id));
      publish(previous.room);
    }
    await socket.join(playerChannel(next.room.code, next.player.id));
    publish(next.room);
    return { code: next.room.code, token: next.token };
  }

  /** Parse the payload, run the handler, and always answer the ack. */
  function handle<S extends z.ZodType, T>(
    schema: S,
    run: (input: z.output<S>) => Promise<T>,
  ): (input: unknown, ack: Ack<T>) => void {
    return (input, ack) => {
      if (typeof ack !== "function") return;
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        ack({
          ok: false,
          error: {
            code: "INVALID_PAYLOAD",
            message: "That request was not valid.",
          },
        });
        return;
      }
      run(parsed.data).then(
        (data) => ack({ ok: true, data }),
        (error: unknown) => {
          try {
            ack({ ok: false, error: toProtocolError(error) });
          } catch (unexpected) {
            console.error("[realtime] handler failed", unexpected);
            ack({
              ok: false,
              error: { code: "NOT_ALLOWED", message: "Something went wrong." },
            });
          }
        },
      );
    };
  }

  io.on("connection", (socket) => {
    socket.on(
      "room:create",
      handle(createRoomSchema, async ({ name }) =>
        seat(socket, store.createRoom(name)),
      ),
    );

    socket.on(
      "room:join",
      handle(joinRoomSchema, async ({ code, name }) =>
        seat(socket, store.joinRoom(code, name)),
      ),
    );

    socket.on(
      "room:resume",
      handle(resumeSchema, async ({ token }) =>
        seat(socket, { ...store.resume(token), token }),
      ),
    );

    socket.on("disconnect", () => {
      const left = store.detachSocket(socket.id);
      if (left) publish(left.room);
    });
  });

  const sweeper = setInterval(() => {
    for (const code of store.sweep()) {
      console.log(`[realtime] room ${code} expired`);
    }
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();

  return {
    io,
    store,
    close: async () => {
      clearInterval(sweeper);
      await io.close();
    },
  };
}
