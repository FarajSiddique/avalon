import { describe, expect, it } from "vitest";
import { RoomStore } from "@/server/rooms/room-store";
import { projectView } from "./project-view";

describe("projectView (lobby)", () => {
  it("tells each viewer who they are and never includes seat secrets", () => {
    const store = new RoomStore();
    const host = store.createRoom("Wren");
    const guest = store.joinRoom(host.room.code, "Ansel");
    store.attachSocket(host, "s1");

    const hostView = projectView(host.room, host.player.id);
    const guestView = projectView(host.room, guest.player.id);

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
    expect(wire).not.toContain("socketIds");
  });

  it("lists why the game cannot start yet", () => {
    const store = new RoomStore();
    const host = store.createRoom("Wren");
    store.attachSocket(host, "s1");

    const view = projectView(host.room, host.player.id);

    expect(view.stage).toBe("lobby");
    if (view.stage !== "lobby") return;
    expect(view.startBlockers).toEqual([
      { kind: "too_few_players", needed: 4 },
      { kind: "not_ready", playerIds: [host.player.id] },
    ]);
  });
});
