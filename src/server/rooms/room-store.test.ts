import { describe, expect, it } from "vitest";
import {
  EMPTY_ROOM_TTL_MS,
  MAX_PLAYERS,
  ROOM_CODE_PATTERN,
  ROOM_MAX_AGE_MS,
} from "@/shared/constants";
import { RoomError, RoomStore } from "./room-store";

function storeAt(start = 1_000) {
  const clock = { now: start };
  const store = new RoomStore({ now: () => clock.now });
  return { store, clock };
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

describe("RoomStore", () => {
  it("creates a room with the creator as host", () => {
    const { store } = storeAt();
    const { room, player, token } = store.createRoom("Wren");

    expect(room.code).toMatch(ROOM_CODE_PATTERN);
    expect(room.hostId).toBe(player.id);
    expect(room.players).toEqual([player]);
    expect(token.startsWith(`${room.code}.`)).toBe(true);
  });

  it("never reuses a code that is in use", () => {
    const rolls = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1];
    const store = new RoomStore({ randomInt: () => rolls.shift() ?? 2 });

    const first = store.createRoom("A").room.code;
    const second = store.createRoom("B").room.code;

    expect(first).toBe("BBBB");
    expect(second).toBe("CCCC");
  });

  it("seats joiners in order and rejects bad joins", () => {
    const { store } = storeAt();
    const { room } = store.createRoom("Wren");
    store.joinRoom(room.code, "Ansel");

    expect(room.players.map((p) => p.name)).toEqual(["Wren", "Ansel"]);
    expect(errorCode(() => store.joinRoom("ZZZZ", "Mira"))).toBe(
      "ROOM_NOT_FOUND",
    );
    expect(errorCode(() => store.joinRoom(room.code, "wren"))).toBe(
      "NAME_TAKEN",
    );
  });

  it("caps a room at the maximum player count", () => {
    const { store } = storeAt();
    const { room } = store.createRoom("P1");
    for (let i = 2; i <= MAX_PLAYERS; i += 1) {
      store.joinRoom(room.code, `P${i}`);
    }

    expect(errorCode(() => store.joinRoom(room.code, "Late"))).toBe(
      "ROOM_FULL",
    );
  });

  it("resumes a seat only with the right token", () => {
    const { store } = storeAt();
    const host = store.createRoom("Wren");
    const guest = store.joinRoom(host.room.code, "Ansel");

    expect(store.resume(guest.token).player).toBe(guest.player);
    expect(store.resume(host.token).player).toBe(host.player);
    expect(errorCode(() => store.resume(`${host.room.code}.wrong`))).toBe(
      "SESSION_INVALID",
    );
    expect(errorCode(() => store.resume("no-dot"))).toBe("SESSION_INVALID");
    expect(errorCode(() => store.resume("ZZZZ.anything"))).toBe(
      "SESSION_INVALID",
    );
  });

  it("does not keep the seat secret in memory", () => {
    const { store } = storeAt();
    const { player, token } = store.createRoom("Wren");
    const secret = token.slice(token.indexOf(".") + 1);

    expect(JSON.stringify(Object.values(player))).not.toContain(secret);
  });

  it("tracks connection per seat across several sockets", () => {
    const { store } = storeAt();
    const seat = store.createRoom("Wren");

    store.attachSocket(seat, "s1");
    store.attachSocket(seat, "s2");
    expect(seat.player.socketIds.size).toBe(2);

    store.detachSocket("s1");
    expect(seat.player.socketIds.size).toBe(1);
    expect(seat.room.emptySince).toBeNull();

    store.detachSocket("s2");
    expect(seat.player.socketIds.size).toBe(0);
    expect(seat.room.emptySince).toBe(1_000);
    expect(store.detachSocket("s2")).toBeNull();
  });

  it("moves a socket that takes a seat in another room", () => {
    const { store } = storeAt();
    const first = store.createRoom("Wren");
    const second = store.createRoom("Wren");

    store.attachSocket(first, "s1");
    const moved = store.attachSocket(second, "s1");

    expect(moved?.room).toBe(first.room);
    expect(first.player.socketIds.size).toBe(0);
    expect(store.seatOf("s1")?.room).toBe(second.room);
  });

  it("keeps a seat while its player is away, then expires the empty room", () => {
    const { store, clock } = storeAt();
    const seat = store.createRoom("Wren");
    store.attachSocket(seat, "s1");
    store.detachSocket("s1");

    clock.now += EMPTY_ROOM_TTL_MS - 1;
    expect(store.sweep()).toEqual([]);
    expect(store.resume(seat.token).player).toBe(seat.player);

    clock.now += 1;
    expect(store.sweep()).toEqual([seat.room.code]);
    expect(store.get(seat.room.code)).toBeUndefined();
  });

  it("does not expire a room while someone is connected, until the age cap", () => {
    const { store, clock } = storeAt();
    const seat = store.createRoom("Wren");
    store.attachSocket(seat, "s1");

    clock.now += ROOM_MAX_AGE_MS - 1;
    expect(store.sweep()).toEqual([]);

    clock.now += 1;
    expect(store.sweep()).toEqual([seat.room.code]);
    expect(store.seatOf("s1")).toBeUndefined();
  });
});
