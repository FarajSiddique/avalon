/**
 * Room state and the rules for changing it. Pure: no storage, no sockets, no
 * clock. The Durable Object in room-object.ts loads a `RoomState`, calls
 * these functions and saves the result.
 *
 * `RoomState` is plain JSON so it can be stored as is.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import {
  EMPTY_ROOM_TTL_MS,
  MAX_PLAYERS,
  ROOM_MAX_AGE_MS,
} from "@/shared/constants";
import type { ErrorCode } from "@/shared/protocol";
import type { GameSettings, PlayerId, RoomCode } from "@/shared/views";

export interface PlayerRecord {
  id: PlayerId;
  name: string;
  /** SHA-256 of the seat secret, in hex. The secret itself is never stored. */
  tokenHash: string;
  joinedAt: number;
  ready: boolean;
}

export interface RoomState {
  code: RoomCode;
  hostId: PlayerId;
  /** Seat order. New players are appended. */
  players: Array<PlayerRecord>;
  settings: GameSettings;
  createdAt: number;
  /** When the last seated socket left, or null while anyone is connected. */
  emptySince: number | null;
  /** The game engine state. Added in the next run; null means "in the lobby". */
  game: null;
}

export class RoomError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

/** Everything random or time-based is passed in, so tests can fix it. */
export interface RoomDeps {
  now: () => number;
  /** A new unique player id. */
  newId: () => string;
  /** A new unguessable seat secret. */
  newSecret: () => string;
}

export interface Seated {
  state: RoomState;
  player: PlayerRecord;
  /** The seat token to hand to the player: `CODE.secret`. */
  token: string;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** A new seat, and the token that claims it (sent to that player only). */
interface NewPlayer {
  player: PlayerRecord;
  token: string;
}

function newPlayer(code: RoomCode, name: string, deps: RoomDeps): NewPlayer {
  const secret = deps.newSecret();

  return {
    player: {
      id: deps.newId(),
      name,
      tokenHash: hashSecret(secret),
      joinedAt: deps.now(),
      ready: false,
    },
    token: `${code}.${secret}`,
  };
}

export function createRoom(
  code: RoomCode,
  hostName: string,
  deps: RoomDeps,
): Seated {
  const { player, token } = newPlayer(code, hostName, deps);
  const now = deps.now();

  return {
    state: {
      code,
      hostId: player.id,
      players: [player],
      settings: { optionalRoles: [], ladyOfTheLake: false },
      createdAt: now,
      emptySince: now,
      game: null,
    },
    player,
    token,
  };
}

export function joinRoom(
  state: RoomState,
  name: string,
  deps: RoomDeps,
): Seated {
  if (state.game !== null) {
    throw new RoomError("ROOM_IN_PROGRESS", "That game has already started.");
  }

  if (state.players.length >= MAX_PLAYERS) {
    throw new RoomError("ROOM_FULL", "That room is full.");
  }

  const wanted = name.toLocaleLowerCase();

  if (state.players.some((p) => p.name.toLocaleLowerCase() === wanted)) {
    throw new RoomError("NAME_TAKEN", "Someone in the room has that name.");
  }

  const { player, token } = newPlayer(state.code, name, deps);

  return {
    state: { ...state, players: [...state.players, player] },
    player,
    token,
  };
}

/**
 * A seat says it is, or is no longer, happy to start. Only the seat itself
 * calls this. The host has no ready (pressing Start is the host's ready), so
 * the host's own record stays false. Nothing else changes a seat's ready:
 * joins, leaves, settings and being away all keep it.
 */
export function setReady(
  state: RoomState,
  playerId: PlayerId,
  ready: boolean,
): RoomState {
  if (state.game !== null) {
    throw new RoomError("ROOM_IN_PROGRESS", "The game has already started.");
  }

  if (playerId === state.hostId) {
    throw new RoomError("NOT_ALLOWED", "The host starts the game instead.");
  }

  const seat = state.players.find((p) => p.id === playerId);

  if (!seat) {
    throw new RoomError("NOT_IN_ROOM", "You are not in this room.");
  }

  if (seat.ready === ready) {
    return state;
  }

  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, ready } : p,
    ),
  };
}

/**
 * The host replaces the settings. Any mix the schema allows is saved: whether
 * it can start depends on the seats at the time (see `settingsBlockers`).
 * Nobody's ready changes.
 */
export function setSettings(
  state: RoomState,
  playerId: PlayerId,
  settings: GameSettings,
): RoomState {
  if (state.game !== null) {
    throw new RoomError("ROOM_IN_PROGRESS", "The game has already started.");
  }

  if (playerId !== state.hostId) {
    throw new RoomError("NOT_HOST", "Only the host changes the settings.");
  }

  const same =
    state.settings.ladyOfTheLake === settings.ladyOfTheLake &&
    state.settings.optionalRoles.length === settings.optionalRoles.length &&
    settings.optionalRoles.every((role) =>
      state.settings.optionalRoles.includes(role),
    );

  if (same) {
    return state;
  }

  return {
    ...state,
    settings: {
      optionalRoles: [...settings.optionalRoles],
      ladyOfTheLake: settings.ladyOfTheLake,
    },
  };
}

/** The seat a token belongs to. Tokens look like `CODE.secret`. */
export function findSeat(state: RoomState, token: string): PlayerRecord {
  const dot = token.indexOf(".");

  if (dot !== -1 && token.slice(0, dot) === state.code) {
    const hash = Buffer.from(hashSecret(token.slice(dot + 1)), "hex");
    const player = state.players.find((p) =>
      timingSafeEqual(Buffer.from(p.tokenHash, "hex"), hash),
    );

    if (player) {
      return player;
    }
  }

  throw new RoomError(
    "SESSION_INVALID",
    "That seat no longer exists. Join the room again.",
  );
}

/** Record whether anyone is connected. Call after every connect and disconnect. */
export function withPresence(
  state: RoomState,
  anyoneConnected: boolean,
  now: number,
): RoomState {
  if (anyoneConnected) {
    return state.emptySince === null ? state : { ...state, emptySince: null };
  }

  return state.emptySince !== null ? state : { ...state, emptySince: now };
}

/**
 * When to look at this room again: the moment it would expire if nothing
 * changes. Returns "expired" when that moment has passed.
 */
export function nextExpiryCheck(
  state: RoomState,
  now: number,
): number | "expired" {
  const tooOldAt = state.createdAt + ROOM_MAX_AGE_MS;
  const idleAt =
    state.emptySince === null ? Infinity : state.emptySince + EMPTY_ROOM_TTL_MS;
  const at = Math.min(tooOldAt, idleAt);

  return now >= at ? "expired" : at;
}
