/**
 * Pure helpers for scripts/cpu-check.mjs: summarise CPU samples and read the
 * output of `wrangler tail --format json`.
 */

/**
 * The value at a nearest-rank percentile of a sorted list.
 *
 * @param {number[]} sorted
 * @param {number} percent
 * @returns {number}
 */
function nearestRank(sorted, percent) {
  const rank = Math.ceil((percent / 100) * sorted.length);

  return sorted[Math.max(rank, 1) - 1];
}

/**
 * Count, median, 90th percentile and maximum of a list of samples, using
 * nearest-rank percentiles. An empty list gives all zeros.
 *
 * @param {number[]} samples
 * @returns {{ count: number; median: number; p90: number; max: number }}
 */
export function summarise(samples) {
  if (samples.length === 0) {
    return { count: 0, median: 0, p90: 0, max: 0 };
  }

  const sorted = [...samples].sort((a, b) => a - b);

  return {
    count: sorted.length,
    median: nearestRank(sorted, 50),
    p90: nearestRank(sorted, 90),
    max: sorted.at(-1) ?? 0,
  };
}

/**
 * Splits text into the top-level JSON objects printed back to back in it.
 * Braces inside strings do not count. A cut-off object at the end is dropped.
 *
 * @param {string} text
 * @returns {string[]}
 */
function topLevelObjects(text) {
  const objects = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      if (depth === 0) {
        start = i;
      }

      depth += 1;
    } else if (char === "}" && depth > 0) {
      depth -= 1;

      if (depth === 0) {
        objects.push(text.slice(start, i + 1));
      }
    }
  }

  return objects;
}

/**
 * Reads the request events from `wrangler tail --format json` output. Events
 * without `event.request.url` (alarms, RPC calls, ...) are skipped.
 *
 * @param {string} text
 * @returns {{ path: string; cpuTime: number; outcome: string }[]}
 */
export function parseTailEvents(text) {
  const events = [];

  for (const raw of topLevelObjects(text)) {
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const url = parsed?.event?.request?.url;

    if (typeof url !== "string") {
      continue;
    }

    events.push({
      path: new URL(url).pathname,
      cpuTime: Number(parsed.cpuTime ?? 0),
      outcome: String(parsed.outcome ?? ""),
    });
  }

  return events;
}
