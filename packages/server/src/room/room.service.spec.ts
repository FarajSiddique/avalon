/**
 * Unit tests for RoomService
 *
 * All tests instantiate RoomService directly — no NestJS DI container.
 * ConflictException from @nestjs/common is re-exported but the test file
 * keeps NestJS imports to a minimum; we only need the exception shape.
 */

import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { RoomService, LobbyException } from './room.service';
import { MIN_PLAYERS, MAX_PLAYERS } from '@avalon/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fresh RoomService with no rooms. */
function makeService(): RoomService {
  return new RoomService();
}

/**
 * Adds `count` players to the room identified by `code`, each with a unique
 * socket ID ("socket-0", "socket-1", …) and display name ("Player 1", …).
 * Returns the socket IDs in insertion order.
 */
function fillRoom(
  svc: RoomService,
  code: string,
  count: number,
  startIndex = 0,
): string[] {
  const ids: string[] = [];
  for (let i = startIndex; i < startIndex + count; i++) {
    const socketId = `socket-${i}`;
    svc.addPlayer(code, socketId, `Player ${i + 1}`);
    ids.push(socketId);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// createRoom()
// ---------------------------------------------------------------------------

describe('RoomService.createRoom()', () => {
  it('returns a 6-character string', () => {
    const svc = makeService();
    const code = svc.createRoom();
    expect(code).toHaveLength(6);
  });

  it('returns only uppercase alphanumeric characters (no O, 0, 1, I)', () => {
    const svc = makeService();
    const VALID = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
    const FORBIDDEN = /[O01I]/;

    for (let i = 0; i < 50; i++) {
      const code = svc.createRoom();
      expect(code).toMatch(VALID);
      expect(code).not.toMatch(FORBIDDEN);
    }
  });

  it('every code contains at least one letter and at least one digit', () => {
    const svc = makeService();
    const HAS_LETTER = /[ABCDEFGHJKLMNPQRSTUVWXYZ]/;
    const HAS_DIGIT = /[23456789]/;

    for (let i = 0; i < 100; i++) {
      const code = svc.createRoom();
      expect(code).toMatch(HAS_LETTER);
      expect(code).toMatch(HAS_DIGIT);
    }
  });

  it('creates a room that is immediately retrievable via getRoom()', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const room = svc.getRoom(code);
    expect(room).toBeDefined();
    expect(room!.code).toBe(code);
  });

  it('starts the room in lobby phase', () => {
    const svc = makeService();
    const code = svc.createRoom();
    expect(svc.getRoom(code)!.phase).toBe('lobby');
  });

  it('initialises with an empty players map', () => {
    const svc = makeService();
    const code = svc.createRoom();
    expect(svc.getRoom(code)!.players.size).toBe(0);
  });

  it('generates distinct codes for successive rooms', () => {
    const svc = makeService();
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      codes.add(svc.createRoom());
    }
    expect(codes.size).toBe(20);
  });

  it('throws ConflictException when code generation exhausts retries', () => {
    const svc = makeService();

    // Simulate a saturated code space by making the internal rooms Map report
    // every candidate code as already existing. This exercises the retry loop
    // without needing to mock the CSPRNG (crypto.randomInt).
    jest.spyOn((svc as any).rooms, 'has').mockReturnValue(true);

    expect(() => svc.createRoom()).toThrow(ConflictException);

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// addPlayer()
// ---------------------------------------------------------------------------

describe('RoomService.addPlayer()', () => {
  it('first player becomes host with isHost: true', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const player = svc.addPlayer(code, 'socket-0', 'Alice');
    expect(player.isHost).toBe(true);
  });

  it('subsequent players are not host', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    const bob = svc.addPlayer(code, 'socket-1', 'Bob');
    expect(bob.isHost).toBe(false);
  });

  it('returned player has correct name (trimmed) and status not_ready', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const player = svc.addPlayer(code, 'socket-0', '  Alice  ');
    expect(player.name).toBe('Alice');
    expect(player.status).toBe('not_ready');
    // id is a stable UUID, not the socket ID
    expect(typeof player.id).toBe('string');
    expect(player.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets hostSocketId on the room when first player joins', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    expect(svc.getRoom(code)!.hostSocketId).toBe('socket-0');
  });

  it('throws ROOM_NOT_FOUND when room does not exist', () => {
    const svc = makeService();
    expect(() => svc.addPlayer('XXXXXX', 'socket-0', 'Alice')).toThrow(
      expect.objectContaining({ code: 'ROOM_NOT_FOUND' } as Partial<LobbyException>),
    );
  });

  it('throws ROOM_FULL when player count is already at MAX_PLAYERS (10)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    fillRoom(svc, code, MAX_PLAYERS);
    expect(() => svc.addPlayer(code, 'socket-overflow', 'Overflow')).toThrow(
      expect.objectContaining({ code: 'ROOM_FULL' } as Partial<LobbyException>),
    );
  });

  it('allows exactly MAX_PLAYERS to join without throwing', () => {
    const svc = makeService();
    const code = svc.createRoom();
    expect(() => fillRoom(svc, code, MAX_PLAYERS)).not.toThrow();
    expect(svc.getRoom(code)!.players.size).toBe(MAX_PLAYERS);
  });

  it('throws NAME_TAKEN for an exact duplicate name', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    expect(() => svc.addPlayer(code, 'socket-1', 'Alice')).toThrow(
      expect.objectContaining({ code: 'NAME_TAKEN' } as Partial<LobbyException>),
    );
  });

  it('throws NAME_TAKEN for a case-insensitive duplicate (alice vs ALICE)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'alice');
    expect(() => svc.addPlayer(code, 'socket-1', 'ALICE')).toThrow(
      expect.objectContaining({ code: 'NAME_TAKEN' } as Partial<LobbyException>),
    );
  });

  it('throws NAME_TAKEN for mixed-case duplicate (Alice vs aLiCe)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    expect(() => svc.addPlayer(code, 'socket-1', 'aLiCe')).toThrow(
      expect.objectContaining({ code: 'NAME_TAKEN' } as Partial<LobbyException>),
    );
  });

  it('throws ALREADY_IN_ROOM when socket is already tracked in any room', () => {
    const svc = makeService();
    const code1 = svc.createRoom();
    const code2 = svc.createRoom();
    svc.addPlayer(code1, 'socket-0', 'Alice');
    expect(() => svc.addPlayer(code2, 'socket-0', 'Alice2')).toThrow(
      expect.objectContaining({ code: 'ALREADY_IN_ROOM' } as Partial<LobbyException>),
    );
  });

  it('allows the same name in different rooms', () => {
    const svc = makeService();
    const code1 = svc.createRoom();
    const code2 = svc.createRoom();
    expect(() => {
      svc.addPlayer(code1, 'socket-0', 'Alice');
      svc.addPlayer(code2, 'socket-1', 'Alice');
    }).not.toThrow();
  });

  it('records joinedAt as a positive integer timestamp', () => {
    const before = Date.now();
    const svc = makeService();
    const code = svc.createRoom();
    const player = svc.addPlayer(code, 'socket-0', 'Alice');
    const after = Date.now();
    expect(player.joinedAt).toBeGreaterThanOrEqual(before);
    expect(player.joinedAt).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// removePlayer()
// ---------------------------------------------------------------------------

describe('RoomService.removePlayer()', () => {
  it('returns { room: null, wasLastPlayer: false } for an unknown socket', () => {
    const svc = makeService();
    const result = svc.removePlayer('ghost-socket');
    expect(result).toEqual({ room: null, wasLastPlayer: false });
  });

  it('removes the player from the room', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    svc.addPlayer(code, 'socket-1', 'Bob');
    svc.removePlayer('socket-0');
    expect(svc.getRoom(code)!.players.has('socket-0')).toBe(false);
  });

  it('removes the socket from the socketToRoom index (getRoomBySocket returns undefined)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    svc.addPlayer(code, 'socket-1', 'Bob');
    svc.removePlayer('socket-1');
    expect(svc.getRoomBySocket('socket-1')).toBeUndefined();
  });

  it('returns wasLastPlayer: true and deletes room when last player leaves', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    const result = svc.removePlayer('socket-0');
    expect(result.wasLastPlayer).toBe(true);
    expect(result.room).toBeNull();
    expect(svc.getRoom(code)).toBeUndefined();
  });

  it('promotes the oldest remaining player to host when the host leaves', () => {
    const svc = makeService();
    const code = svc.createRoom();

    // socket-0 joins first (host), then socket-1, then socket-2
    const now = Date.now();
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(now)       // socket-0 joinedAt
      .mockReturnValueOnce(now + 10)  // socket-1 joinedAt
      .mockReturnValueOnce(now + 20); // socket-2 joinedAt

    svc.addPlayer(code, 'socket-0', 'Alice');
    svc.addPlayer(code, 'socket-1', 'Bob');
    svc.addPlayer(code, 'socket-2', 'Carol');

    jest.spyOn(Date, 'now').mockRestore();

    svc.removePlayer('socket-0'); // host leaves

    const room = svc.getRoom(code)!;
    expect(room.hostSocketId).toBe('socket-1');
    expect(room.players.get('socket-1')!.isHost).toBe(true);
    expect(room.players.get('socket-2')!.isHost).toBe(false);
  });

  it('does not change host if the leaving player is not host', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    svc.addPlayer(code, 'socket-1', 'Bob');
    svc.removePlayer('socket-1');
    expect(svc.getRoom(code)!.hostSocketId).toBe('socket-0');
  });

  it('returns the updated room object when not last player', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    svc.addPlayer(code, 'socket-1', 'Bob');
    const result = svc.removePlayer('socket-1');
    expect(result.wasLastPlayer).toBe(false);
    expect(result.room).not.toBeNull();
    expect(result.room!.code).toBe(code);
  });

  it('promotes oldest player correctly with three remaining players when host leaves', () => {
    const svc = makeService();
    const code = svc.createRoom();

    // Ensure joinedAt order: 0 < 1 < 2 < 3
    const base = 1_000_000;
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(base)
      .mockReturnValueOnce(base + 100)
      .mockReturnValueOnce(base + 200)
      .mockReturnValueOnce(base + 300);

    svc.addPlayer(code, 'socket-0', 'Alice');  // host
    svc.addPlayer(code, 'socket-1', 'Bob');    // oldest remaining after host leaves
    svc.addPlayer(code, 'socket-2', 'Carol');
    svc.addPlayer(code, 'socket-3', 'Dave');

    jest.spyOn(Date, 'now').mockRestore();

    svc.removePlayer('socket-0');

    const room = svc.getRoom(code)!;
    expect(room.players.get('socket-1')!.isHost).toBe(true);
    expect(room.players.get('socket-2')!.isHost).toBe(false);
    expect(room.players.get('socket-3')!.isHost).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toggleReady()
// ---------------------------------------------------------------------------

describe('RoomService.toggleReady()', () => {
  it('toggles status from not_ready to ready', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    const room = svc.toggleReady('socket-0');
    expect(room.players.get('socket-0')!.status).toBe('ready');
  });

  it('toggles status from ready back to not_ready', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    svc.toggleReady('socket-0'); // → ready
    const room = svc.toggleReady('socket-0'); // → not_ready
    expect(room.players.get('socket-0')!.status).toBe('not_ready');
  });

  it('returns the room object containing the updated player', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    const room = svc.toggleReady('socket-0');
    expect(room.code).toBe(code);
  });

  it('throws NOT_IN_ROOM for an unknown socket', () => {
    const svc = makeService();
    expect(() => svc.toggleReady('ghost-socket')).toThrow(
      expect.objectContaining({ code: 'NOT_IN_ROOM' } as Partial<LobbyException>),
    );
  });

  it('only changes the ready state of the targeted player, not others', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    svc.addPlayer(code, 'socket-1', 'Bob');
    svc.toggleReady('socket-0');
    const room = svc.getRoom(code)!;
    expect(room.players.get('socket-1')!.status).toBe('not_ready');
  });
});

// ---------------------------------------------------------------------------
// getRoomBySocket()
// ---------------------------------------------------------------------------

describe('RoomService.getRoomBySocket()', () => {
  it('returns the correct room for a joined socket', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    const room = svc.getRoomBySocket('socket-0');
    expect(room).toBeDefined();
    expect(room!.code).toBe(code);
  });

  it('returns undefined for an unknown socket', () => {
    const svc = makeService();
    expect(svc.getRoomBySocket('unknown')).toBeUndefined();
  });

  it('returns undefined after the player is removed', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    svc.addPlayer(code, 'socket-1', 'Bob');
    svc.removePlayer('socket-0');
    expect(svc.getRoomBySocket('socket-0')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isJoinable()
// ---------------------------------------------------------------------------

describe('RoomService.isJoinable()', () => {
  it('returns false for a non-existent room code', () => {
    const svc = makeService();
    expect(svc.isJoinable('XXXXXX')).toBe(false);
  });

  it('returns true for a valid lobby room with space', () => {
    const svc = makeService();
    const code = svc.createRoom();
    expect(svc.isJoinable(code)).toBe(true);
  });

  it('returns false when room is full (10 players)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    fillRoom(svc, code, MAX_PLAYERS);
    expect(svc.isJoinable(code)).toBe(false);
  });

  it('returns true when room has 9 players (one slot remaining)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    fillRoom(svc, code, MAX_PLAYERS - 1);
    expect(svc.isJoinable(code)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// toSnapshot()
// ---------------------------------------------------------------------------

describe('RoomService.toSnapshot()', () => {
  it('returns correct code and phase', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const room = svc.getRoom(code)!;
    const snap = svc.toSnapshot(room);
    expect(snap.code).toBe(code);
    expect(snap.phase).toBe('lobby');
  });

  it('returns an empty players array and canStart: false for an empty room', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    expect(snap.players).toHaveLength(0);
    expect(snap.canStart).toBe(false);
    expect(snap.playerCount).toBe(0);
  });

  it('returns players sorted by joinedAt ascending', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const base = 2_000_000;

    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(base + 200)
      .mockReturnValueOnce(base + 50)
      .mockReturnValueOnce(base + 100);

    svc.addPlayer(code, 'socket-late', 'Charlie');
    svc.addPlayer(code, 'socket-early', 'Alice');
    svc.addPlayer(code, 'socket-mid', 'Bob');

    jest.spyOn(Date, 'now').mockRestore();

    const snap = svc.toSnapshot(svc.getRoom(code)!);
    // Sort order is by joinedAt — verify by name since id is now a UUID
    // Alice=50ms, Bob=100ms, Charlie=200ms → ascending order
    expect(snap.players.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('canStart is false when fewer than MIN_PLAYERS (5) are ready', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const ids = fillRoom(svc, code, MIN_PLAYERS - 1); // 4 players
    ids.forEach((id) => svc.toggleReady(id));
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    expect(snap.canStart).toBe(false);
  });

  it('canStart is false when exactly 5 players are present but not all are ready', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const ids = fillRoom(svc, code, MIN_PLAYERS); // 5 players
    // Mark only 4 of them ready
    ids.slice(0, 4).forEach((id) => svc.toggleReady(id));
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    expect(snap.canStart).toBe(false);
  });

  it('canStart is true when exactly 5 players are all ready', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const ids = fillRoom(svc, code, MIN_PLAYERS);
    ids.forEach((id) => svc.toggleReady(id));
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    expect(snap.canStart).toBe(true);
  });

  it('canStart is true when 10 players are all ready', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const ids = fillRoom(svc, code, MAX_PLAYERS);
    ids.forEach((id) => svc.toggleReady(id));
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    expect(snap.canStart).toBe(true);
  });

  it('isFull is false when fewer than MAX_PLAYERS (10) are present', () => {
    const svc = makeService();
    const code = svc.createRoom();
    fillRoom(svc, code, MAX_PLAYERS - 1);
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    expect(snap.isFull).toBe(false);
  });

  it('isFull is true when exactly MAX_PLAYERS (10) are present', () => {
    const svc = makeService();
    const code = svc.createRoom();
    fillRoom(svc, code, MAX_PLAYERS);
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    expect(snap.isFull).toBe(true);
  });

  it('playerCount matches the number of players in the snapshot array', () => {
    const svc = makeService();
    const code = svc.createRoom();
    fillRoom(svc, code, 3);
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    expect(snap.playerCount).toBe(3);
    expect(snap.players).toHaveLength(3);
  });

  it('snapshot players carry correct fields (id, name, isHost, status, joinedAt)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-0', 'Alice');
    const snap = svc.toSnapshot(svc.getRoom(code)!);
    const psnap = snap.players[0];
    // id is a stable UUID, not the socket ID
    expect(psnap.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(psnap.name).toBe('Alice');
    expect(psnap.isHost).toBe(true);
    expect(psnap.status).toBe('not_ready');
    expect(typeof psnap.joinedAt).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// LobbyException
// ---------------------------------------------------------------------------

describe('LobbyException', () => {
  it('has name "LobbyException" and exposes code and message', () => {
    const err = new LobbyException('ROOM_NOT_FOUND', 'test message');
    expect(err.name).toBe('LobbyException');
    expect(err.code).toBe('ROOM_NOT_FOUND');
    expect(err.message).toBe('test message');
    expect(err instanceof Error).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// linkSocket()
// ---------------------------------------------------------------------------

describe('RoomService.linkSocket()', () => {
  /**
   * Add a player with a placeholder UUID socket ID (mirroring the HTTP join
   * path) and return the player's stable UUID so tests can call linkSocket().
   */
  function addPlayerWithPlaceholder(
    svc: RoomService,
    code: string,
    placeholderSocketId: string,
    name: string,
  ): string {
    const player = svc.addPlayer(code, placeholderSocketId, name);
    return player.id; // stable UUID
  }

  // -------------------------------------------------------------------------
  // Happy path — different socket IDs
  // -------------------------------------------------------------------------

  it('returns true when the player is found and the socket ID differs', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const playerId = addPlayerWithPlaceholder(svc, code, 'placeholder-1', 'Alice');

    const result = svc.linkSocket(playerId, 'real-socket-1', code);

    expect(result).toBe(true);
  });

  it('re-keys the players map from the old socket ID to the new socket ID', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const playerId = addPlayerWithPlaceholder(svc, code, 'placeholder-2', 'Bob');

    svc.linkSocket(playerId, 'real-socket-2', code);

    const room = svc.getRoom(code)!;
    expect(room.players.has('placeholder-2')).toBe(false);
    expect(room.players.has('real-socket-2')).toBe(true);
  });

  it('updates socketId on the player object itself', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const playerId = addPlayerWithPlaceholder(svc, code, 'placeholder-3', 'Carol');

    svc.linkSocket(playerId, 'real-socket-3', code);

    const room = svc.getRoom(code)!;
    const player = room.players.get('real-socket-3')!;
    expect(player.socketId).toBe('real-socket-3');
  });

  it('maps the new socket ID to the room code in socketToRoom (getRoomBySocket works)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const playerId = addPlayerWithPlaceholder(svc, code, 'placeholder-4', 'Dave');

    svc.linkSocket(playerId, 'real-socket-4', code);

    expect(svc.getRoomBySocket('real-socket-4')).toBeDefined();
    expect(svc.getRoomBySocket('real-socket-4')!.code).toBe(code);
  });

  it('removes the old socket ID from socketToRoom when old ID is a non-empty string', () => {
    const svc = makeService();
    const code = svc.createRoom();
    // Use a realistic-looking non-empty placeholder ID
    const playerId = addPlayerWithPlaceholder(svc, code, 'old-socket-5', 'Eve');

    svc.linkSocket(playerId, 'new-socket-5', code);

    // The old ID must no longer resolve to a room
    expect(svc.getRoomBySocket('old-socket-5')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Same socket ID (already linked)
  // -------------------------------------------------------------------------

  it('returns true when the old and new socket IDs are identical (already linked)', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const playerId = addPlayerWithPlaceholder(svc, code, 'same-socket-6', 'Frank');

    const result = svc.linkSocket(playerId, 'same-socket-6', code);

    expect(result).toBe(true);
  });

  it('does NOT mutate the players map when the socket ID is unchanged', () => {
    const svc = makeService();
    const code = svc.createRoom();
    const playerId = addPlayerWithPlaceholder(svc, code, 'same-socket-7', 'Grace');

    const room = svc.getRoom(code)!;
    const sizeBefore = room.players.size;

    svc.linkSocket(playerId, 'same-socket-7', code);

    expect(room.players.size).toBe(sizeBefore);
    expect(room.players.has('same-socket-7')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Host synchronisation
  // -------------------------------------------------------------------------

  it('updates hostSocketId on the room when the linked player is the host', () => {
    const svc = makeService();
    const code = svc.createRoom();
    // First player added becomes host
    const hostId = addPlayerWithPlaceholder(svc, code, 'host-placeholder', 'HostPlayer');

    svc.linkSocket(hostId, 'host-real-socket', code);

    expect(svc.getRoom(code)!.hostSocketId).toBe('host-real-socket');
  });

  it('does NOT change hostSocketId when a non-host player is linked', () => {
    const svc = makeService();
    const code = svc.createRoom();
    // First player is host
    addPlayerWithPlaceholder(svc, code, 'host-sock', 'HostPlayer');
    // Second player is not host
    const guestId = addPlayerWithPlaceholder(svc, code, 'guest-placeholder', 'GuestPlayer');

    svc.linkSocket(guestId, 'guest-real-socket', code);

    // hostSocketId should still point to the host's original socket ID
    expect(svc.getRoom(code)!.hostSocketId).toBe('host-sock');
  });

  // -------------------------------------------------------------------------
  // Empty placeholder socket ID guard
  // -------------------------------------------------------------------------

  it('does NOT call socketToRoom.delete for the old ID when it is an empty string', () => {
    // When the HTTP route used '' as the placeholder, linkSocket must not
    // try to delete '' from the reverse index (it was never inserted there).
    const svc = makeService();
    const code = svc.createRoom();

    // Bypass addPlayer's ALREADY_IN_ROOM guard by using a non-'' placeholder
    // in addPlayer, then manually rekey the player to '' to simulate the
    // empty-string placeholder scenario.
    const tempId = 'temp-placeholder-empty';
    const player = svc.addPlayer(code, tempId, 'EmptyPlaceholder');

    // Manually move the player to the '' key to simulate the pre-UUID behaviour
    const room = svc.getRoom(code)!;
    room.players.delete(tempId);
    player.socketId = '';
    room.players.set('', player);
    // Do NOT add '' to socketToRoom (mirrors how '' was never indexed)

    // Now link the real socket
    const result = svc.linkSocket(player.id, 'real-socket-empty', code);

    expect(result).toBe(true);
    // The new socket must be reachable
    expect(svc.getRoomBySocket('real-socket-empty')).toBeDefined();
    // '' must not be reachable (it was never in socketToRoom, so getRoomBySocket
    // simply returns undefined — the important thing is no crash occurred)
    expect(svc.getRoomBySocket('')).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Not found cases
  // -------------------------------------------------------------------------

  it('returns false when the playerId is not in the specified room', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'some-socket', 'ExistingPlayer');

    // Pass a UUID that does not match any player in the room
    const result = svc.linkSocket('non-existent-uuid', 'new-socket', code);

    expect(result).toBe(false);
  });

  it('returns false when the roomCode does not exist', () => {
    const svc = makeService();

    const result = svc.linkSocket('any-uuid', 'any-socket', 'XXXXXX');

    expect(result).toBe(false);
  });

  it('does not mutate any state when the roomCode is not found', () => {
    const svc = makeService();
    const existingCode = svc.createRoom();
    svc.addPlayer(existingCode, 'socket-existing', 'Player1');

    svc.linkSocket('some-uuid', 'some-socket', 'XXXXXX');

    // The existing room must be intact
    expect(svc.getRoom(existingCode)!.players.size).toBe(1);
  });

  it('does not mutate any state when the playerId is not found in the room', () => {
    const svc = makeService();
    const code = svc.createRoom();
    svc.addPlayer(code, 'socket-real', 'Player1');

    svc.linkSocket('ghost-uuid', 'new-socket', code);

    const room = svc.getRoom(code)!;
    // No extra entries should be added
    expect(room.players.size).toBe(1);
    expect(room.players.has('socket-real')).toBe(true);
  });
});
