/**
 * Unit tests for GameGateway
 *
 * Strategy:
 *   - Instantiate GameGateway through Test.createTestingModule() so decorators
 *     are processed, but inject mock collaborators so no real WS server is started.
 *   - WsGuard and RoomService are replaced with jest.fn() mocks.
 *   - The @WebSocketServer() server property is overwritten with a mock object
 *     that records all broadcast calls.
 *   - Socket objects are plain mocks — no real Socket.io connection needed.
 *
 * These tests cover handleConnection exclusively (the scope requested for the
 * ephemeral JWT authentication feature).  The previously-written handlePlayerReady
 * and handleDisconnect tests remain commented out above and are preserved as-is.
 */

import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RoomService } from '../room/room.service';
import { WsGuard } from '../auth/ws.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Room } from '@avalon/shared';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Minimal mock of a Socket.io broadcast chain: server.to(room).emit(...) */
function makeMockServer() {
  const emissions: Array<{ room: string; event: string; data: unknown }> = [];

  return {
    to: jest.fn((room: string) => ({
      emit: jest.fn((event: string, data: unknown) => {
        emissions.push({ room, event, data });
      }),
    })),
    getEmissions: () => emissions,
  };
}

type MockSocket = {
  id: string;
  data: Record<string, unknown>;
  handshake: { headers: Record<string, string>; auth: Record<string, unknown> };
  join: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
};

function makeMockSocket(id = 'socket-test'): MockSocket {
  return {
    id,
    data: {},
    handshake: { headers: {}, auth: {} },
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
}

const SAMPLE_PAYLOAD: JwtPayload = {
  sub: 'player-uuid-abc',
  roomCode: 'ROOM01',
  playerName: 'TestPlayer',
};

/** A minimal Room stub sufficient for broadcastRoomUpdate to call toSnapshot(). */
function makeFakeRoom(code: string): Room {
  return {
    code,
    hostSocketId: 'some-socket',
    players: new Map(),
    phase: 'lobby',
    createdAt: Date.now(),
    maxPlayers: 10,
    minPlayers: 5,
  };
}

// ---------------------------------------------------------------------------
// Module factory
// ---------------------------------------------------------------------------

async function createGateway(): Promise<{
  gateway: GameGateway;
  mockWsGuard: jest.Mocked<Pick<WsGuard, 'verifyHandshakeToken' | 'canActivate'>>;
  mockRoomService: jest.Mocked<
    Pick<RoomService, 'linkSocket' | 'getRoom' | 'toSnapshot' | 'removePlayer' | 'toggleReady'>
  >;
  mockServer: ReturnType<typeof makeMockServer>;
}> {
  const mockWsGuard = {
    verifyHandshakeToken: jest.fn(),
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockRoomService = {
    linkSocket: jest.fn(),
    getRoom: jest.fn(),
    toSnapshot: jest.fn().mockReturnValue({
      code: 'ROOM01',
      phase: 'lobby',
      players: [],
      playerCount: 0,
      canStart: false,
      isFull: false,
    }),
    removePlayer: jest.fn().mockReturnValue({ room: null, wasLastPlayer: false }),
    toggleReady: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GameGateway,
      { provide: WsGuard, useValue: mockWsGuard },
      { provide: RoomService, useValue: mockRoomService },
    ],
  }).compile();

  const gateway = module.get<GameGateway>(GameGateway);
  const mockServer = makeMockServer();

  // Inject mock server — bypasses the @WebSocketServer() lifecycle
  (gateway as unknown as Record<string, unknown>).server = mockServer;

  return { gateway, mockWsGuard, mockRoomService, mockServer };
}

// ---------------------------------------------------------------------------
// handleConnection — valid token + linkSocket succeeds
// ---------------------------------------------------------------------------

describe('GameGateway.handleConnection() — valid token, linkSocket returns true', () => {
  it('sets client.data.player to the decoded JWT payload', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(true);
    mockRoomService.getRoom.mockReturnValue(makeFakeRoom(SAMPLE_PAYLOAD.roomCode));

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.data.player).toEqual(SAMPLE_PAYLOAD);
  });

  it('calls client.join with the room code from the payload', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(true);
    mockRoomService.getRoom.mockReturnValue(makeFakeRoom(SAMPLE_PAYLOAD.roomCode));

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.join).toHaveBeenCalledWith(SAMPLE_PAYLOAD.roomCode);
  });

  it('calls linkSocket with the correct playerId, socket id, and room code', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(true);
    mockRoomService.getRoom.mockReturnValue(makeFakeRoom(SAMPLE_PAYLOAD.roomCode));

    const client = makeMockSocket('connected-socket-id');
    gateway.handleConnection(client as never);

    expect(mockRoomService.linkSocket).toHaveBeenCalledWith(
      SAMPLE_PAYLOAD.sub,
      'connected-socket-id',
      SAMPLE_PAYLOAD.roomCode,
    );
  });

  it('broadcasts room_updated to the room after a successful connection', async () => {
    const { gateway, mockWsGuard, mockRoomService, mockServer } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(true);
    mockRoomService.getRoom.mockReturnValue(makeFakeRoom(SAMPLE_PAYLOAD.roomCode));

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    const roomUpdateEmissions = mockServer
      .getEmissions()
      .filter((e) => e.event === 'room_updated');
    expect(roomUpdateEmissions.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT emit "unauthorized" or call disconnect on success', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(true);
    mockRoomService.getRoom.mockReturnValue(makeFakeRoom(SAMPLE_PAYLOAD.roomCode));

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.emit).not.toHaveBeenCalledWith('unauthorized', expect.anything());
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('skips broadcasting room_updated when getRoom returns undefined', async () => {
    const { gateway, mockWsGuard, mockRoomService, mockServer } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(true);
    // Room was deleted between linkSocket and getRoom — edge case
    mockRoomService.getRoom.mockReturnValue(undefined);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    const roomUpdateEmissions = mockServer
      .getEmissions()
      .filter((e) => e.event === 'room_updated');
    expect(roomUpdateEmissions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// handleConnection — verifyHandshakeToken returns null (missing / invalid token)
// ---------------------------------------------------------------------------

describe('GameGateway.handleConnection() — verifyHandshakeToken returns null', () => {
  it('emits "unauthorized" with the expected message', async () => {
    const { gateway, mockWsGuard } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(null);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.emit).toHaveBeenCalledWith('unauthorized', {
      message: 'Invalid or missing token',
    });
  });

  it('calls disconnect(true) when token is missing or invalid', async () => {
    const { gateway, mockWsGuard } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(null);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('does NOT call linkSocket when the token verification fails', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(null);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(mockRoomService.linkSocket).not.toHaveBeenCalled();
  });

  it('does NOT call client.join when the token is missing', async () => {
    const { gateway, mockWsGuard } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(null);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.join).not.toHaveBeenCalled();
  });

  it('does NOT set client.data.player when the token is invalid', async () => {
    const { gateway, mockWsGuard } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(null);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.data.player).toBeUndefined();
  });

  it('does NOT broadcast room_updated when token verification fails', async () => {
    const { gateway, mockWsGuard, mockServer } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(null);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    const roomUpdateEmissions = mockServer
      .getEmissions()
      .filter((e) => e.event === 'room_updated');
    expect(roomUpdateEmissions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// handleConnection — valid token but linkSocket returns false
// ---------------------------------------------------------------------------

describe('GameGateway.handleConnection() — valid token but linkSocket returns false', () => {
  it('emits "unauthorized" with the player-not-found message', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(false);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.emit).toHaveBeenCalledWith('unauthorized', {
      message: 'Player session not found. Please rejoin the room.',
    });
  });

  it('calls disconnect(true) when linkSocket returns false', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(false);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('does NOT call client.join when linkSocket returns false', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(false);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.join).not.toHaveBeenCalled();
  });

  it('does NOT broadcast room_updated when linkSocket returns false', async () => {
    const { gateway, mockWsGuard, mockRoomService, mockServer } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(false);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    const roomUpdateEmissions = mockServer
      .getEmissions()
      .filter((e) => e.event === 'room_updated');
    expect(roomUpdateEmissions).toHaveLength(0);
  });

  it('still sets client.data.player before the linkSocket failure check', async () => {
    // The implementation sets client.data.player immediately after token
    // verification, before the linkSocket check.  This is the observed
    // code order; the test documents that behaviour.
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(false);

    const client = makeMockSocket();
    gateway.handleConnection(client as never);

    expect(client.data.player).toEqual(SAMPLE_PAYLOAD);
  });

  it('calls linkSocket exactly once with the correct arguments even when it returns false', async () => {
    const { gateway, mockWsGuard, mockRoomService } = await createGateway();
    mockWsGuard.verifyHandshakeToken.mockReturnValue(SAMPLE_PAYLOAD);
    mockRoomService.linkSocket.mockReturnValue(false);

    const client = makeMockSocket('disconnecting-socket');
    gateway.handleConnection(client as never);

    expect(mockRoomService.linkSocket).toHaveBeenCalledTimes(1);
    expect(mockRoomService.linkSocket).toHaveBeenCalledWith(
      SAMPLE_PAYLOAD.sub,
      'disconnecting-socket',
      SAMPLE_PAYLOAD.roomCode,
    );
  });
});
