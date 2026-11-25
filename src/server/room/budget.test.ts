import { describe, expect, it } from "vitest";
import { MESSAGE_BURST } from "@/shared/constants";
import { fullBudget, readBudget, spend } from "./budget";

/** `count` messages at time `at`. */
const at = (time: number, count = 1): Array<number> =>
  Array.from({ length: count }, () => time);

/** Runs of `true` (allowed) and `false` (refused), as "20y 1n" and so on. */
function pattern(results: Array<boolean>): string {
  const runs: Array<string> = [];
  let run = 0;

  for (const [i, allowed] of results.entries()) {
    run += 1;

    if (results[i + 1] !== allowed) {
      runs.push(`${run}${allowed ? "y" : "n"}`);
      run = 0;
    }
  }

  return runs.join(" ");
}

/** Spends from a full bucket at time 0 for each message time. */
function run(times: Array<number>) {
  let budget = fullBudget(0);
  const allowed: Array<boolean> = [];
  const flagged: Array<number> = [];

  for (const [i, time] of times.entries()) {
    const spent = spend(budget, time);

    budget = spent.budget;
    allowed.push(spent.allowed);

    if (spent.firstRefusal) {
      flagged.push(i);
    }
  }

  return { allowed: pattern(allowed), flagged, budget };
}

describe("message budget (issue 20)", () => {
  it.each([
    ["a full burst at once is allowed", at(0, 20), "20y", []],
    ["one over the burst is refused", at(0, 21), "20y 1n", [20]],
    ["only the first refusal of a run is flagged", at(0, 25), "20y 5n", [20]],
    [
      "it refills one token every 200 ms",
      [...at(0, 20), 199, 200],
      "20y 1n 1y",
      [20],
    ],
    [
      "five a second never runs out",
      Array.from({ length: 300 }, (_, i) => i * 200),
      "300y",
      [],
    ],
    [
      "the refill stops at a full burst",
      [...at(0), ...at(60_000, 21)],
      "21y 1n",
      [21],
    ],
    [
      "it warns again only after a full refill",
      [...at(0, 21), ...at(1000, 21), ...at(10_000, 21)],
      "20y 1n 5y 16n 20y 1n",
      [20, 62],
    ],
    [
      "a clock that goes backwards adds nothing",
      [...at(1000, 20), 500],
      "20y 1n",
      [20],
    ],
  ])("%s", (_, times, expected, flagged) => {
    const result = run(times);

    expect(result.allowed).toBe(expected);
    expect(result.flagged).toEqual(flagged);
  });

  it("starts full and never goes above the burst", () => {
    expect(fullBudget(5).tokens).toBe(MESSAGE_BURST);
    expect(run([1_000_000]).budget.tokens).toBe(MESSAGE_BURST - 1);
  });

  it("is plain JSON, so it fits in a socket attachment", () => {
    const { budget } = run(at(0, 30));

    // oxlint-disable-next-line unicorn/prefer-structured-clone -- proves the budget survives JSON
    expect(JSON.parse(JSON.stringify(budget))).toEqual(budget);
  });
});

describe("a budget read from a socket attachment", () => {
  const stored = {
    playerId: "p1",
    tokens: 3.5,
    refilledAt: 900,
    limited: true,
  };

  it.each<[string, unknown, ReturnType<typeof readBudget>]>([
    [
      "keeps a stored budget",
      stored,
      { tokens: 3.5, refilledAt: 900, limited: true },
    ],
    [
      "starts full for an attachment from before the budget",
      { playerId: "p1" },
      fullBudget(1000),
    ],
    [
      "starts full for a budget with a field of the wrong type",
      { ...stored, tokens: "3" },
      fullBudget(1000),
    ],
    ["starts full for no attachment at all", null, fullBudget(1000)],
  ])("%s", (_, attachment, expected) => {
    expect(readBudget(attachment, 1000)).toEqual(expected);
  });
});
