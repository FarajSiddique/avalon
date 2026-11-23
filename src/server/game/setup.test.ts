import { describe, expect, it } from "vitest";
import { settingsBlockers } from "./setup";

describe("settingsBlockers", () => {
  it("is empty when the settings fit the seats", () => {
    expect(
      settingsBlockers(5, { optionalRoles: ["percival"], ladyOfTheLake: true }),
    ).toEqual([]);
  });

  it("blocks too many Evil roles for the seats", () => {
    expect(
      settingsBlockers(6, {
        optionalRoles: ["morgana", "mordred"],
        ladyOfTheLake: false,
      }),
    ).toEqual([{ kind: "too_many_evil_roles", allowed: 2 }]);
  });

  it("never blocks on a settings hint", () => {
    expect(
      settingsBlockers(5, { optionalRoles: ["morgana"], ladyOfTheLake: true }),
    ).toEqual([]);
  });
});
