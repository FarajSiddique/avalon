import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR } from "./avatar";
import { hostChangeNotice } from "./copy";
import type { GameView, LobbyView, RoomView, SeatView } from "./views";

const NAMES = ["Wren", "Sam", "Ansel"] as const;

function seats(host: string): Array<SeatView> {
  return NAMES.map((name) => ({
    id: name.toLowerCase(),
    name,
    isHost: name === host,
    connected: true,
    ready: false,
    avatar: DEFAULT_AVATAR,
  }));
}

function lobby(host: string, viewer: string): LobbyView {
  return {
    stage: "lobby",
    code: "BCDF",
    players: seats(host),
    settings: { optionalRoles: [], ladyOfTheLake: false },
    you: { id: viewer.toLowerCase(), isHost: host === viewer },
    startBlockers: [],
  };
}

/** Only the fields the notice reads matter; the rest is a plain game. */
function game(host: string, viewer: string): GameView {
  return {
    stage: "game",
    code: "BCDF",
    players: seats(host),
    settings: { optionalRoles: [], ladyOfTheLake: false },
    you: {
      id: viewer.toLowerCase(),
      isHost: host === viewer,
      role: "servant",
      alignment: "good",
      knowledge: { kind: "none" },
      ladyResults: [],
    },
    quests: [],
    questIndex: 0,
    leaderId: "wren",
    rejections: 0,
    score: { good: 0, evil: 0 },
    phase: { name: "role_reveal", confirmedIds: [], youConfirmed: false },
    proposals: [],
    ladyHolderId: null,
  };
}

describe("hostChangeNotice", () => {
  const cases: Array<[string, RoomView | null, RoomView, string | null]> = [
    ["no earlier view", null, lobby("Wren", "Sam"), null],
    ["the same host", lobby("Wren", "Sam"), lobby("Wren", "Sam"), null],
    [
      "you became host",
      lobby("Wren", "Sam"),
      lobby("Sam", "Sam"),
      "You are now the host",
    ],
    [
      "someone else became host",
      lobby("Wren", "Ansel"),
      lobby("Sam", "Ansel"),
      "Sam is now the host",
    ],
    [
      "the old host sees the new one",
      lobby("Wren", "Wren"),
      lobby("Sam", "Wren"),
      "Sam is now the host",
    ],
    [
      "from the lobby into a game",
      lobby("Wren", "Ansel"),
      game("Sam", "Ansel"),
      "Sam is now the host",
    ],
  ];

  it.each(cases)("%s", (_label, before, after, expected) => {
    expect(hostChangeNotice(before, after)).toBe(expected);
  });
});
