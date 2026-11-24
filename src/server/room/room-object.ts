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
  settingsSchema,
} from "@/shared/schemas";
import type { GameSettings, PlayerId, RoomCode } from "@/shared/views";
import { fullBudget, spend, type Budget } from "./budget";
import { projectView } from "./project-view";
import {
  RoomError,
  createRoom,
  findSeat,
  joinRoom,
  kickSeat,
  leaveRoom,
  nextDue,
  setReady,
  setSettings,
  upgradeRoom,
  withPresence,
  type RoomDeps,
  type RoomState,
  type Seated,
} from "./state";

const ROOM_KEY = "room";

/**
 * What each socket remembers across hibernation: its seat and its message
 * budget. Read and written only through `readAttachment` and
 * `writeAttachment`, so binding a seat never resets the budget.
 */
interface SocketAttachment extends Budget {
  playerId: PlayerId | null;
}

const RATE_LIMITED_MESSAGE = "Too fast. Wait a moment and try again.";

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

function isBudget(value: unknown): value is Budget {
  return (
    typeof value === "object" &&
    value !== null &&
    "tokens" in value &&
    typeof value.tokens === "number" &&
    "refilledAt" in value &&
    typeof value.refilledAt === "number" &&
    "limited" in value &&
    typeof value.limited === "boolean"
  );
}

/**
 * A socket's attachment. One written before the budget existed (only
 * `{ playerId }`, from a socket that slept through a deploy) reads as a full
 * budget.
 */
function readAttachment(socket: WebSocket, now: number): SocketAttachment {
  const value: unknown = socket.deserializeAttachment();

  if (typeof value !== "object" || value === null) {
    return { playerId: null, ...fullBudget(now) };
  }

  const playerId =
    "playerId" in value && typeof value.playerId === "string"
      ? value.playerId
      : null;
  const budget: Budget = isBudget(value)
    ? {
        tokens: value.tokens,
        refilledAt: value.refilledAt,
        limited: value.limited,
      }
    : fullBudget(now);

  return { playerId, ...budget };
}

function writeAttachment(
  socket: WebSocket,
  attachment: SocketAttachment,
): void {
  socket.serializeAttachment(attachment);
}

function seatOf(socket: WebSocket): PlayerId | null {
  return readAttachment(socket, deps.now()).playerId;
}

/** Bind the socket to a seat (or unbind it with null), keeping its budget. */
function bindSeat(socket: WebSocket, playerId: PlayerId | null): void {
  writeAttachment(socket, { ...readAttachment(socket, deps.now()), playerId });
}

/** The envelope of a client message, or null if it is not one. */
function parseEnvelope(
  raw: string | ArrayBuffer,
): { id: number; event: string; payload: unknown } | null {
  if (typeof raw !== "string" || raw.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }

  const message = clientMessageSchema.safeParse(json);

  return message.success ? message.data : null;
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
      const stored = await this.ctx.storage.get<RoomState>(ROOM_KEY);

      this.room = stored ? upgradeRoom(stored) : null;
    }

    return this.room;
  }

  private async save(state: RoomState): Promise<void> {
    this.room = state;
    await this.ctx.storage.put(ROOM_KEY, state);
  }

  /** Save, re-arm the alarm from the new state, and tell every seat. */
  private async commit(state: RoomState, except?: WebSocket): Promise<void> {
    await this.save(state);
    await this.scheduleAlarm(state);
    this.publish(state, except);
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
    await this.scheduleAlarm(seated.state);

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
    writeAttachment(server, { playerId: null, ...fullBudget(deps.now()) });

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
    // Every message costs one token before anything else, so oversized,
    // unreadable and invalid messages are capped too.
    const now = deps.now();
    const attachment = readAttachment(socket, now);
    const spent = spend(attachment, now);

    writeAttachment(socket, { ...attachment, ...spent.budget });

    const message = parseEnvelope(raw);

    if (!spent.allowed) {
      if (spent.firstRefusal) {
        const code = (await this.load())?.code ?? "(no room)";

        console.warn(
          "[room] message budget exceeded",
          code,
          attachment.playerId ?? "(no seat)",
          message?.event ?? "(unreadable)",
        );
      }

      // Refused without doing anything else. The socket stays open: closing
      // it would only hand the phone a fresh budget when it reconnects.
      if (message) {
        send(socket, {
          type: "ack",
          id: message.id,
          result: fail("RATE_LIMITED", RATE_LIMITED_MESSAGE),
        });
      }

      return;
    }

    if (!message) {
      return;
    }

    const result = await this.handle(socket, message.event, message.payload);

    send(socket, { type: "ack", id: message.id, result });
  }

  override async webSocketClose(socket: WebSocket): Promise<void> {
    await this.socketGone(socket);
  }

  override async webSocketError(socket: WebSocket): Promise<void> {
    await this.socketGone(socket);
  }

  /** Runs when the room may have expired or a hand-over is due (see nextDue). */
  override async alarm(): Promise<void> {
    const state = await this.load();

    if (!state) {
      return;
    }

    const now = deps.now();

    if (nextDue(state, now) === "expired") {
      for (const socket of this.ctx.getWebSockets()) {
        this.closeSocket(socket, "expired");
      }

      this.room = null;
      await this.ctx.storage.deleteAll();

      return;
    }

    const next = withPresence(state, this.connectedIds(), now);

    if (next === state) {
      await this.scheduleAlarm(state);
    } else {
      await this.commit(next);
    }
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
        case "lobby:settings":
          return await this.run(settingsSchema, payload, (input) =>
            this.settings(socket, input),
          );
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
    const playerId = this.requireSeated(socket);
    const loaded = await this.requireRoom();
    const state = setReady(loaded, playerId, ready);

    if (state !== loaded) {
      await this.commit(state);
    }

    return null;
  }

  private async settings(
    socket: WebSocket,
    settings: GameSettings,
  ): Promise<null> {
    const playerId = seatOf(socket);

    if (!playerId) {
      throw new RoomError("NOT_IN_ROOM", "Join the room first.");
    }

    const loaded = await this.requireRoom();
    const state = setSettings(loaded, playerId, settings);

    if (state !== loaded) {
      await this.commit(state);
    }

    return null;
  }

  /** Bind the socket to a seat, save, and tell everyone. */
  private async seat(socket: WebSocket, seated: Seated): Promise<SeatGrant> {
    bindSeat(socket, seated.player.id);
    // Presence may also hand the host role over here: a seat connecting
    // after the deadline passed with nobody else connected takes it at once.
    const state = withPresence(seated.state, this.connectedIds(), deps.now());

    await this.commit(state);

    return { code: state.code, token: seated.token };
  }

  private async kick(socket: WebSocket, targetId: PlayerId): Promise<null> {
    // Seat first: an unseated socket fails without a storage read.
    const hostId = this.requireSeated(socket);
    const state = kickSeat(await this.requireRoom(), hostId, targetId);

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
      bindSeat(socket, null);
      this.closeSocket(socket, reason);
    }

    const state = withPresence(removed, this.connectedIds(), deps.now());

    await this.commit(state);
  }

  /** The last seat left: the room ends now, like an expired room. */
  private async end(lastId: PlayerId): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      const playerId = seatOf(socket);

      bindSeat(socket, null);
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

    const state = withPresence(loaded, this.connectedIds(socket), deps.now());

    if (state === loaded) {
      this.publish(state, socket);
    } else {
      await this.commit(state, socket);
    }
  }

  private closeSocket(socket: WebSocket, reason: RoomClosedReason): void {
    send(socket, { type: "closed", reason });

    try {
      socket.close(CLOSE_ROOM_GONE, reason);
    } catch {
      // Already closed.
    }
  }

  /** One alarm per object: set it for whatever is due next. */
  private async scheduleAlarm(state: RoomState): Promise<void> {
    const at = nextDue(state, deps.now());

    await this.ctx.storage.setAlarm(at === "expired" ? deps.now() : at);
  }
}
