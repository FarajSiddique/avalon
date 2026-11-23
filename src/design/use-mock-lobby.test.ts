import { describe, expect, it } from "vitest";
import { openingView } from "./use-mock-lobby";

describe("the prototype lobby, by how you got there", () => {
  it("opens the usual lobby with you hosting", () => {
    const view = openingView({});

    expect(view.players).toHaveLength(7);
    expect(view.you.isHost).toBe(true);
  });

  it("creating a room: only you, hosting, and too few to start", () => {
    const view = openingView({ via: "create", name: "Faraj" });

    expect(view.players.map((p) => p.name)).toEqual(["Faraj"]);
    expect(view.you.isHost).toBe(true);
    expect(view.startBlockers).toContainEqual({
      kind: "too_few_players",
      needed: 4,
    });
  });

  it("joining: someone else hosts, you arrive last and not ready", () => {
    const view = openingView({ via: "join", name: "Faraj", code: "ROSE" });

    expect(view.code).toBe("ROSE");
    expect(view.you.isHost).toBe(false);
    const you = view.players.at(-1);

    expect(you?.id).toBe(view.you.id);
    expect(you).toMatchObject({ name: "Faraj", isHost: false, ready: false });
    expect(view.players.filter((p) => p.isHost)).toHaveLength(1);
  });

  it("never waits on the host to ready up", () => {
    for (const via of [undefined, "join"] as const) {
      const view = openingView({ via, name: "Faraj" });
      const host = view.players.find((p) => p.isHost);
      const waiting = view.startBlockers.flatMap((b) =>
        b.kind === "not_ready" ? b.playerIds : [],
      );

      expect(host?.ready).toBe(false);
      expect(waiting).not.toContain(host?.id);
    }
  });
});
