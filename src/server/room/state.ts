/**
 * Room state and the rules for changing it. Pure: no storage, no sockets, no
 * clock. The Durable Object in room-object.ts loads a `RoomState`, calls
 * these functions and saves the result.
 *
 * `RoomState` is plain JSON so it can be stored as is.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { avatarFor, avatarKey, type Avatar } from "@/shared/avatar";
import {
  EMPTY_ROOM_TTL_MS,
  HOST_AWAY_MS,
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
  /** The seat's look. Public, so it reaches every player. */
  avatar: Avatar;
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
  /**
   * When the host's last open socket closed, or null while the host is
   * connected. Kept in storage so a pending hand-over survives a restart.
   */
  hostAwaySince: number | null;
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

/** A fresh object with exactly the five traits, never the caller's own. */
function copyAvatar(avatar: Avatar): Avatar {
  return {
    body: avatar.body,
    skin: avatar.skin,
    cloak: avatar.cloak,
    headwear: avatar.headwear,
    emblem: avatar.emblem,
  };
}

/**
 * A new seat, with the look it brought or, without one, a look from its id.
 */
function newPlayer(
  code: RoomCode,
  name: string,
  avatar: Avatar | undefined,
  deps: RoomDeps,
): NewPlayer {
  const secret = deps.newSecret();
  const id = deps.newId();

  return {
    player: {
      id,
      name,
      tokenHash: hashSecret(secret),
      joinedAt: deps.now(),
      ready: false,
      avatar: avatar ? copyAvatar(avatar) : avatarFor(id),
    },
    token: `${code}.${secret}`,
  };
}

export function createRoom(
  code: RoomCode,
  hostName: string,
  avatar: Avatar | undefined,
  deps: RoomDeps,
): Seated {
  const { player, token } = newPlayer(code, hostName, avatar, deps);
  const now = deps.now();

  return {
    state: {
      code,
      hostId: player.id,
      players: [player],
      settings: { optionalRoles: [], ladyOfTheLake: false },
      createdAt: now,
      emptySince: now,
      hostAwaySince: null,
      game: null,
    },
    player,
    token,
  };
}

export function joinRoom(
  state: RoomState,
  name: string,
  avatar: Avatar | undefined,
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

  const { player, token } = newPlayer(state.code, name, avatar, deps);

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
 * A seat changes its own look, in the lobby only. Anyone may, the host too.
 * Two seats may share a look. Nothing else changes, ready included. Returns
 * the same object when the look is the one already stored.
 */
export function setAvatar(
  state: RoomState,
  playerId: PlayerId,
  avatar: Avatar,
): RoomState {
  if (state.game !== null) {
    throw new RoomError("ROOM_IN_PROGRESS", "The game has already started.");
  }

  const seat = state.players.find((p) => p.id === playerId);

  if (!seat) {
    throw new RoomError("NOT_IN_ROOM", "You are not in this room.");
  }

  if (avatarKey(seat.avatar) === avatarKey(avatar)) {
    return state;
  }

  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, avatar: copyAvatar(avatar) } : p,
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

  // Compared as sets, so role order and any repeats never matter.
  const before = new Set(state.settings.optionalRoles);
  const after = new Set(settings.optionalRoles);
  const same =
    state.settings.ladyOfTheLake === settings.ladyOfTheLake &&
    before.size === after.size &&
    [...after].every((role) => before.has(role));

  if (same) {
    return state;
  }

  return {
    ...state,
    settings: {
      optionalRoles: [...after],
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

/**
 * Fills the fields added after a room was saved, so a room stored by an
 * older deploy loads as a current `RoomState`. Applied on every load. Only
 * added fields with a safe default belong here; a field that changes
 * meaning needs a version.
 */
export function upgradeRoom(stored: RoomState): RoomState {
  const saved: Partial<RoomState> = stored;
  let room = stored;

  // One check per added field, each on its own, so a room that already has
  // an earlier field still gets the later ones.
  if (saved.hostAwaySince === undefined) {
    room = { ...room, hostAwaySince: null };
  }

  const seats: Array<Partial<PlayerRecord>> = stored.players;

  if (seats.some((p) => p.avatar === undefined)) {
    room = {
      ...room,
      players: room.players.map((p) => {
        const seat: Partial<PlayerRecord> = p;

        return seat.avatar === undefined
          ? { ...p, avatar: avatarFor(p.id) }
          : p;
      }),
    };
  }

  return room;
}

/**
 * Record who is connected. Call after every connect, disconnect, kick, leave
 * and alarm. It keeps `emptySince` and `hostAwaySince` in step with the live
 * sockets, then passes the host role on if the host has been away for
 * `HOST_AWAY_MS` and another seat is connected. Returns the same object when
 * nothing changed.
 *
 * @param connected ids of the players with at least one open socket.
 */
export function withPresence(
  state: RoomState,
  connected: ReadonlySet<PlayerId>,
  now: number,
): RoomState {
  const emptySince = connected.size > 0 ? null : (state.emptySince ?? now);
  const hostAwaySince = connected.has(state.hostId)
    ? null
    : (state.hostAwaySince ?? now);
  const next =
    emptySince === state.emptySince && hostAwaySince === state.hostAwaySince
      ? state
      : { ...state, emptySince, hostAwaySince };

  if (hostAwaySince === null || now < hostAwaySince + HOST_AWAY_MS) {
    return next;
  }

  const to = pickConnectedHost(next.players, next.hostId, connected);

  return to === null ? next : handOver(next, to);
}

/**
 * When this room next needs looking at: the earlier of its expiry and a host
 * hand-over deadline. The deadline counts only while it is still ahead, so a
 * passed deadline with nobody to take over never re-fires the alarm. Returns
 * "expired" when the room's time is up.
 */
export function nextDue(state: RoomState, now: number): number | "expired" {
  const tooOldAt = state.createdAt + ROOM_MAX_AGE_MS;
  const idleAt =
    state.emptySince === null ? Infinity : state.emptySince + EMPTY_ROOM_TTL_MS;
  const expiresAt = Math.min(tooOldAt, idleAt);

  if (now >= expiresAt) {
    return "expired";
  }

  const handOverAt =
    state.hostAwaySince === null
      ? Infinity
      : state.hostAwaySince + HOST_AWAY_MS;

  return handOverAt > now ? Math.min(expiresAt, handOverAt) : expiresAt;
}

/**
 * Who becomes host when the host goes: the first connected seat after the
 * old host in seat order, wrapping round. If nobody else is connected, the
 * next seat in seat order, so a room always has a host while it has seats.
 * Null when the old host was the only seat. Throws NOT_IN_ROOM if `fromId`
 * has no seat.
 */
export function pickNextHost(
  players: ReadonlyArray<PlayerRecord>,
  fromId: PlayerId,
  connected: ReadonlySet<PlayerId>,
): PlayerId | null {
  const from = players.findIndex((p) => p.id === fromId);

  if (from === -1) {
    throw new RoomError("NOT_IN_ROOM", "That player is not in the room.");
  }

  // Everyone but the old host, in seat order starting after them.
  const others = [...players.slice(from + 1), ...players.slice(0, from)];

  return (others.find((p) => connected.has(p.id)) ?? others[0])?.id ?? null;
}

/**
 * Who takes over from a host who is away: the first connected seat after the
 * old host in seat order, wrapping round. Null when no other seat is
 * connected (the away host then keeps the role). Throws NOT_IN_ROOM if
 * `fromId` has no seat.
 */
export function pickConnectedHost(
  players: ReadonlyArray<PlayerRecord>,
  fromId: PlayerId,
  connected: ReadonlySet<PlayerId>,
): PlayerId | null {
  const next = pickNextHost(players, fromId, connected);

  return next !== null && connected.has(next) ? next : null;
}

/**
 * Pass the host role to `toId`. The old host becomes an ordinary seat that
 * is not ready, and the new host's stored ready is cleared too, so the
 * host's own record always reads "not ready" (pressing Start is the host's
 * ready).
 */
function handOver(state: RoomState, toId: PlayerId): RoomState {
  const fromId = state.hostId;

  return {
    ...state,
    hostId: toId,
    hostAwaySince: null,
    players: state.players.map((p) =>
      (p.id === fromId || p.id === toId) && p.ready
        ? { ...p, ready: false }
        : p,
    ),
  };
}

function requireLobby(state: RoomState): void {
  if (state.game !== null) {
    throw new RoomError("NOT_ALLOWED", "That is only possible in the lobby.");
  }
}

function requireSeat(state: RoomState, playerId: PlayerId): PlayerRecord {
  const player = state.players.find((p) => p.id === playerId);

  if (!player) {
    throw new RoomError("NOT_IN_ROOM", "That player is not in the room.");
  }

  return player;
}

/** The host removes another seat. Nothing about that seat is remembered. */
export function kickSeat(
  state: RoomState,
  byId: PlayerId,
  targetId: PlayerId,
): RoomState {
  requireLobby(state);
  requireSeat(state, byId);

  if (byId !== state.hostId) {
    throw new RoomError("NOT_HOST", "Only the host can remove players.");
  }

  if (targetId === byId) {
    throw new RoomError("NOT_ALLOWED", "The host cannot remove themselves.");
  }

  requireSeat(state, targetId);

  return {
    ...state,
    players: state.players.filter((p) => p.id !== targetId),
  };
}

/**
 * A seat gives itself up. A leaving host hands over at once (see
 * `pickNextHost`). Returns null when the last seat leaves: the room ends.
 *
 * @param connected ids of the players with at least one open socket.
 */
export function leaveRoom(
  state: RoomState,
  playerId: PlayerId,
  connected: ReadonlySet<PlayerId>,
): RoomState | null {
  requireLobby(state);
  requireSeat(state, playerId);

  if (playerId !== state.hostId) {
    return {
      ...state,
      players: state.players.filter((p) => p.id !== playerId),
    };
  }

  const hostId = pickNextHost(state.players, playerId, connected);

  if (hostId === null) {
    return null;
  }

  const handed = handOver(state, hostId);

  return {
    ...handed,
    players: handed.players.filter((p) => p.id !== playerId),
  };
}
