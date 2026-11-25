import { describe, expect, it } from "vitest";
import {
  BODIES,
  CLOAKS,
  DEFAULT_AVATAR,
  EMBLEMS,
  HEADWEAR,
  SKINS,
  avatarFor,
  avatarKey,
  sanitizeAvatar,
  type Avatar,
} from "./avatar";

function isValid(look: Avatar): boolean {
  return (
    BODIES.includes(look.body) &&
    SKINS.includes(look.skin) &&
    CLOAKS.includes(look.cloak) &&
    HEADWEAR.includes(look.headwear) &&
    EMBLEMS.includes(look.emblem)
  );
}

describe("sanitizeAvatar", () => {
  it("gives an old saved look, with no body or skin, the defaults for both", () => {
    const look = sanitizeAvatar({
      cloak: "moss",
      headwear: "helm",
      emblem: "key",
    });

    expect(look).toEqual({
      body: DEFAULT_AVATAR.body,
      skin: DEFAULT_AVATAR.skin,
      cloak: "moss",
      headwear: "helm",
      emblem: "key",
    });
  });

  it("keeps a valid body and skin", () => {
    const look = sanitizeAvatar({ body: "male", skin: "starborn" });

    expect(look.body).toBe("male");
    expect(look.skin).toBe("starborn");
  });

  it("replaces unknown values with the defaults", () => {
    const look = sanitizeAvatar({
      body: "dragon",
      skin: "plaid",
      cloak: 7,
      headwear: null,
      emblem: "crown",
    });

    expect(look).toEqual(DEFAULT_AVATAR);
  });

  it("accepts anything at all", () => {
    expect(sanitizeAvatar(null)).toEqual(DEFAULT_AVATAR);
    expect(sanitizeAvatar("hood")).toEqual(DEFAULT_AVATAR);
    expect(sanitizeAvatar(undefined)).toEqual(DEFAULT_AVATAR);
  });
});

describe("avatarFor", () => {
  const ids = Array.from({ length: 50 }, (_, i) => `player-${i}`);

  it("is stable for an id", () => {
    expect(avatarFor("p-merlin")).toEqual(avatarFor("p-merlin"));
  });

  it("always gives a valid look", () => {
    for (const id of ["", "a", ...ids]) {
      expect(isValid(avatarFor(id))).toBe(true);
    }
  });

  it("across 50 ids, gives both bodies, at least 6 skins and 4 cloaks", () => {
    const looks = ids.map(avatarFor);

    expect(new Set(looks.map((l) => l.body)).size).toBe(BODIES.length);
    expect(new Set(looks.map((l) => l.skin)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(looks.map((l) => l.cloak)).size).toBeGreaterThanOrEqual(4);
  });
});

describe("avatarKey", () => {
  it("changes when only the body changes", () => {
    const female: Avatar = { ...DEFAULT_AVATAR, body: "female" };
    const male: Avatar = { ...DEFAULT_AVATAR, body: "male" };

    expect(avatarKey(female)).not.toBe(avatarKey(male));
  });

  it("changes when only the skin changes", () => {
    const honey: Avatar = { ...DEFAULT_AVATAR, skin: "honey" };
    const ghost: Avatar = { ...DEFAULT_AVATAR, skin: "ghost" };

    expect(avatarKey(honey)).not.toBe(avatarKey(ghost));
  });
});
