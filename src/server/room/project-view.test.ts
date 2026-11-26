import { describe, expect, it } from "vitest";
import { avatarFor, type Avatar } from "@/shared/avatar";
import { projectView } from "./project-view";
import {
  createRoom,
  joinRoom,
  setAvatar,
  setReady,
  setSettings,
  type RoomDeps,
} from "./state";

let n = 0;
const deps: RoomDeps = {
  now: () => 1000,
  newId: () => `p${(n += 1)}`,
  newSecret: () => `secret-${n + 1}`,
};

describe("projectView (lobby)", () => {
  it("gives every viewer every seat's look, as a copy", () => {
    const look: Avatar = {
      body: "male",
      skin: "starborn",
      cloak: "moss",
      headwear: "helm",
      emblem: "key",
    };
    const host = createRoom("BCDF", "Wren", undefined, deps);
    const guest = joinRoom(host.state, "Ansel", look, deps);
    const state = setAvatar(guest.state, host.player.id, {
      ...look,
      cloak: "plum",
    });
    const connected = new Set([host.player.id, guest.player.id]);

    for (const viewer of [host.player.id, guest.player.id]) {
      const view = projectView(state, viewer, connected);

      expect(view.players.map((p) => p.avatar)).toEqual([
        { ...look, cloak: "plum" },
        look,
      ]);
      expect(view.players[1]?.avatar).not.toBe(state.players[1]?.avatar);
    }
  });

  it("tells each viewer who they are and never includes seat secrets", () => {
    const host = createRoom("BCDF", "Wren", undefined, deps);
    const guest = joinRoom(host.state, "Ansel", undefined, deps);
    const connected = new Set([host.player.id]);

    const hostView = projectView(guest.state, host.player.id, connected);
    const guestView = projectView(guest.state, guest.player.id, connected);

    expect(hostView.you).toEqual({ id: host.player.id, isHost: true });
    expect(guestView.you).toEqual({ id: guest.player.id, isHost: false });
    expect(hostView.players).toEqual([
      {
        id: host.player.id,
        name: "Wren",
        isHost: true,
        connected: true,
        ready: false,
        avatar: avatarFor(host.player.id),
      },
      {
        id: guest.player.id,
        name: "Ansel",
        isHost: false,
        connected: false,
        ready: false,
        avatar: avatarFor(guest.player.id),
      },
    ]);

    const wire = JSON.stringify([hostView, guestView]);

    for (const token of [host.token, guest.token]) {
      expect(wire).not.toContain(token.slice(token.indexOf(".") + 1));
    }

    expect(wire).not.toContain("tokenHash");
    expect(wire).not.toContain(guest.player.tokenHash);
  });

  it("lists why the game cannot start yet", () => {
    const host = createRoom("BCDF", "Wren", undefined, deps);

    const view = projectView(
      host.state,
      host.player.id,
      new Set([host.player.id]),
    );

    expect(view.stage).toBe("lobby");

    if (view.stage !== "lobby") {
      return;
    }

    expect(view.startBlockers).toEqual([
      { kind: "too_few_players", needed: 4 },
    ]);
  });

  it("waits on every seat but the host to ready up", () => {
    const host = createRoom("BCDF", "Wren", undefined, deps);
    let state = host.state;
    const guests = ["Ansel", "Mira", "Tobias", "Isolde"].map((name) => {
      const seated = joinRoom(state, name, undefined, deps);

      state = seated.state;

      return seated.player.id;
    });
    const everyone = new Set([host.player.id, ...guests]);

    const blockers = () => {
      const view = projectView(state, host.player.id, everyone);

      return view.stage === "lobby" ? view.startBlockers : [];
    };

    expect(blockers()).toEqual([{ kind: "not_ready", playerIds: guests }]);

    for (const id of guests) {
      state = setReady(state, id, true);
    }

    // The host never readied, and nothing stands in the way of Start.
    expect(state.players[0]?.ready).toBe(false);
    expect(blockers()).toEqual([]);

    // Being away still blocks, the host included.
    const view = projectView(state, host.player.id, new Set(guests));

    expect(view.stage === "lobby" && view.startBlockers).toEqual([
      { kind: "disconnected", playerIds: [host.player.id] },
    ]);
  });

  it("blocks too many Evil roles for the seats there are now", () => {
    const host = createRoom("BCDF", "Wren", undefined, deps);
    let state = setSettings(host.state, host.player.id, {
      optionalRoles: ["morgana", "mordred", "oberon"],
      ladyOfTheLake: true,
    });

    const blockers = () => {
      const everyone = new Set(state.players.map((p) => p.id));
      const view = projectView(state, host.player.id, everyone);

      return view.stage === "lobby" ? view.startBlockers : [];
    };

    // Below 5 seats there is no Evil count yet: only the seat count blocks.
    expect(blockers()).toEqual([{ kind: "too_few_players", needed: 4 }]);

    for (const name of ["Ansel", "Mira", "Tobias", "Isolde"]) {
      const seated = joinRoom(state, name, undefined, deps);

      state = setReady(seated.state, seated.player.id, true);
    }

    // Seat blockers first, then the settings.
    expect(blockers()).toEqual([{ kind: "too_many_evil_roles", allowed: 2 }]);

    state = setSettings(state, host.player.id, {
      optionalRoles: ["morgana"],
      ladyOfTheLake: true,
    });

    // A lone Morgana and the Lady at 5 seats are hints, never blockers.
    expect(blockers()).toEqual([]);
  });
});
