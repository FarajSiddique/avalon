import { describe, expect, it } from "vitest";
import { projectView } from "./project-view";
import { createRoom, joinRoom, setReady, type RoomDeps } from "./state";

let n = 0;
const deps: RoomDeps = {
  now: () => 1000,
  newId: () => `p${(n += 1)}`,
  newSecret: () => `secret-${n + 1}`,
};

describe("projectView (lobby)", () => {
  it("tells each viewer who they are and never includes seat secrets", () => {
    const host = createRoom("BCDF", "Wren", deps);
    const guest = joinRoom(host.state, "Ansel", deps);
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
      },
      {
        id: guest.player.id,
        name: "Ansel",
        isHost: false,
        connected: false,
        ready: false,
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
    const host = createRoom("BCDF", "Wren", deps);

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
    const host = createRoom("BCDF", "Wren", deps);
    let state = host.state;
    const guests = ["Ansel", "Mira", "Tobias", "Isolde"].map((name) => {
      const seated = joinRoom(state, name, deps);

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
});
