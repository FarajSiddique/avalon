/**
 * Integration tests for RoomController
 *
 * Uses NestJS Test.createTestingModule() + supertest to test the full
 * HTTP request/response pipeline including routing, pipes, and guards.
 *
 * ThrottlerGuard is overridden with a no-op guard so rate-limit logic
 * does not interfere with unit-level assertions.
 *
 * JwtService is provided as a real service backed by a static secret so
 * returned tokens are real, verifiable JWTs — the tests for POST /rooms
 * and POST /rooms/:code/join assert on the token being a non-empty string
 * rather than decoding it (that is JwtService's concern, not the controller's).
 */

import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import { RoomController } from './room.controller';
import { RoomService, LobbyException } from './room.service';

// ---------------------------------------------------------------------------
// No-op guard — bypasses ThrottlerGuard for all tests
// ---------------------------------------------------------------------------

class NoOpThrottlerGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Test module factory
// ---------------------------------------------------------------------------

async function createTestApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
      JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '4h' } }),
    ],
    controllers: [RoomController],
    providers: [RoomService],
  })
    .overrideGuard(ThrottlerGuard)
    .useClass(NoOpThrottlerGuard)
    .compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  return app;
}

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// POST /rooms
// ---------------------------------------------------------------------------

describe('POST /rooms', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 with a { code } property', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({ playerName: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('code');
  });

  it('returns a 6-character code', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({ playerName: 'Alice' });
    expect(res.body.code).toHaveLength(6);
  });

  it('returned code contains only valid characters (no O, 0, 1, I)', async () => {
    const requests = Array.from({ length: 5 }, () =>
      request(app.getHttpServer()).post('/rooms').send({ playerName: 'Alice' }),
    );
    const results = await Promise.all(requests);
    const VALID = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
    const FORBIDDEN = /[O01I]/;
    for (const res of results) {
      expect(res.body.code).toMatch(VALID);
      expect(res.body.code).not.toMatch(FORBIDDEN);
    }
  });

  it('each call returns a distinct code', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post('/rooms')
          .send({ playerName: `Player${i}` }),
      ),
    );
    const codes = results.map((r) => r.body.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(5);
  });

  // -------------------------------------------------------------------------
  // JWT token tests (new for ephemeral JWT authentication feature)
  // -------------------------------------------------------------------------

  it('returns a non-empty token string alongside the room code', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({ playerName: 'TokenHolder' });
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('returned token has three dot-separated JWT segments', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({ playerName: 'JwtShape' });
    const parts = (res.body.token as string).split('.');
    expect(parts).toHaveLength(3);
    // Each segment must be non-empty base64url
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it('returns 400 when playerName is missing from the body', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({});
    expect(res.status).toBe(400);
  });

  it('does NOT create a room when playerName is missing (ValidationPipe short-circuits)', async () => {
    // Build a fresh isolated module so we can assert on the mock
    const mockCreateRoom = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '4h' } }),
      ],
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            createRoom: mockCreateRoom,
            addPlayer: jest.fn(),
            getRoom: jest.fn(),
            toSnapshot: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(NoOpThrottlerGuard)
      .compile();

    const isolatedApp = module.createNestApplication();
    isolatedApp.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await isolatedApp.init();

    await request(isolatedApp.getHttpServer()).post('/rooms').send({});

    expect(mockCreateRoom).not.toHaveBeenCalled();

    await isolatedApp.close();
  });

  it('returns 400 when playerName is an empty string', async () => {
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({ playerName: '' });
    expect(res.status).toBe(400);
  });

  it('propagates LobbyException thrown by addPlayer', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '4h' } }),
      ],
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            createRoom: jest.fn().mockReturnValue('ROOM99'),
            addPlayer: jest.fn().mockImplementation(() => {
              throw new LobbyException('ROOM_FULL', 'Room is full');
            }),
            getRoom: jest.fn(),
            toSnapshot: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(NoOpThrottlerGuard)
      .compile();

    const localApp = module.createNestApplication();
    localApp.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await localApp.init();

    // The exception should surface as a 5xx (unhandled) or propagate —
    // either way the response must NOT be 201
    const res = await request(localApp.getHttpServer())
      .post('/rooms')
      .send({ playerName: 'Alice' });
    expect(res.status).not.toBe(201);

    await localApp.close();
  });
});

// ---------------------------------------------------------------------------
// POST /rooms/:code/join
// ---------------------------------------------------------------------------

describe('POST /rooms/:code/join', () => {
  let app: INestApplication;
  let existingCode: string;

  beforeAll(async () => {
    app = await createTestApp();
    // Create a room via POST /rooms so we have a valid code to join
    const res = await request(app.getHttpServer())
      .post('/rooms')
      .send({ playerName: 'Host' });
    existingCode = res.body.code as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 with a { token } property on successful join', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${existingCode}/join`)
      .send({ playerName: 'Joiner' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  it('returned token is a non-empty string', async () => {
    // Use a fresh room so the name is unique
    const createRes = await request(app.getHttpServer())
      .post('/rooms')
      .send({ playerName: 'HostForJoin' });
    const code = createRes.body.code as string;

    const res = await request(app.getHttpServer())
      .post(`/rooms/${code}/join`)
      .send({ playerName: 'Newcomer' });

    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('returned token has three dot-separated JWT segments', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/rooms')
      .send({ playerName: 'HostJwtJoin' });
    const code = createRes.body.code as string;

    const res = await request(app.getHttpServer())
      .post(`/rooms/${code}/join`)
      .send({ playerName: 'JwtJoiner' });

    const parts = (res.body.token as string).split('.');
    expect(parts).toHaveLength(3);
  });

  it('uppercases the room code before passing it to addPlayer', async () => {
    const mockAddPlayer = jest.fn().mockReturnValue({
      id: 'player-uuid',
      name: 'UpperCaseChecker',
      isHost: false,
      status: 'not_ready',
      joinedAt: Date.now(),
      socketId: 'placeholder',
    });

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '4h' } }),
      ],
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            createRoom: jest.fn(),
            addPlayer: mockAddPlayer,
            getRoom: jest.fn(),
            toSnapshot: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(NoOpThrottlerGuard)
      .compile();

    const localApp = module.createNestApplication();
    localApp.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await localApp.init();

    // Send the code in lowercase — controller must upper-case it
    await request(localApp.getHttpServer())
      .post('/rooms/abcd12/join')
      .send({ playerName: 'UpperCaseChecker' });

    // First argument to addPlayer should be the uppercased code
    expect(mockAddPlayer).toHaveBeenCalledWith(
      'ABCD12',
      expect.any(String),
      'UpperCaseChecker',
    );

    await localApp.close();
  });

  it('propagates LobbyException with code ROOM_NOT_FOUND when room does not exist', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '4h' } }),
      ],
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            createRoom: jest.fn(),
            addPlayer: jest.fn().mockImplementation(() => {
              throw new LobbyException('ROOM_NOT_FOUND', 'Room "ZZZZZZ" does not exist');
            }),
            getRoom: jest.fn(),
            toSnapshot: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(NoOpThrottlerGuard)
      .compile();

    const localApp = module.createNestApplication();
    localApp.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await localApp.init();

    const res = await request(localApp.getHttpServer())
      .post('/rooms/ZZZZZZ/join')
      .send({ playerName: 'Ghost' });

    expect(res.status).not.toBe(201);

    await localApp.close();
  });

  it('propagates LobbyException with code ROOM_FULL when room has 10 players', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '4h' } }),
      ],
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            createRoom: jest.fn(),
            addPlayer: jest.fn().mockImplementation(() => {
              throw new LobbyException('ROOM_FULL', 'Room is full (10 players)');
            }),
            getRoom: jest.fn(),
            toSnapshot: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(NoOpThrottlerGuard)
      .compile();

    const localApp = module.createNestApplication();
    localApp.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await localApp.init();

    const res = await request(localApp.getHttpServer())
      .post('/rooms/ABCD12/join')
      .send({ playerName: 'Overflow' });

    expect(res.status).not.toBe(201);

    await localApp.close();
  });

  it('propagates LobbyException with code NAME_TAKEN when playerName is already used', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '4h' } }),
      ],
      controllers: [RoomController],
      providers: [
        {
          provide: RoomService,
          useValue: {
            createRoom: jest.fn(),
            addPlayer: jest.fn().mockImplementation(() => {
              throw new LobbyException('NAME_TAKEN', 'The name "Alice" is already taken');
            }),
            getRoom: jest.fn(),
            toSnapshot: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useClass(NoOpThrottlerGuard)
      .compile();

    const localApp = module.createNestApplication();
    localApp.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await localApp.init();

    const res = await request(localApp.getHttpServer())
      .post('/rooms/ABCD12/join')
      .send({ playerName: 'Alice' });

    expect(res.status).not.toBe(201);

    await localApp.close();
  });

  it('returns 400 when playerName is missing from join body', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rooms/${existingCode}/join`)
      .send({});
    expect(res.status).toBe(400);
  });
});
