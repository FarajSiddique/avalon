/**
 * The Socket.IO contract. Both the server and the browser import this file,
 * so event names and payloads cannot drift apart.
 *
 * Rules:
 * - Every client request has an acknowledgement that returns a `Result`.
 * - The server pushes exactly one kind of state message: `room:state`, a full
 *   `RoomView` built for the receiving player. There are no partial updates.
 */

import { z } from "zod";
import {
  NAME_MAX_LENGTH,
  NAME_PATTERN,
  ROOM_CODE_PATTERN,
  normalizeName,
  normalizeRoomCode,
} from "./constants";
import { OPTIONAL_ROLES } from "./roles";
import type { RoomCode, RoomView } from "./views";

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
  | "RATE_LIMITED";

export interface ProtocolError {
  code: ErrorCode;
  message: string;
}

export type Result<T> =
  { ok: true; data: T } | { ok: false; error: ProtocolError };

export type Ack<T> = (result: Result<T>) => void;

/** Returned by create, join and resume. The token is this player's seat key. */
export interface SeatGrant {
  code: RoomCode;
  token: string;
}

const nameSchema = z
  .string()
  .transform(normalizeName)
  .pipe(z.string().min(1).max(NAME_MAX_LENGTH).regex(NAME_PATTERN));

const roomCodeSchema = z
  .string()
  .transform(normalizeRoomCode)
  .pipe(z.string().regex(ROOM_CODE_PATTERN));

const playerIdSchema = z.string().min(1).max(64);

export const createRoomSchema = z.object({ name: nameSchema });
export const joinRoomSchema = z.object({
  code: roomCodeSchema,
  name: nameSchema,
});
export const resumeSchema = z.object({ token: z.string().min(1).max(200) });

export const settingsSchema = z.object({
  optionalRoles: z
    .array(z.enum(OPTIONAL_ROLES))
    .max(OPTIONAL_ROLES.length)
    .refine((roles) => new Set(roles).size === roles.length),
  ladyOfTheLake: z.boolean(),
});

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("confirm_role") }),
  z.object({
    type: z.literal("draft_team"),
    playerIds: z.array(playerIdSchema).max(5),
  }),
  z.object({
    type: z.literal("propose_team"),
    playerIds: z.array(playerIdSchema).min(2).max(5),
  }),
  z.object({ type: z.literal("vote"), vote: z.enum(["approve", "reject"]) }),
  z.object({
    type: z.literal("play_card"),
    card: z.enum(["success", "fail"]),
  }),
  z.object({ type: z.literal("lady_examine"), targetId: playerIdSchema }),
  z.object({ type: z.literal("assassinate"), targetId: playerIdSchema }),
]);

export type CreateRoomInput = z.input<typeof createRoomSchema>;
export type JoinRoomInput = z.input<typeof joinRoomSchema>;
export type ResumeInput = z.input<typeof resumeSchema>;
export type SettingsInput = z.input<typeof settingsSchema>;
export type GameAction = z.infer<typeof gameActionSchema>;

export type RoomClosedReason = "expired" | "kicked" | "left";

/**
 * Events marked "next run" are part of the contract but have no server
 * handler yet. See the phased plan in docs/architecture.md.
 */
export interface ClientToServerEvents {
  "room:create": (input: CreateRoomInput, ack: Ack<SeatGrant>) => void;
  "room:join": (input: JoinRoomInput, ack: Ack<SeatGrant>) => void;
  "room:resume": (input: ResumeInput, ack: Ack<SeatGrant>) => void;
  /** Next run. */
  "room:leave": (ack: Ack<null>) => void;
  /** Next run. */
  "lobby:ready": (input: { ready: boolean }, ack: Ack<null>) => void;
  /** Next run. Host only. */
  "lobby:settings": (input: SettingsInput, ack: Ack<null>) => void;
  /** Next run. Host only. */
  "lobby:kick": (input: { playerId: string }, ack: Ack<null>) => void;
  /** Next run. Host only. */
  "lobby:start": (ack: Ack<null>) => void;
  /** Next run. Every in-game move goes through this one event. */
  "game:action": (action: GameAction, ack: Ack<null>) => void;
}

export interface ServerToClientEvents {
  "room:state": (view: RoomView) => void;
  "room:closed": (payload: { reason: RoomClosedReason }) => void;
}

export const SOCKET_PATH = "/api/socket";
