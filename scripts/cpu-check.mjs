#!/usr/bin/env node
/**
 * Measures how much CPU the deployed Worker spends per request.
 *
 *   node scripts/cpu-check.mjs --url https://example.workers.dev --worker avalon \
 *     --paths /,/room/ZZZZ [--requests 30] [--warmup 5] [--budget-ms 10] [--min-samples 10] \
 *     [--interval-ms 1000]
 *
 * It starts `wrangler tail`, warms each path up (fresh isolates run slower),
 * sends the measured requests one at a time, then reads each request's
 * `cpuTime` from the tail and prints a table.
 *
 * Requests are spaced --interval-ms apart. The tail stream drops events when
 * they come faster than about one a second (a burst of roughly ten gets
 * through, then it goes quiet), so sending them back to back loses samples.
 *
 * Exit codes: 0 when every path's 90th percentile is within the budget. 1 when
 * any path is over it, or any request ran out of CPU (`exceededCpu`). 2 when
 * any path got fewer than --min-samples events, or the tail could not start.
 * Too little data is a failure, never a pass.
 */

import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { parseTailEvents, summarise } from "./lib/cpu-stats.mjs";

const attachMs = 6000;
const drainMs = 6000;

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    worker: { type: "string" },
    paths: { type: "string" },
    requests: { type: "string", default: "30" },
    warmup: { type: "string", default: "5" },
    "budget-ms": { type: "string", default: "10" },
    "min-samples": { type: "string", default: "10" },
    "interval-ms": { type: "string", default: "1000" },
  },
});

/**
 * @param {string} reason
 * @param {number} code
 * @returns {never}
 */
function fail(reason, code) {
  console.error(reason);
  process.exit(code);
}

/**
 * @param {string} name
 * @param {string} raw
 * @returns {number}
 */
function toNumber(name, raw) {
  const value = Number(raw);

  if (!Number.isFinite(value) || value < 0) {
    fail(`--${name} must be a non-negative number, got "${raw}".`, 2);
  }

  return value;
}

if (!values.url || !values.worker || !values.paths) {
  fail(
    "Usage: node scripts/cpu-check.mjs --url <base> --worker <name> --paths <comma list> [--requests 30] [--warmup 5] [--budget-ms 10] [--min-samples 10] [--interval-ms 1000]",
    2,
  );
}

const base = values.url.replace(/\/+$/, "");
const worker = values.worker;
const paths = values.paths
  .split(",")
  .map((path) => path.trim())
  .filter((path) => path.length > 0);
const requests = toNumber("requests", values.requests);
const warmup = toNumber("warmup", values.warmup);
const budgetMs = toNumber("budget-ms", values["budget-ms"]);
const minSamples = toNumber("min-samples", values["min-samples"]);
const intervalMs = toNumber("interval-ms", values["interval-ms"]);

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Requests a path once and reads the whole body, so the Worker finishes its
 * work before the next request starts.
 *
 * @param {string} path
 */
async function hit(path) {
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { "cache-control": "no-cache" },
    });

    await response.arrayBuffer();
  } catch (error) {
    console.warn(`Request to ${path} failed: ${String(error)}`);
  }
}

/**
 * @param {number} count
 */
async function hitEach(count) {
  for (const path of paths) {
    for (let i = 0; i < count; i += 1) {
      await hit(path);
      await sleep(intervalMs);
    }
  }
}

let output = "";
let errors = "";
let exited = false;

const tail = spawn(
  "pnpm",
  ["exec", "wrangler", "tail", worker, "--format", "json"],
  {
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: ["ignore", "pipe", "pipe"],
    // Its own process group, so stopping it also stops wrangler under pnpm.
    detached: true,
  },
);

/** @param {NodeJS.Signals} signal */
function stopTail(signal) {
  if (tail.pid === undefined) {
    return;
  }

  try {
    process.kill(-tail.pid, signal);
  } catch {
    // Already gone.
  }
}

tail.stdout.setEncoding("utf8");
tail.stderr.setEncoding("utf8");
tail.stdout.on("data", (chunk) => {
  output += chunk;
});
tail.stderr.on("data", (chunk) => {
  errors += chunk;
});

const tailClosed = new Promise((resolve) => {
  tail.on("close", () => {
    exited = true;
    resolve(undefined);
  });
});

tail.on("error", (error) => {
  fail(`Could not start wrangler tail: ${String(error)}`, 2);
});

await sleep(attachMs);

if (exited) {
  fail(
    `wrangler tail stopped before any request was sent.\n${errors.trim()}`,
    2,
  );
}

console.log(`Warming up: ${warmup} request(s) per path.`);
await hitEach(warmup);

const measuredFrom = output.length;

console.log(
  `Measuring: ${requests} request(s) per path, one at a time, ${intervalMs} ms apart.`,
);
await hitEach(requests);
await sleep(drainMs);

stopTail("SIGINT");
await Promise.race([tailClosed, sleep(5000)]);

if (!exited) {
  stopTail("SIGKILL");
}

const events = parseTailEvents(output.slice(measuredFrom));

const rows = paths.map((path) => {
  const matching = events.filter((event) => event.path === path);
  const stats = summarise(matching.map((event) => event.cpuTime));
  const exceeded = matching.some((event) => event.outcome === "exceededCpu");
  let result = "pass";

  if (stats.count < minSamples) {
    result = "too few samples";
  } else if (exceeded) {
    result = "exceeded CPU";
  } else if (stats.p90 > budgetMs) {
    result = "over budget";
  }

  return { path, stats, exceeded, result };
});

console.log("");
console.log(
  `CPU time per request (budget: 90th percentile at most ${budgetMs} ms)`,
);
console.log("");
console.log("| Path | Samples | Median | 90th percentile | Slowest | Result |");
console.log("| ---- | ------: | -----: | --------------: | ------: | ------ |");

for (const { path, stats, result } of rows) {
  console.log(
    `| \`${path}\` | ${stats.count} | ${stats.median} ms | ${stats.p90} ms | ${stats.max} ms | ${result} |`,
  );
}

console.log("");

const short = rows.filter((row) => row.stats.count < minSamples);

if (short.length > 0) {
  const detail = errors.trim() ? `\nwrangler tail said:\n${errors.trim()}` : "";

  fail(
    `Too few samples (fewer than ${minSamples}) for: ${short.map((row) => row.path).join(", ")}. The tail may be sampling, or the token may lack tail access.${detail}`,
    2,
  );
}

const exceededRows = rows.filter((row) => row.exceeded);

if (exceededRows.length > 0) {
  fail(
    `A request ran out of CPU (exceededCpu) on: ${exceededRows.map((row) => row.path).join(", ")}.`,
    1,
  );
}

const over = rows.filter((row) => row.stats.p90 > budgetMs);

if (over.length > 0) {
  fail(
    `90th percentile over ${budgetMs} ms on: ${over.map((row) => `${row.path} (${row.stats.p90} ms)`).join(", ")}.`,
    1,
  );
}

console.log("Every path is within the CPU budget.");
