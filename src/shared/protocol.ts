/**
 * The contract between the browser and a room. Both sides import this file,
 * so request names and payloads cannot drift apart.
 *
 * Transport: one WebSocket per tab to `/api/socket/CODE`, which is that
 * room's Durable Object. Messages are JSON.
 *
 * Rules:
 * - Every client request carries an id and is answered by one `ack` with a
 *   `Result`.
 * - The room pushes exactly one kind of state message: `state`, a full
 *   `RoomView` built for the receiving player. There are no partial updates.
 * - Creating a room is the one thing that is not a socket request, because
 *   the room does not exist yet. It is a server function (src/functions).
 *
 * This file has no runtime dependencies, so the browser bundle stays small.
 * The matching validators live in schemas.ts and run on the server.
 */

import type { OptionalRole } from "./roles";
import type { PlayerId, QuestCard, RoomCode, RoomView, Vote } from "./views";

export type ErrorCode =
  | "INVALID_PAYLOAD"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_IN_PROGRESS"
  | "NAME_TAKEN"
  | "SESSION_INVALID"
  | "NOT_IN_ROOM"
  | "NOT_HOST"
  | "NOT_ALLOWED"
  | "GAME_NOT_STARTABLE"
  | "RATE_LIMITED"
  /** Made up by the client when the socket is down or the room never answers. */
  | "OFFLINE";

export interface ProtocolError {
  code: ErrorCode;
  message: string;
}

export type Result<T> =
  { ok: true; data: T } | { ok: false; error: ProtocolError };

/** Returned by create, join and resume. The token is this player's seat key. */
export interface SeatGrant {
  code: RoomCode;
  token: string;
}

export interface CreateRoomInput {
  name: string;
}

export interface JoinRoomInput {
  name: string;
}

export interface ResumeInput {
  token: string;
}

export interface SettingsInput {
  optionalRoles: Array<OptionalRole>;
  ladyOfTheLake: boolean;
}

/** Every move a player can make during a game. */
export type GameAction =
  | { type: "confirm_role" }
  | { type: "draft_team"; playerIds: Array<PlayerId> }
  | { type: "propose_team"; playerIds: Array<PlayerId> }
  | { type: "vote"; vote: Vote }
  | { type: "play_card"; card: QuestCard }
  | { type: "lady_examine"; targetId: PlayerId }
  | { type: "assassinate"; targetId: PlayerId };

/**
 * Every request a socket can send to its room, with its payload and the data
 * in a successful answer. Requests marked "next run" are part of the contract
 * but the room does not handle them yet (see docs/architecture.md).
 */
export interface RoomRequests {
  "room:join": { input: JoinRoomInput; output: SeatGrant };
  "room:resume": { input: ResumeInput; output: SeatGrant };
  /** Next run. Watch the table without a seat (the shared screen). */
  "room:watch": { input: null; output: null };
  /** Next run. */
  "room:leave": { input: null; output: null };
  /** Not the host: pressing Start is the host's ready. */
  "lobby:ready": { input: { ready: boolean }; output: null };
  /** Host only. Any mix is saved; Start is blocked if it does not fit the seats. */
  "lobby:settings": { input: SettingsInput; output: null };
  /** Next run. Host only. */
  "lobby:kick": { input: { playerId: string }; output: null };
  /** Next run. Host only. */
  "lobby:start": { input: null; output: null };
  /** Next run. Every in-game move goes through this one request. */
  "game:action": { input: GameAction; output: null };
  /** Next run. Host only. End the game and return everyone to the lobby. */
  "room:reset": { input: null; output: null };
}

export type RoomEvent = keyof RoomRequests;

export type RoomClosedReason = "not_found" | "expired" | "kicked" | "left";

/** Browser to room. */
export interface ClientMessage {
  id: number;
  event: RoomEvent;
  payload: unknown;
}

/** Room to browser. */
export type ServerMessage =
  | { type: "ack"; id: number; result: Result<unknown> }
  | { type: "state"; view: RoomView }
  | { type: "closed"; reason: RoomClosedReason };

/** The WebSocket for room CODE is at `${SOCKET_PATH}/CODE`. */
export const SOCKET_PATH = "/api/socket";

/** Heartbeat. The room answers without waking up. */
export const PING = "ping";
export const PONG = "pong";

/** Largest client message the room will read, in characters. */
export const MAX_MESSAGE_LENGTH = 4096;

/** WebSocket close code used when the room does not exist or has ended. */
export const CLOSE_ROOM_GONE = 4004;
