import { describe, expect, it } from "vitest";
import type { OptionalRole } from "./roles";
import { evilRoleCount, settingsHints, tooManyEvilRoles } from "./settings";
import type { GameSettings } from "./views";

function settings(
  optionalRoles: Array<OptionalRole>,
  ladyOfTheLake = false,
): GameSettings {
  return { optionalRoles, ladyOfTheLake };
}

describe("evilRoleCount", () => {
  it("counts the Assassin plus the Evil optional roles, not Percival", () => {
    expect(evilRoleCount(settings([]))).toBe(1);
    expect(evilRoleCount(settings(["percival"]))).toBe(1);
    expect(evilRoleCount(settings(["percival", "morgana", "mordred"]))).toBe(3);
    expect(evilRoleCount(settings(["morgana", "mordred", "oberon"]))).toBe(4);
  });
});

describe("tooManyEvilRoles", () => {
  it("allows one Evil optional role at 5 and 6 seats", () => {
    for (const count of [5, 6]) {
      expect(tooManyEvilRoles(count, settings(["morgana"]))).toBeNull();
      expect(tooManyEvilRoles(count, settings(["morgana", "oberon"]))).toEqual({
        kind: "too_many_evil_roles",
        allowed: 2,
      });
    }
  });

  it("allows two at 7 to 9 seats and all three at 10", () => {
    const all = settings(["morgana", "mordred", "oberon"]);

    for (const count of [7, 8, 9]) {
      expect(tooManyEvilRoles(count, settings(["morgana", "mordred"]))).toBe(
        null,
      );
      expect(tooManyEvilRoles(count, all)).toEqual({
        kind: "too_many_evil_roles",
        allowed: 3,
      });
    }

    expect(tooManyEvilRoles(10, all)).toBeNull();
  });

  it("says nothing below 5 seats, where there is no Evil count yet", () => {
    const all = settings(["morgana", "mordred", "oberon"]);

    for (const count of [0, 1, 4]) {
      expect(tooManyEvilRoles(count, all)).toBeNull();
    }
  });

  it("turns a fitting mix into a blocker when a seat goes", () => {
    const two = settings(["morgana", "mordred"]);

    expect(tooManyEvilRoles(7, two)).toBeNull();
    expect(tooManyEvilRoles(6, two)).toEqual({
      kind: "too_many_evil_roles",
      allowed: 2,
    });
  });
});

describe("settingsHints", () => {
  it("is empty for the plain game and for Percival with Morgana", () => {
    expect(settingsHints(5, settings([]))).toEqual([]);
    expect(settingsHints(5, settings(["percival", "morgana"]))).toEqual([]);
  });

  it("points out a lone Percival or a lone Morgana", () => {
    expect(settingsHints(8, settings(["percival"]))).toEqual([
      { kind: "percival_without_morgana" },
    ]);
    expect(settingsHints(8, settings(["morgana", "mordred"]))).toEqual([
      { kind: "morgana_without_percival" },
    ]);
  });

  it("points out the Lady of the Lake below 7 seats only", () => {
    expect(settingsHints(6, settings([], true))).toEqual([
      { kind: "lady_few_players", bestFrom: 7 },
    ]);
    expect(settingsHints(3, settings([], true))).toHaveLength(1);
    expect(settingsHints(7, settings([], true))).toEqual([]);
    expect(settingsHints(6, settings([], false))).toEqual([]);
  });
});
