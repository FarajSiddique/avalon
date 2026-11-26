import { describe, expect, it } from "vitest";
import { DEFAULT_AVATAR, SKINS, type Avatar } from "@/shared/avatar";
import { BODY_LABELS, SKIN_LABELS, SKIN_TOKENS, lookSummary } from "./avatar";

describe("lookSummary", () => {
  it("names the body and the skin", () => {
    const look: Avatar = { ...DEFAULT_AVATAR, body: "male", skin: "moss" };
    const summary = lookSummary(look);

    expect(summary).toContain(BODY_LABELS.male);
    expect(summary.toLowerCase()).toContain(SKIN_LABELS.moss.toLowerCase());
  });
});

describe("skins", () => {
  it("every skin has a label and an art token", () => {
    for (const skin of SKINS) {
      expect(SKIN_LABELS[skin]).toBeTruthy();
      expect(SKIN_TOKENS[skin]).toMatch(/^--art-skin-/);
    }
  });
});
