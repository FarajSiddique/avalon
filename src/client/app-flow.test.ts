import { describe, expect, it } from "vitest";
import { isAppNextInFlow } from "./app-flow";

describe("isAppNextInFlow", () => {
  it.each([
    ["/", "/room/BCDF", true],
    ["/", "/room/BCDF/", true],
    ["/", "/room/not-a-code", false],
    ["/room/BCDF", "/", false],
    ["/room/BCDF", "/room/GHJK", false],
    ["/design", "/room/BCDF", false],
    ["/", "/design/starlit", false],
  ])("%s to %s is %s", (from, to, expected) => {
    expect(isAppNextInFlow(from, to)).toBe(expected);
  });
});
