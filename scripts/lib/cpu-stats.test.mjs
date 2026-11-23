import { describe, expect, it } from "vitest";
import { parseTailEvents, summarise } from "./cpu-stats.mjs";

describe("summarise", () => {
  it("gives nearest-rank percentiles", () => {
    expect(summarise([10, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({
      count: 10,
      median: 5,
      p90: 9,
      max: 10,
    });
  });
  it("handles one sample", () => {
    expect(summarise([7])).toEqual({ count: 1, median: 7, p90: 7, max: 7 });
  });
  it("gives zeros for no samples", () => {
    expect(summarise([])).toEqual({ count: 0, median: 0, p90: 0, max: 0 });
  });
  it("does not change the list it was given", () => {
    const samples = [3, 1, 2];

    summarise(samples);
    expect(samples).toEqual([3, 1, 2]);
  });
});

describe("parseTailEvents", () => {
  it("reads objects printed back to back and skips non-request events", () => {
    const text = `{
  "outcome": "ok",
  "cpuTime": 3,
  "event": { "request": { "url": "https://x.workers.dev/room/ABCD?x=1" } }
}
{ "outcome": "ok", "cpuTime": 1, "event": { "rpcMethod": "create" } }
{ "outcome": "exceededCpu", "cpuTime": 52, "event": { "request": { "url": "https://x.workers.dev/" } } }`;

    expect(parseTailEvents(text)).toEqual([
      { path: "/room/ABCD", cpuTime: 3, outcome: "ok" },
      { path: "/", cpuTime: 52, outcome: "exceededCpu" },
    ]);
  });
  it("ignores a cut-off object at the end", () => {
    expect(parseTailEvents('{ "outcome": "ok", "cpuTi')).toEqual([]);
  });
});
