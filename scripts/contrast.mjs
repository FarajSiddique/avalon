#!/usr/bin/env node
/**
 * WCAG 2.x contrast checker for design tokens.
 *
 *   node scripts/contrast.mjs "#f1ecdf:#15131d" "ink-muted=#a8a2b8:#15131d"
 *
 * Each argument is `foreground:background`, optionally prefixed with a label
 * and `=`. Prints a Markdown table. Exits 1 if any pair is below 3:1.
 */

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Not a 6-digit hex colour: ${hex}`);
  const n = Number.parseInt(match[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function verdict(ratio) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA large text and UI only";
  return "FAIL";
}

const pairs = process.argv.slice(2);
if (pairs.length === 0) {
  console.error('Usage: node scripts/contrast.mjs "label=#fg:#bg" ...');
  process.exit(2);
}

let failed = false;
console.log("| Pair | Foreground | Background | Ratio | Result |");
console.log("| --- | --- | --- | --- | --- |");
for (const arg of pairs) {
  const eq = arg.indexOf("=");
  const label = eq === -1 ? "" : arg.slice(0, eq);
  const [fg, bg] = arg.slice(eq + 1).split(":");
  const ratio = contrast(fg, bg);
  const result = verdict(ratio);
  if (result === "FAIL") failed = true;
  console.log(
    `| ${label || `${fg} on ${bg}`} | \`${fg}\` | \`${bg}\` | ${ratio.toFixed(2)}:1 | ${result} |`,
  );
}
process.exit(failed ? 1 : 0);
