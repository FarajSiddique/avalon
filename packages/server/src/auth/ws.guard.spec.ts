/**
 * Unit tests for WsGuard
 *
 * WsGuard has two distinct responsibilities:
 *   1. canActivate()           — reads client.data.player; rejects if absent
 *   2. verifyHandshakeToken()  — extracts + verifies a JWT from the handshake
 *
 * Tests use inline jest.fn() mocks for both JwtService and the Socket object so
 * no NestJS DI container is required.  JwtService is constructed as a plain
 * object mock and injected directly into WsGuard's constructor.
 */

import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { WsGuard } from './ws.guard';
import { JwtPayload } from './jwt-payload.interface';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a partial JwtService where verify() can be controlled per-test. */
function makeMockJwtService(
  verifyImpl: (token: string) => JwtPayload = () => { throw new Error('not configured'); },
): JwtService {
  return {
    verify: jest.fn(verifyImpl),
    sign: jest.fn(),
    decode: jest.fn(),
  } as unknown as JwtService;
}

/**
 * Builds a minimal Socket mock.
 * `handshake` fields and `data` are set by the caller for each test scenario.
 */
function makeMockSocket(overrides: {
  id?: string;
  data?: Record<string, unknown>;
  handshakeHeaders?: Record<string, string>;
  handshakeAuth?: Record<string, unknown>;
} = {}): jest.Mocked<Pick<Socket, 'id' | 'data' | 'handshake' | 'emit' | 'disconnect'>> & { emit: jest.Mock; disconnect: jest.Mock } {
  return {
    id: overrides.id ?? 'socket-test-id',
    data: overrides.data ?? {},
    handshake: {
      headers: overrides.handshakeHeaders ?? {},
      auth: overrides.handshakeAuth ?? {},
    } as Socket['handshake'],
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
}

/** Wraps a mock socket into an ExecutionContext as WsGuard.canActivate() expects. */
function makeWsContext(client: ReturnType<typeof makeMockSocket>): ExecutionContext {
  return {
    switchToWs: () => ({
      getClient: <T>() => client as unknown as T,
    }),
  } as unknown as ExecutionContext;
}

const SAMPLE_PAYLOAD: JwtPayload = {
  sub: 'player-uuid-1234',
  roomCode: 'ABCD12',
  playerName: 'TestPlayer',
};

// ---------------------------------------------------------------------------
// canActivate()
// ---------------------------------------------------------------------------

describe('WsGuard.canActivate()', () => {
  it('returns true when client.data.player is a valid payload object', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({ data: { player: SAMPLE_PAYLOAD } });
    const ctx = makeWsContext(client);

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('does NOT emit or disconnect when client.data.player is present', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({ data: { player: SAMPLE_PAYLOAD } });
    const ctx = makeWsContext(client);

    guard.canActivate(ctx);

    expect(client.emit).not.toHaveBeenCalled();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('returns false when client.data.player is undefined', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({ data: {} });
    const ctx = makeWsContext(client);

    const result = guard.canActivate(ctx);

    expect(result).toBe(false);
  });

  it('emits "unauthorized" with the expected message when client.data.player is undefined', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({ data: {} });
    const ctx = makeWsContext(client);

    guard.canActivate(ctx);

    expect(client.emit).toHaveBeenCalledWith('unauthorized', {
      message: 'Authentication required',
    });
  });

  it('calls disconnect(true) when client.data.player is undefined', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({ data: {} });
    const ctx = makeWsContext(client);

    guard.canActivate(ctx);

    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('returns false when client.data.player is null (explicitly nulled out)', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    // null is falsy — guard should treat it the same as undefined
    const client = makeMockSocket({ data: { player: null } });
    const ctx = makeWsContext(client);

    const result = guard.canActivate(ctx);

    expect(result).toBe(false);
    expect(client.emit).toHaveBeenCalledWith('unauthorized', expect.any(Object));
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------
// verifyHandshakeToken() — token extraction from handshake.auth
// ---------------------------------------------------------------------------

describe('WsGuard.verifyHandshakeToken() — handshake.auth.token (plain string)', () => {
  it('returns the decoded payload when a plain token is in handshake.auth.token', () => {
    const jwtService = makeMockJwtService(() => SAMPLE_PAYLOAD);
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeAuth: { token: 'raw.jwt.token' },
    });

    const result = guard.verifyHandshakeToken(client as unknown as Socket);

    expect(result).toEqual(SAMPLE_PAYLOAD);
    expect(jwtService.verify).toHaveBeenCalledWith('raw.jwt.token');
  });

  it('passes the raw token string (without any prefix) to jwtService.verify', () => {
    const jwtService = makeMockJwtService(() => SAMPLE_PAYLOAD);
    const guard = new WsGuard(jwtService);

    const rawToken = 'eyJhbGciOiJIUzI1NiJ9.payload.sig';
    const client = makeMockSocket({
      handshakeAuth: { token: rawToken },
    });

    guard.verifyHandshakeToken(client as unknown as Socket);

    expect(jwtService.verify).toHaveBeenCalledWith(rawToken);
  });
});

// ---------------------------------------------------------------------------
// verifyHandshakeToken() — token extraction from Authorization header
// ---------------------------------------------------------------------------

describe('WsGuard.verifyHandshakeToken() — Authorization: Bearer header', () => {
  it('returns the decoded payload when the Authorization header uses Bearer scheme', () => {
    const jwtService = makeMockJwtService(() => SAMPLE_PAYLOAD);
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeHeaders: { authorization: 'Bearer header.jwt.token' },
    });

    const result = guard.verifyHandshakeToken(client as unknown as Socket);

    expect(result).toEqual(SAMPLE_PAYLOAD);
  });

  it('strips the "Bearer " prefix before passing the token to jwtService.verify', () => {
    const jwtService = makeMockJwtService(() => SAMPLE_PAYLOAD);
    const guard = new WsGuard(jwtService);

    const rawToken = 'stripped.header.token';
    const client = makeMockSocket({
      handshakeHeaders: { authorization: `Bearer ${rawToken}` },
    });

    guard.verifyHandshakeToken(client as unknown as Socket);

    expect(jwtService.verify).toHaveBeenCalledWith(rawToken);
  });

  it('prefers Authorization header over handshake.auth.token when both are present', () => {
    // The ?? operator in extractToken() means headers.authorization wins when defined.
    const jwtService = makeMockJwtService(() => SAMPLE_PAYLOAD);
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeHeaders: { authorization: 'Bearer header-token' },
      handshakeAuth: { token: 'auth-token' },
    });

    guard.verifyHandshakeToken(client as unknown as Socket);

    // The header-derived token should be used (after stripping Bearer prefix)
    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
  });
});

// ---------------------------------------------------------------------------
// verifyHandshakeToken() — missing token
// ---------------------------------------------------------------------------

describe('WsGuard.verifyHandshakeToken() — no token present', () => {
  it('returns null when neither header nor auth object contains a token', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeHeaders: {},
      handshakeAuth: {},
    });

    const result = guard.verifyHandshakeToken(client as unknown as Socket);

    expect(result).toBeNull();
  });

  it('does not call jwtService.verify when no token is found', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeHeaders: {},
      handshakeAuth: {},
    });

    guard.verifyHandshakeToken(client as unknown as Socket);

    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('returns null when handshake.auth.token is a non-string value (number)', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeHeaders: {},
      handshakeAuth: { token: 12345 },
    });

    const result = guard.verifyHandshakeToken(client as unknown as Socket);

    expect(result).toBeNull();
  });

  it('returns null when handshake.auth.token is an object', () => {
    const jwtService = makeMockJwtService();
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeHeaders: {},
      handshakeAuth: { token: { nested: 'object' } },
    });

    const result = guard.verifyHandshakeToken(client as unknown as Socket);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// verifyHandshakeToken() — expired / malformed token (jwtService.verify throws)
// ---------------------------------------------------------------------------

describe('WsGuard.verifyHandshakeToken() — expired or malformed token', () => {
  it('returns null when jwtService.verify throws (expired token)', () => {
    const jwtService = makeMockJwtService(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeAuth: { token: 'expired.token.here' },
    });

    const result = guard.verifyHandshakeToken(client as unknown as Socket);

    expect(result).toBeNull();
  });

  it('returns null when jwtService.verify throws (malformed token)', () => {
    const jwtService = makeMockJwtService(() => {
      const err = new Error('jwt malformed');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeAuth: { token: 'not-a-valid-jwt' },
    });

    const result = guard.verifyHandshakeToken(client as unknown as Socket);

    expect(result).toBeNull();
  });

  it('returns null when jwtService.verify throws (invalid signature)', () => {
    const jwtService = makeMockJwtService(() => {
      const err = new Error('invalid signature');
      err.name = 'JsonWebTokenError';
      throw err;
    });
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeHeaders: { authorization: 'Bearer tampered.token.here' },
    });

    const result = guard.verifyHandshakeToken(client as unknown as Socket);

    expect(result).toBeNull();
  });

  it('does not re-throw errors from jwtService.verify', () => {
    const jwtService = makeMockJwtService(() => {
      throw new Error('unexpected internal error');
    });
    const guard = new WsGuard(jwtService);

    const client = makeMockSocket({
      handshakeAuth: { token: 'some.token' },
    });

    expect(() =>
      guard.verifyHandshakeToken(client as unknown as Socket),
    ).not.toThrow();
  });
});
