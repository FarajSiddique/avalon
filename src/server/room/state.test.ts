import { describe, expect, it } from "vitest";
import {
  EMPTY_ROOM_TTL_MS,
  MAX_PLAYERS,
  ROOM_MAX_AGE_MS,
} from "@/shared/constants";
import { randomRoomCode } from "./code";
import {
  RoomError,
  createRoom,
  findSeat,
  joinRoom,
  nextExpiryCheck,
  withPresence,
  type RoomDeps,
} from "./state";

function fixedDeps(start = 1_000) {
  const clock = { now: start };
  let n = 0;
  const deps: RoomDeps = {
    now: () => clock.now,
    newId: () => `p${(n += 1)}`,
    newSecret: () => `secret-${n + 1}`,
  };
  return { deps, clock };
}

function errorCode(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof RoomError) return error.code;
    throw error;
  }
  return undefined;
}

describe("room codes", () => {
  it("are four letters from the safe alphabet", () => {
    const rolls = [0, 1, 2, 18];
    expect(randomRoomCode(() => rolls.shift() ?? 0)).toBe("BCDZ");
  });
});

describe("room state", () => {
  it("creates a room with the creator as host", () => {
    const { deps } = fixedDeps();
    const { state, player, token } = createRoom("BCDF", "Wren", deps);

    expect(state.hostId).toBe(player.id);
    expect(state.players).toEqual([player]);
    expect(state.game).toBeNull();
    expect(token.startsWith("BCDF.")).toBe(true);
  });

  it("seats joiners in order without changing the old state", () => {
    const { deps } = fixedDeps();
    const created = createRoom("BCDF", "Wren", deps);
    const joined = joinRoom(created.state, "Ansel", deps);

    expect(joined.state.players.map((p) => p.name)).toEqual(["Wren", "Ansel"]);
    expect(created.state.players).toHaveLength(1);
  });

  it("rejects a taken name and a full room", () => {
    const { deps } = fixedDeps();
    let state = createRoom("BCDF", "P1", deps).state;
    expect(errorCode(() => joinRoom(state, "p1", deps))).toBe("NAME_TAKEN");

    for (let i = 2; i <= MAX_PLAYERS; i += 1) {
      state = joinRoom(state, `P${i}`, deps).state;
    }
    expect(errorCode(() => joinRoom(state, "Late", deps))).toBe("ROOM_FULL");
  });

  it("finds a seat only with the right token for this room", () => {
    const { deps } = fixedDeps();
    const host = createRoom("BCDF", "Wren", deps);
    const guest = joinRoom(host.state, "Ansel", deps);

    expect(findSeat(guest.state, guest.token)).toBe(guest.player);
    expect(findSeat(guest.state, host.token).id).toBe(host.player.id);
    for (const bad of ["BCDF.wrong", "no-dot", "ZZZZ.secret-1", ""]) {
      expect(errorCode(() => findSeat(guest.state, bad))).toBe(
        "SESSION_INVALID",
      );
    }
  });

  it("stores a hash of the seat secret, never the secret", () => {
    const { deps } = fixedDeps();
    const { state, token } = createRoom("BCDF", "Wren", deps);
    const secret = token.slice(token.indexOf(".") + 1);

    expect(JSON.stringify(state)).not.toContain(secret);
    expect(state.players[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is plain JSON, so it survives storage unchanged", () => {
    const { deps } = fixedDeps();
    const { state } = joinRoom(
      createRoom("BCDF", "Wren", deps).state,
      "Ansel",
      deps,
    );

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("room expiry", () => {
  it("tracks when the room became empty", () => {
    const { deps, clock } = fixedDeps();
    const { state } = createRoom("BCDF", "Wren", deps);
    expect(state.emptySince).toBe(1_000);

    const occupied = withPresence(state, true, clock.now);
    expect(occupied.emptySince).toBeNull();
    expect(withPresence(occupied, true, clock.now)).toBe(occupied);

    clock.now += 500;
    const empty = withPresence(occupied, false, clock.now);
    expect(empty.emptySince).toBe(1_500);
    expect(withPresence(empty, false, clock.now + 99)).toBe(empty);
  });

  it("expires an empty room after the idle time, and keeps the seat until then", () => {
    const { deps } = fixedDeps();
    const { state, token, player } = createRoom("BCDF", "Wren", deps);

    expect(nextExpiryCheck(state, 1_000)).toBe(1_000 + EMPTY_ROOM_TTL_MS);
    expect(nextExpiryCheck(state, 1_000 + EMPTY_ROOM_TTL_MS - 1)).not.toBe(
      "expired",
    );
    expect(findSeat(state, token)).toBe(player);
    expect(nextExpiryCheck(state, 1_000 + EMPTY_ROOM_TTL_MS)).toBe("expired");
  });

  it("keeps an occupied room until the age cap", () => {
    const { deps } = fixedDeps();
    const occupied = withPresence(
      createRoom("BCDF", "Wren", deps).state,
      true,
      1_000,
    );

    expect(nextExpiryCheck(occupied, 2_000)).toBe(1_000 + ROOM_MAX_AGE_MS);
    expect(nextExpiryCheck(occupied, 1_000 + ROOM_MAX_AGE_MS)).toBe("expired");
  });
});
