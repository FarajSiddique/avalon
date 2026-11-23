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
  kickSeat,
  leaveRoom,
  nextExpiryCheck,
  pickNextHost,
  setReady,
  withPresence,
  type RoomDeps,
} from "./state";

function fixedDeps(start = 1000) {
  const clock = { now: start };
  let n = 0;
  const deps: RoomDeps = {
    now: () => clock.now,
    newId: () => `p${(n += 1)}`,
    newSecret: () => `secret-${n + 1}`,
  };

  return { deps, clock };
}

function errorCode(run: () => void): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof RoomError) {
      return error.code;
    }

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

    // The point is a JSON round trip, not a deep copy.
    // oxlint-disable-next-line unicorn/prefer-structured-clone -- proves the state survives JSON
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe("room expiry", () => {
  it("tracks when the room became empty", () => {
    const { deps, clock } = fixedDeps();
    const { state } = createRoom("BCDF", "Wren", deps);

    expect(state.emptySince).toBe(1000);

    const occupied = withPresence(state, true, clock.now);

    expect(occupied.emptySince).toBeNull();
    expect(withPresence(occupied, true, clock.now)).toBe(occupied);

    clock.now += 500;
    const empty = withPresence(occupied, false, clock.now);

    expect(empty.emptySince).toBe(1500);
    expect(withPresence(empty, false, clock.now + 99)).toBe(empty);
  });

  it("expires an empty room after the idle time, and keeps the seat until then", () => {
    const { deps } = fixedDeps();
    const { state, token, player } = createRoom("BCDF", "Wren", deps);

    expect(nextExpiryCheck(state, 1000)).toBe(1000 + EMPTY_ROOM_TTL_MS);
    expect(nextExpiryCheck(state, 1000 + EMPTY_ROOM_TTL_MS - 1)).not.toBe(
      "expired",
    );
    expect(findSeat(state, token)).toBe(player);
    expect(nextExpiryCheck(state, 1000 + EMPTY_ROOM_TTL_MS)).toBe("expired");
  });

  it("keeps an occupied room until the age cap", () => {
    const { deps } = fixedDeps();
    const occupied = withPresence(
      createRoom("BCDF", "Wren", deps).state,
      true,
      1000,
    );

    expect(nextExpiryCheck(occupied, 2000)).toBe(1000 + ROOM_MAX_AGE_MS);
    expect(nextExpiryCheck(occupied, 1000 + ROOM_MAX_AGE_MS)).toBe("expired");
  });
});

function table() {
  const { deps } = fixedDeps();
  const host = createRoom("BCDF", "Wren", deps);
  const ansel = joinRoom(host.state, "Ansel", deps);
  const mira = joinRoom(ansel.state, "Mira", deps);

  return { deps, state: mira.state, host, ansel, mira };
}

const readyOf = (state: { players: Array<{ id: string; ready: boolean }> }) =>
  Object.fromEntries(state.players.map((p) => [p.id, p.ready]));

describe("ready (issue 16)", () => {
  it("changes only the caller's own seat", () => {
    const { state, host, ansel, mira } = table();
    const next = setReady(state, ansel.player.id, true);

    expect(readyOf(next)).toEqual({
      [host.player.id]: false,
      [ansel.player.id]: true,
      [mira.player.id]: false,
    });
  });

  it("can be taken back, and repeating it changes nothing", () => {
    const { state, ansel } = table();
    const on = setReady(state, ansel.player.id, true);

    expect(setReady(on, ansel.player.id, true)).toBe(on);
    expect(readyOf(setReady(on, ansel.player.id, false))[ansel.player.id]).toBe(
      false,
    );
  });

  it("stays when someone else joins", () => {
    const { deps, state, ansel } = table();
    const on = setReady(state, ansel.player.id, true);
    const joined = joinRoom(on, "Tobias", deps);

    expect(readyOf(joined.state)[ansel.player.id]).toBe(true);
    expect(joined.player.ready).toBe(false);
  });

  it("is refused for the host: pressing Start is the host's ready", () => {
    const { state, host } = table();

    expect(errorCode(() => setReady(state, host.player.id, true))).toBe(
      "NOT_ALLOWED",
    );
  });

  it("is refused for a seat that is not in the room", () => {
    const { state } = table();

    expect(errorCode(() => setReady(state, "nobody", true))).toBe(
      "NOT_IN_ROOM",
    );
  });
});

/** A lobby of the given names, in seat order. The first is host. */
function lobby(names: Array<string>) {
  const { deps } = fixedDeps();
  const [first = "Wren", ...rest] = names;
  const created = createRoom("BCDF", first, deps);
  let state = created.state;
  const tokens = [created.token];

  for (const name of rest) {
    const joined = joinRoom(state, name, deps);

    state = joined.state;
    tokens.push(joined.token);
  }

  const id = (name: string): string =>
    state.players.find((p) => p.name === name)?.id ?? "missing";

  return { state, tokens, id, deps };
}

describe("kick", () => {
  it("removes the seat, connected or away, and keeps everyone else as is", () => {
    const { state, id } = lobby(["Wren", "Ansel", "Mira"]);
    const kicked = kickSeat(state, id("Wren"), id("Ansel"));

    expect(kicked.players.map((p) => p.name)).toEqual(["Wren", "Mira"]);
    expect(kicked.hostId).toBe(id("Wren"));
    expect(kicked.players[1]).toBe(state.players[2]);
  });

  it("remembers nothing: the token dies and the name is free again", () => {
    const { state, tokens, id, deps } = lobby(["Wren", "Ansel"]);
    const kicked = kickSeat(state, id("Wren"), id("Ansel"));

    expect(errorCode(() => findSeat(kicked, tokens[1] ?? ""))).toBe(
      "SESSION_INVALID",
    );

    const back = joinRoom(kicked, "ansel", deps);

    expect(back.player.id).not.toBe(id("Ansel"));
    expect(back.player.ready).toBe(false);
    expect(back.state.players.at(-1)).toBe(back.player);
  });

  it.each([
    ["a guest kicks", "Ansel", "Mira", "NOT_HOST"],
    ["the host kicks themselves", "Wren", "Wren", "NOT_ALLOWED"],
    ["the target is gone", "Wren", "nobody", "NOT_IN_ROOM"],
    ["the kicker is gone", "nobody", "Ansel", "NOT_IN_ROOM"],
  ])("is refused when %s", (_, by, target, code) => {
    const { state, id } = lobby(["Wren", "Ansel", "Mira"]);

    expect(errorCode(() => kickSeat(state, id(by), id(target)))).toBe(code);
  });
});

describe("leave", () => {
  it("removes a guest and keeps the host", () => {
    const { state, id } = lobby(["Wren", "Ansel", "Mira"]);
    const left = leaveRoom(state, id("Ansel"), new Set());

    expect(left?.players.map((p) => p.name)).toEqual(["Wren", "Mira"]);
    expect(left?.hostId).toBe(id("Wren"));
  });

  it("hands host over at once when the host leaves", () => {
    const { state, id } = lobby(["Wren", "Ansel", "Mira"]);
    const left = leaveRoom(state, id("Wren"), new Set([id("Mira")]));

    expect(left?.hostId).toBe(id("Mira"));
    expect(left?.players.map((p) => p.name)).toEqual(["Ansel", "Mira"]);
  });

  it("ends the room when the last seat leaves", () => {
    const { state, id } = lobby(["Wren"]);

    expect(leaveRoom(state, id("Wren"), new Set([id("Wren")]))).toBeNull();
  });

  it("is refused for a seat that is not in the room", () => {
    const { state } = lobby(["Wren", "Ansel"]);

    expect(errorCode(() => leaveRoom(state, "nobody", new Set()))).toBe(
      "NOT_IN_ROOM",
    );
  });
});

describe("next host", () => {
  const { state, id } = lobby(["A", "B", "C", "D"]);

  it.each([
    ["the next connected seat after the host", "B", ["C", "D"], "C"],
    ["wrapping round to the start", "C", ["A", "B"], "A"],
    ["skipping the old host even if connected", "A", ["A", "D"], "D"],
    ["the next seat when everyone else is away", "C", ["C"], "D"],
  ])("is %s", (_, from, connected, expected) => {
    expect(
      pickNextHost(state.players, id(from), new Set(connected.map(id))),
    ).toBe(id(expected));
  });

  it("is refused for a seat that is not in the room", () => {
    expect(
      errorCode(() => pickNextHost(state.players, "nobody", new Set())),
    ).toBe("NOT_IN_ROOM");
  });

  it("is nobody when the host is the only seat", () => {
    const solo = lobby(["A"]);

    expect(
      pickNextHost(solo.state.players, solo.id("A"), new Set()),
    ).toBeNull();
  });
});
