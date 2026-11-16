/**
 * In-memory room store. This is the only place room state lives.
 *
 * It is imported by the custom server only (see server.ts). Next.js route
 * handlers and components are bundled separately and would get their own copy
 * of this module, so they must never import it.
 */

import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  EMPTY_ROOM_TTL_MS,
  MAX_PLAYERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_MAX_AGE_MS,
} from "@/shared/constants";
import type { ErrorCode } from "@/shared/protocol";
import type { GameSettings, PlayerId, RoomCode } from "@/shared/views";

export interface PlayerRecord {
  id: PlayerId;
  name: string;
  /** SHA-256 of the seat secret. The secret itself is never stored. */
  tokenHash: Buffer;
  joinedAt: number;
  ready: boolean;
  /** Open sockets for this seat. The player is connected while this is not empty. */
  socketIds: Set<string>;
}

export interface RoomRecord {
  code: RoomCode;
  hostId: PlayerId;
  /** Seat order. New players are appended. */
  players: PlayerRecord[];
  settings: GameSettings;
  createdAt: number;
  /** When the last socket left, or null while anyone is connected. */
  emptySince: number | null;
  /** The game engine state. Added in the next run; null means "in the lobby". */
  game: null;
}

export interface Seat {
  room: RoomRecord;
  player: PlayerRecord;
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

export interface RoomStoreDeps {
  now: () => number;
  /** Uniform integer in [0, max). */
  randomInt: (max: number) => number;
}

const defaultDeps: RoomStoreDeps = {
  now: () => Date.now(),
  randomInt: (max) => randomInt(max),
};

function hashSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export class RoomStore {
  private readonly rooms = new Map<RoomCode, RoomRecord>();
  private readonly seatBySocket = new Map<string, Seat>();
  private readonly deps: RoomStoreDeps;

  constructor(deps: Partial<RoomStoreDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  get size(): number {
    return this.rooms.size;
  }

  get(code: RoomCode): RoomRecord | undefined {
    return this.rooms.get(code);
  }

  seatOf(socketId: string): Seat | undefined {
    return this.seatBySocket.get(socketId);
  }

  createRoom(hostName: string): Seat & { token: string } {
    const code = this.newCode();
    const { player, token } = this.newPlayer(code, hostName);
    const now = this.deps.now();
    const room: RoomRecord = {
      code,
      hostId: player.id,
      players: [player],
      settings: { optionalRoles: [], ladyOfTheLake: false },
      createdAt: now,
      emptySince: now,
      game: null,
    };
    this.rooms.set(code, room);
    return { room, player, token };
  }

  joinRoom(code: RoomCode, name: string): Seat & { token: string } {
    const room = this.rooms.get(code);
    if (!room) {
      throw new RoomError("ROOM_NOT_FOUND", `No room with code ${code}.`);
    }
    if (room.game !== null) {
      throw new RoomError("ROOM_IN_PROGRESS", "That game has already started.");
    }
    if (room.players.length >= MAX_PLAYERS) {
      throw new RoomError("ROOM_FULL", "That room is full.");
    }
    const wanted = name.toLocaleLowerCase();
    if (room.players.some((p) => p.name.toLocaleLowerCase() === wanted)) {
      throw new RoomError("NAME_TAKEN", "Someone in the room has that name.");
    }
    const { player, token } = this.newPlayer(code, name);
    room.players.push(player);
    return { room, player, token };
  }

  /** Find the seat a token belongs to. Tokens look like `CODE.secret`. */
  resume(token: string): Seat {
    const dot = token.indexOf(".");
    const code = dot === -1 ? "" : token.slice(0, dot);
    const room = this.rooms.get(code);
    if (room) {
      const hash = hashSecret(token.slice(dot + 1));
      const player = room.players.find((p) =>
        timingSafeEqual(p.tokenHash, hash),
      );
      if (player) return { room, player };
    }
    throw new RoomError(
      "SESSION_INVALID",
      "That seat no longer exists. Join the room again.",
    );
  }

  /** Bind a socket to a seat. A socket holds at most one seat. */
  attachSocket(seat: Seat, socketId: string): Seat | null {
    const previous = this.seatBySocket.get(socketId);
    const moved =
      previous && previous.player !== seat.player
        ? this.detachSocket(socketId)
        : null;
    seat.player.socketIds.add(socketId);
    seat.room.emptySince = null;
    this.seatBySocket.set(socketId, seat);
    return moved;
  }

  /** Unbind a socket. Returns the seat it held, if any. The seat is kept. */
  detachSocket(socketId: string): Seat | null {
    const seat = this.seatBySocket.get(socketId);
    if (!seat) return null;
    this.seatBySocket.delete(socketId);
    seat.player.socketIds.delete(socketId);
    if (seat.room.players.every((p) => p.socketIds.size === 0)) {
      seat.room.emptySince = this.deps.now();
    }
    return seat;
  }

  /** Delete rooms that are empty for too long or too old. Returns their codes. */
  sweep(): RoomCode[] {
    const now = this.deps.now();
    const removed: RoomCode[] = [];
    for (const room of this.rooms.values()) {
      const idle =
        room.emptySince !== null && now - room.emptySince >= EMPTY_ROOM_TTL_MS;
      const tooOld = now - room.createdAt >= ROOM_MAX_AGE_MS;
      if (idle || tooOld) {
        for (const player of room.players) {
          for (const socketId of player.socketIds) {
            this.seatBySocket.delete(socketId);
          }
        }
        this.rooms.delete(room.code);
        removed.push(room.code);
      }
    }
    return removed;
  }

  private newCode(): RoomCode {
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      let code = "";
      for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
        code += ROOM_CODE_ALPHABET.charAt(
          this.deps.randomInt(ROOM_CODE_ALPHABET.length),
        );
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new Error("Could not find a free room code.");
  }

  private newPlayer(
    code: RoomCode,
    name: string,
  ): { player: PlayerRecord; token: string } {
    const secret = randomBytes(32).toString("base64url");
    const player: PlayerRecord = {
      id: randomUUID(),
      name,
      tokenHash: hashSecret(secret),
      joinedAt: this.deps.now(),
      ready: false,
      socketIds: new Set(),
    };
    return { player, token: `${code}.${secret}` };
  }
}
