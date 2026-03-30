import { Injectable, ConflictException, OnModuleInit } from '@nestjs/common';
import { randomInt, randomUUID } from 'crypto';
import {
  Room,
  Player,
  PlayerSnapshot,
  RoomSnapshot,
  LobbyErrorCode,
  RoomPhase,
  GameSettings,
  OptionalCharacter,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from '@avalon/shared';

// Unambiguous character subsets — excludes O, 0, 1, I to prevent misreading
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_DIGITS = '23456789';
const CODE_CHARS = CODE_LETTERS + CODE_DIGITS;
const CODE_LENGTH = 6;
const MAX_RETRIES = 10;

export class LobbyException extends Error {
  constructor(
    public readonly code: LobbyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LobbyException';
  }
}

@Injectable()
export class RoomService implements OnModuleInit {
  // ⚠️ SINGLE-INSTANCE CONSTRAINT: all state is in process-local Maps.
  // Horizontal scaling (second Railway instance) requires migrating these Maps
  // to Redis and adding socket.io-redis-adapter for broadcast correctness.
  // The JWT design is already Redis-compatible; only these Maps need migration.
  private rooms: Map<string, Room> = new Map();

  /**
   * socketToRoom index allows O(1) lookup of which room a socket belongs to.
   * INVARIANT: must only be mutated inside addPlayer(), removePlayer(), and linkSocket().
   */
  private socketToRoom: Map<string, string> = new Map();

  // -------------------------------------------------------------------------
  // Room code generation
  // -------------------------------------------------------------------------

  private generateCode(): string {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      // Guarantee at least one letter and one digit by construction:
      // pick 1 letter + 1 digit, then 4 random chars, then shuffle.
      const chars: string[] = [
        CODE_LETTERS[randomInt(0, CODE_LETTERS.length)],
        CODE_DIGITS[randomInt(0, CODE_DIGITS.length)],
        ...Array.from({ length: CODE_LENGTH - 2 }, () => CODE_CHARS[randomInt(0, CODE_CHARS.length)]),
      ];
      // Fisher-Yates shuffle
      for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      const code = chars.join('');
      if (!this.rooms.has(code)) {
        return code;
      }
      attempt++;
    }
    throw new ConflictException('Failed to generate a unique room code after maximum retries');
  }

  // -------------------------------------------------------------------------
  // Module lifecycle
  // -------------------------------------------------------------------------

  private readonly EMPTY_ROOM_TTL_MS = 5 * 60 * 1000; // 5 minutes
  // How long a player entry with an unlinked placeholder socketId is kept before
  // being evicted. Short window — enough time to complete HTTP join → WS connect.
  private readonly PLACEHOLDER_TTL_MS = 60 * 1000; // 1 minute

  onModuleInit(): void {
    // Sweep abandoned rooms (created via HTTP but never joined, or fully disconnected
    // without the last-player path triggering). Runs every 60 seconds.
    setInterval(() => this.evictStaleRooms(), 60_000);
  }

  private evictStaleRooms(): void {
    const now = Date.now();
    const emptyCutoff = now - this.EMPTY_ROOM_TTL_MS;
    const placeholderCutoff = now - this.PLACEHOLDER_TTL_MS;

    for (const [code, room] of this.rooms) {
      // Evict players who joined via HTTP but never opened a WebSocket connection.
      // Their socketId is a UUID placeholder (not a socket.io id) and their joinedAt
      // is older than the placeholder TTL. This prevents lobby-squatting attacks where
      // an attacker fills all player slots via HTTP without ever connecting.
      for (const [socketId, player] of room.players) {
        const isPlaceholder = !socketId.includes('#') && player.joinedAt < placeholderCutoff
          && socketId !== '' && !this.socketToRoom.has(socketId);
        if (isPlaceholder) {
          room.players.delete(socketId);
          // socketToRoom is not populated for placeholder entries — no cleanup needed
          if (room.players.size === 0 && room.hostSocketId === socketId) {
            room.hostSocketId = '';
          }
        }
      }

      if (room.players.size === 0 && room.createdAt < emptyCutoff) {
        this.rooms.delete(code);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  createRoom(): string {
    const code = this.generateCode();
    const room: Room = {
      code,
      hostSocketId: '',
      players: new Map(),
      phase: 'lobby',
      createdAt: Date.now(),
      maxPlayers: MAX_PLAYERS,
      minPlayers: MIN_PLAYERS,
      settings: { characters: [], ladyOfLake: false },
    };
    this.rooms.set(code, room);
    return code;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  isJoinable(code: string): boolean {
    const room = this.rooms.get(code);
    if (!room) return false;
    if (room.phase !== 'lobby') return false;
    if (room.players.size >= room.maxPlayers) return false;
    return true;
  }

  /**
   * Adds a player to the room identified by `code`.
   * Throws LobbyException with an appropriate code on any failure.
   * INVARIANT: only place that writes to socketToRoom and Room.players.
   */
  addPlayer(code: string, socketId: string, name: string): Player {
    const room = this.rooms.get(code);

    if (!room) {
      throw new LobbyException('ROOM_NOT_FOUND', `Room "${code}" does not exist`);
    }

    if (room.phase !== 'lobby') {
      throw new LobbyException('ROOM_IN_PROGRESS', `Room "${code}" is already in progress`);
    }

    if (room.players.size >= room.maxPlayers) {
      throw new LobbyException('ROOM_FULL', `Room "${code}" is full (${room.maxPlayers} players)`);
    }

    if (this.socketToRoom.has(socketId)) {
      throw new LobbyException(
        'ALREADY_IN_ROOM',
        'You are already in a room. Disconnect first before joining another.',
      );
    }

    // Case-insensitive name uniqueness
    const nameLower = name.trim().toLowerCase();
    for (const existing of room.players.values()) {
      if (existing.name.toLowerCase() === nameLower) {
        throw new LobbyException(
          'NAME_TAKEN',
          `The name "${name}" is already taken in this room`,
        );
      }
    }

    const isFirstPlayer = room.players.size === 0;
    const player: Player = {
      id: randomUUID(),   // stable UUID — safe to broadcast to all clients
      socketId,           // internal — never exposed in snapshots
      name: name.trim(),
      isHost: isFirstPlayer,
      status: 'not_ready',
      joinedAt: Date.now(),
    };

    // Mutate state atomically
    room.players.set(socketId, player);
    this.socketToRoom.set(socketId, code);

    if (isFirstPlayer) {
      room.hostSocketId = socketId; // hostSocketId tracks by socket ID for internal routing
    }

    return player;
  }

  /**
   * Removes a player from their room by socket ID.
   * Promotes the oldest remaining player to host if the host left.
   * Deletes the room if it becomes empty.
   * INVARIANT: only place that deletes from socketToRoom and Room.players.
   */
  removePlayer(socketId: string): { room: Room | null; wasLastPlayer: boolean } {
    const code = this.socketToRoom.get(socketId);
    if (!code) {
      return { room: null, wasLastPlayer: false };
    }

    const room = this.rooms.get(code);
    if (!room) {
      this.socketToRoom.delete(socketId);
      return { room: null, wasLastPlayer: false };
    }

    room.players.delete(socketId);
    this.socketToRoom.delete(socketId);

    if (room.players.size === 0) {
      this.rooms.delete(code);
      return { room: null, wasLastPlayer: true };
    }

    // Promote oldest remaining player to host if the host disconnected
    if (room.hostSocketId === socketId) {
      const oldest = [...room.players.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      oldest.isHost = true;
      room.hostSocketId = oldest.socketId; // hostSocketId tracks socket ID, not UUID
    }

    return { room, wasLastPlayer: false };
  }

  /**
   * Toggles the ready state of the player identified by socketId.
   * Throws LobbyException('NOT_IN_ROOM') if the socket is not in any room.
   */
  toggleReady(socketId: string): Room {
    const code = this.socketToRoom.get(socketId);
    if (!code) {
      throw new LobbyException('NOT_IN_ROOM', 'You are not currently in a room');
    }

    const room = this.rooms.get(code);
    if (!room) {
      throw new LobbyException('NOT_IN_ROOM', 'Room not found');
    }

    const player = room.players.get(socketId);
    if (!player) {
      throw new LobbyException('NOT_IN_ROOM', 'Player not found in room');
    }

    player.status = player.status === 'ready' ? 'not_ready' : 'ready';
    return room;
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  getPlayerById(roomCode: string, playerId: string): Player | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    for (const player of room.players.values()) {
      if (player.id === playerId) return player;
    }
    return undefined;
  }

  setPhase(roomCode: string, phase: RoomPhase): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new LobbyException('ROOM_NOT_FOUND', `Room "${roomCode}" does not exist`);
    }
    room.phase = phase;
  }

  updateSettings(socketId: string, settings: GameSettings): Room {
    const code = this.socketToRoom.get(socketId);
    if (!code) {
      throw new LobbyException('NOT_IN_ROOM', 'You are not currently in a room');
    }

    const room = this.rooms.get(code);
    if (!room) {
      throw new LobbyException('NOT_IN_ROOM', 'Room not found');
    }

    if (room.phase !== 'lobby') {
      throw new LobbyException('ROOM_IN_PROGRESS', 'Cannot update settings after game has started');
    }

    if (room.hostSocketId !== socketId) {
      throw new LobbyException('NOT_HOST', 'Only the host can update game settings');
    }

    room.settings = settings;
    return room;
  }

  /**
   * Links a real Socket.io socket ID to a player that was added via HTTP with an
   * empty placeholder socketId.  Called from GameGateway.handleConnection once the
   * JWT has been verified and the player UUID is known.
   *
   * Re-keys the player entry in Room.players from the old socketId (which may be ''
   * or a stale value) to the new socket ID, and updates the socketToRoom index.
   *
   * Returns false when the player cannot be located (token-valid-after-removal).
   */
  linkSocket(playerId: string, newSocketId: string, roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    // Only accept connections to rooms that are still in the lobby phase.
    // This prevents stale tokens (valid for 4h) from replaying into a game
    // that is already in progress or into a recycled room slot.
    if (room.phase !== 'lobby') return false;

    // Find the player by UUID regardless of their current socketId key.
    // linkSocket is the authoritative room-membership check — the JWT is a
    // bearer credential only. Any code that removes a player (kick, eviction,
    // last-player removal) must remove from this Map; the JWT alone cannot revoke access.
    let found: Player | undefined;
    let oldSocketId: string | undefined;

    for (const [sid, player] of room.players) {
      if (player.id === playerId) {
        found = player;
        oldSocketId = sid;
        break;
      }
    }

    if (!found || oldSocketId === undefined) return false;

    // Guard: if the socket is already correctly linked, nothing to do
    if (oldSocketId === newSocketId) return true;

    // Remove old key, insert under new key
    room.players.delete(oldSocketId);
    found.socketId = newSocketId;
    room.players.set(newSocketId, found);

    // Update the reverse index — delete stale entry first
    if (oldSocketId !== '') {
      this.socketToRoom.delete(oldSocketId);
    }
    this.socketToRoom.set(newSocketId, roomCode);

    // If this player is the host, keep hostSocketId in sync
    if (found.isHost) {
      room.hostSocketId = newSocketId;
    }

    return true;
  }

  // -------------------------------------------------------------------------
  // Snapshot serialisation
  // -------------------------------------------------------------------------

  toSnapshot(room: Room): RoomSnapshot {
    const players: PlayerSnapshot[] = [...room.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,         // UUID — safe to broadcast; socketId is never included
        name: p.name,
        isHost: p.isHost,
        status: p.status,
        joinedAt: p.joinedAt,
      }));

    const allReady = players.length > 0 && players.every((p) => p.status === 'ready');

    return {
      code: room.code,
      phase: room.phase,
      players,
      playerCount: players.length,
      canStart: players.length >= MIN_PLAYERS && allReady,
      isFull: players.length >= MAX_PLAYERS,
      settings: room.settings,
    };
  }
}
