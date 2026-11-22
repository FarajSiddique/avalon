import { describe, expect, it } from "vitest";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  NAME_PATTERN,
  QUEST_TEAM_SIZES,
  TEAM_BALANCE,
  failsRequired,
  isPlayerCount,
  normalizeName,
  normalizeRoomCode,
} from "./constants";

describe("game tables", () => {
  it("has a balance row for every player count that adds up", () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      expect(isPlayerCount(n)).toBe(true);

      if (!isPlayerCount(n)) {
        continue;
      }

      const { good, evil } = TEAM_BALANCE[n];

      expect(good + evil).toBe(n);
      expect(good).toBeGreaterThan(evil);
      expect(QUEST_TEAM_SIZES[n]).toHaveLength(5);
    }

    expect(isPlayerCount(4)).toBe(false);
    expect(isPlayerCount(11)).toBe(false);
  });

  it("matches the rulebook team sizes", () => {
    expect(QUEST_TEAM_SIZES[5]).toEqual([2, 3, 2, 3, 3]);
    expect(QUEST_TEAM_SIZES[6]).toEqual([2, 3, 4, 3, 4]);
    expect(QUEST_TEAM_SIZES[7]).toEqual([2, 3, 3, 4, 4]);
    expect(QUEST_TEAM_SIZES[10]).toEqual([3, 4, 4, 5, 5]);
  });

  it("needs two fails only on quest 4 with 7 or more players", () => {
    expect(failsRequired(7, 3)).toBe(2);
    expect(failsRequired(10, 3)).toBe(2);
    expect(failsRequired(6, 3)).toBe(1);
    expect(failsRequired(7, 2)).toBe(1);
    expect(failsRequired(7, 4)).toBe(1);
  });
});

describe("input cleanup", () => {
  it("normalizes names and accepts letters in any script", () => {
    expect(normalizeName("  Sir   Kay ")).toBe("Sir Kay");

    for (const ok of ["Wren", "José", "李雷", "Anne-Marie", "O'Neil", "A"]) {
      expect(NAME_PATTERN.test(ok)).toBe(true);
    }

    for (const bad of ["", " ", "-dash", "tab\tname", "<b>", "trail-"]) {
      expect(NAME_PATTERN.test(bad)).toBe(false);
    }
  });

  it("normalizes typed room codes", () => {
    expect(normalizeRoomCode(" bc-dq ")).toBe("BCDQ");
  });
});
