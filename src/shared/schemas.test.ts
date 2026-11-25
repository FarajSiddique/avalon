import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR, type Avatar } from "./avatar";
import { avatarInputSchema, createRoomSchema, joinRoomSchema } from "./schemas";

const look: Avatar = {
  body: "male",
  skin: "starborn",
  cloak: "moss",
  headwear: "helm",
  emblem: "key",
};

const { cloak: _cloak, ...noCloak } = DEFAULT_AVATAR;

const invalidLooks: Array<[string, unknown]> = [
  ["an unknown cloak", { ...DEFAULT_AVATAR, cloak: "crimson" }],
  ["a missing trait", noCloak],
  ["a string", "hood"],
];

describe("the look on create and join", () => {
  it.each([
    ["joinRoomSchema", joinRoomSchema],
    ["createRoomSchema", createRoomSchema],
  ])("%s: no look gives no look", (_name, schema) => {
    expect(schema.parse({ name: "Ansel" })).toEqual({
      name: "Ansel",
      avatar: undefined,
    });
  });

  it.each([
    ["joinRoomSchema", joinRoomSchema],
    ["createRoomSchema", createRoomSchema],
  ])("%s: a valid look is kept", (_name, schema) => {
    expect(schema.parse({ name: "Ansel", avatar: look }).avatar).toEqual(look);
  });

  it.each(invalidLooks)(
    "%s is dropped and the join still parses",
    (_case, avatar) => {
      const parsed = joinRoomSchema.safeParse({ name: "Ansel", avatar });

      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual({ name: "Ansel", avatar: undefined });
    },
  );

  it.each(invalidLooks)(
    "%s is dropped and the create still parses",
    (_case, avatar) => {
      const parsed = createRoomSchema.safeParse({ name: "Ansel", avatar });

      expect(parsed.success).toBe(true);
      expect(parsed.data?.avatar).toBeUndefined();
    },
  );

  it("an invalid name still fails, look or not", () => {
    expect(joinRoomSchema.safeParse({ name: "", avatar: look }).success).toBe(
      false,
    );
  });
});

describe("lobby:avatar", () => {
  it("accepts a valid look", () => {
    expect(avatarInputSchema.parse({ avatar: look })).toEqual({ avatar: look });
  });

  it.each(invalidLooks)("refuses %s", (_case, avatar) => {
    expect(avatarInputSchema.safeParse({ avatar }).success).toBe(false);
  });

  it("refuses a missing look", () => {
    expect(avatarInputSchema.safeParse({}).success).toBe(false);
  });

  it("drops extra traits, so only the five reach the room", () => {
    const parsed = avatarInputSchema.parse({
      avatar: { ...look, crown: "gold" },
    });

    expect(parsed.avatar).toEqual(look);
  });
});
