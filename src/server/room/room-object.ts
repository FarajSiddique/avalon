/**
 * One Durable Object per room. It is the only thing that holds a room's state
 * and its players' sockets, so it is the single authority for that room.
 *
 * The object sleeps ("hibernates") whenever no message is being handled, and
 * its memory is wiped when it does. So nothing here may live only in a field:
 * the room is saved to storage after every change, each socket remembers its
 * seat in its attachment, and anything that must happen later is an alarm.
 */

import { DurableObject } from "cloudflare:workers";
import type { z } from "zod";
import {
  CLOSE_ROOM_GONE,
  MAX_MESSAGE_LENGTH,
  PING,
  PONG,
  type ProtocolError,
  type Result,
  type RoomClosedReason,
  type SeatGrant,
  type ServerMessage,
} from "@/shared/protocol";
import {
  clientMessageSchema,
  emptySchema,
  joinRoomSchema,
  kickSchema,
  readySchema,
  resumeSchema,
} from "@/shared/schemas";
import type { PlayerId, RoomCode } from "@/shared/views";
import { projectView } from "./project-view";
import {
  RoomError,
  createRoom,
  findSeat,
  joinRoom,
  kickSeat,
  leaveRoom,
  nextExpiryCheck,
  setReady,
  withPresence,
  type RoomDeps,
  type RoomState,
  type Seated,
} from "./state";

const ROOM_KEY = "room";

/** What each socket remembers across hibernation. */
interface SocketAttachment {
  playerId: PlayerId | null;
}

const deps: RoomDeps = {
  now: () => Date.now(),
  newId: () => crypto.randomUUID(),
  newSecret: () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));

    return btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  },
};

function seatOf(socket: WebSocket): PlayerId | null {
  const attachment: unknown = socket.deserializeAttachment();

  return isSocketAttachment(attachment) ? attachment.playerId : null;
}

function isSocketAttachment(value: unknown): value is SocketAttachment {
  return (
    typeof value === "object" &&
    value !== null &&
    "playerId" in value &&
    (value.playerId === null || typeof value.playerId === "string")
  );
}

function send(socket: WebSocket, message: ServerMessage): void {
  try {
    socket.send(JSON.stringify(message));
  } catch {
    // The socket closed between the check and the send. Its close handler runs.
  }
}

function fail(code: ProtocolError["code"], message: string): Result<never> {
  return { ok: false, error: { code, message } };
}

export class RoomObject extends DurableObject<Env> {
  /** A cache of what is in storage. Rebuilt after every wake-up. */
  private room: RoomState | null | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Answer heartbeats without waking the object.
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(PING, PONG),
    );
  }

  /* ------------------------------------------------------------ storage */

  private async load(): Promise<RoomState | null> {
    if (this.room === undefined) {
      this.room = (await this.ctx.storage.get<RoomState>(ROOM_KEY)) ?? null;
    }

    return this.room;
  }

  private async save(state: RoomState): Promise<void> {
    this.room = state;
    await this.ctx.storage.put(ROOM_KEY, state);
  }

  /* --------------------------------------------------- called by the Worker */

  /**
   * Claim this object for a new room. Returns null if the code is taken, so
   * the Worker can try another code.
   */
  async create(code: RoomCode, hostName: string): Promise<SeatGrant | null> {
    if (await this.load()) {
      return null;
    }

    const seated = createRoom(code, hostName, deps);

    await this.save(seated.state);
    await this.scheduleExpiryCheck(seated.state);

    return { code, token: seated.token };
  }

  /** Every request that reaches the object is a WebSocket upgrade. */
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null } satisfies SocketAttachment);

    if (!(await this.load())) {
      // A browser cannot read a failed handshake, so accept and then say why.
      this.closeSocket(server, "not_found");
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  /* ------------------------------------------------------ socket events */

  override async webSocketMessage(
    socket: WebSocket,
    raw: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof raw !== "string" || raw.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch {
      return;
    }

    const message = clientMessageSchema.safeParse(json);

    if (!message.success) {
      return;
    }

    const { id, event, payload } = message.data;

    const result = await this.handle(socket, event, payload);

    send(socket, { type: "ack", id, result });
  }

  override async webSocketClose(socket: WebSocket): Promise<void> {
    await this.socketGone(socket);
  }

  override async webSocketError(socket: WebSocket): Promise<void> {
    await this.socketGone(socket);
  }

  /** Runs when the room may have expired (see nextExpiryCheck). */
  override async alarm(): Promise<void> {
    const state = await this.load();

    if (!state) {
      return;
    }

    if (nextExpiryCheck(state, deps.now()) === "expired") {
      for (const socket of this.ctx.getWebSockets()) {
        this.closeSocket(socket, "expired");
      }

      this.room = null;
      await this.ctx.storage.deleteAll();

      return;
    }

    await this.scheduleExpiryCheck(state);
  }

  /* ----------------------------------------------------------- requests */

  private async handle(
    socket: WebSocket,
    event: string,
    payload: unknown,
  ): Promise<Result<unknown>> {
    try {
      switch (event) {
        case "room:join":
          return await this.run(joinRoomSchema, payload, (input) =>
            this.join(socket, input.name),
          );
        case "room:resume":
          return await this.run(resumeSchema, payload, (input) =>
            this.resume(socket, input.token),
          );
        case "lobby:ready":
          return await this.run(readySchema, payload, (input) =>
            this.ready(socket, input.ready),
          );
        case "lobby:kick":
          return await this.run(kickSchema, payload, (input) =>
            this.kick(socket, input.playerId),
          );
        case "room:leave":
          return await this.run(emptySchema, payload, () => this.leave(socket));
        default:
          return fail("NOT_ALLOWED", "That is not available yet.");
      }
    } catch (error) {
      if (error instanceof RoomError) {
        return fail(error.code, error.message);
      }

      console.error("[room] request failed", event, error);

      return fail("NOT_ALLOWED", "Something went wrong.");
    }
  }

  private async run<S extends z.ZodType, T>(
    schema: S,
    payload: unknown,
    handler: (input: z.output<S>) => Promise<T>,
  ): Promise<Result<T>> {
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      return fail("INVALID_PAYLOAD", "That request was not valid.");
    }

    return { ok: true, data: await handler(parsed.data) };
  }

  private async requireRoom(): Promise<RoomState> {
    const state = await this.load();

    if (!state) {
      throw new RoomError("ROOM_NOT_FOUND", "That room has ended.");
    }

    return state;
  }

  private async join(socket: WebSocket, name: string): Promise<SeatGrant> {
    const seated = joinRoom(await this.requireRoom(), name, deps);

    return this.seat(socket, seated);
  }

  private async resume(socket: WebSocket, token: string): Promise<SeatGrant> {
    const state = await this.requireRoom();
    const player = findSeat(state, token);

    return this.seat(socket, { state, player, token });
  }

  private async ready(socket: WebSocket, ready: boolean): Promise<null> {
    const playerId = seatOf(socket);

    if (!playerId) {
      throw new RoomError("NOT_IN_ROOM", "Join the room first.");
    }

    const loaded = await this.requireRoom();
    const state = setReady(loaded, playerId, ready);

    if (state !== loaded) {
      await this.save(state);
      this.publish(state);
    }

    return null;
  }

  /** Bind the socket to a seat, save, and tell everyone. */
  private async seat(socket: WebSocket, seated: Seated): Promise<SeatGrant> {
    socket.serializeAttachment({
      playerId: seated.player.id,
    } satisfies SocketAttachment);
    const state = withPresence(seated.state, true, deps.now());

    await this.save(state);
    this.publish(state);

    return { code: state.code, token: seated.token };
  }

  private async kick(socket: WebSocket, targetId: PlayerId): Promise<null> {
    const state = kickSeat(
      await this.requireRoom(),
      this.requireSeated(socket),
      targetId,
    );

    await this.removeSeat(state, targetId, "kicked");

    return null;
  }

  /**
   * The leaver's own sockets are closed here, so the ack for this request
   * usually never arrives. The browser acts on `closed: left` instead.
   */
  private async leave(socket: WebSocket): Promise<null> {
    const playerId = this.requireSeated(socket);
    const state = leaveRoom(
      await this.requireRoom(),
      playerId,
      this.connectedIds(),
    );

    if (state === null) {
      await this.end(playerId);

      return null;
    }

    await this.removeSeat(state, playerId, "left");

    return null;
  }

  /** Save a room without `playerId`, close that seat's sockets, tell the rest. */
  private async removeSeat(
    removed: RoomState,
    playerId: PlayerId,
    reason: RoomClosedReason,
  ): Promise<void> {
    for (const socket of this.socketsOf(playerId)) {
      // Unbind first, so presence and publish no longer count this socket.
      socket.serializeAttachment({ playerId: null } satisfies SocketAttachment);
      this.closeSocket(socket, reason);
    }

    const state = withPresence(
      removed,
      this.connectedIds().size > 0,
      deps.now(),
    );

    await this.save(state);
    await this.scheduleExpiryCheck(state);
    this.publish(state);
  }

  /** The last seat left: the room ends now, like an expired room. */
  private async end(lastId: PlayerId): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      const playerId = seatOf(socket);

      socket.serializeAttachment({ playerId: null } satisfies SocketAttachment);
      // Sockets still on the join form had no seat: to them the room has
      // simply ended, which is what "not_found" tells the browser.
      this.closeSocket(socket, playerId === lastId ? "left" : "not_found");
    }

    this.room = null;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  /* ------------------------------------------------------------ helpers */

  /** The seat this socket holds, or NOT_IN_ROOM. */
  private requireSeated(socket: WebSocket): PlayerId {
    const playerId = seatOf(socket);

    if (!playerId) {
      throw new RoomError("NOT_IN_ROOM", "Join the room first.");
    }

    return playerId;
  }

  private socketsOf(playerId: PlayerId): Array<WebSocket> {
    return this.ctx
      .getWebSockets()
      .filter((socket) => seatOf(socket) === playerId);
  }

  /** Ids of the players who have at least one open socket. */
  private connectedIds(except?: WebSocket): Set<PlayerId> {
    const ids = new Set<PlayerId>();

    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) {
        continue;
      }

      const playerId = seatOf(socket);

      if (playerId) {
        ids.add(playerId);
      }
    }

    return ids;
  }

  /** Send every seated socket its own player's view. Never a shared message. */
  private publish(state: RoomState, except?: WebSocket): void {
    const connected = this.connectedIds(except);

    for (const socket of this.ctx.getWebSockets()) {
      if (socket === except) {
        continue;
      }

      const playerId = seatOf(socket);

      if (!playerId) {
        continue;
      }

      send(socket, {
        type: "state",
        view: projectView(state, playerId, connected),
      });
    }
  }

  private async socketGone(socket: WebSocket): Promise<void> {
    try {
      socket.close();
    } catch {
      // Already closed.
    }

    if (!seatOf(socket)) {
      return;
    }

    const loaded = await this.load();

    if (!loaded) {
      return;
    }

    const connected = this.connectedIds(socket);
    const state = withPresence(loaded, connected.size > 0, deps.now());

    if (state !== loaded) {
      await this.save(state);
      await this.scheduleExpiryCheck(state);
    }

    this.publish(state, socket);
  }

  private closeSocket(socket: WebSocket, reason: RoomClosedReason): void {
    send(socket, { type: "closed", reason });

    try {
      socket.close(CLOSE_ROOM_GONE, reason);
    } catch {
      // Already closed.
    }
  }

  private async scheduleExpiryCheck(state: RoomState): Promise<void> {
    const at = nextExpiryCheck(state, deps.now());

    await this.ctx.storage.setAlarm(at === "expired" ? deps.now() : at);
  }
}
