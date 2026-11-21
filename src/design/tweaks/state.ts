/**
 * Tweak state, how it becomes CSS, and how it travels (JSON, share links, a
 * Markdown brief for Claude). Pure functions, tested in Node. Prototype-only.
 */
import {
  DEFAULT_SKY,
  type SkyOptions,
} from "@/routes/design/starlit/-components/art/sky-options";
import {
  NO_SHIFT,
  contrastRatio,
  isIdentityShift,
  normalizeHex,
  shiftHex,
  type ColorShift,
} from "./color";
import {
  THEME_SELECTOR,
  WIDE_QUERY,
  WIDE_SUFFIX,
  familyOf,
  type Catalog,
} from "./catalog";

export { DEFAULT_SKY, type SkyOptions };

export interface TweakState {
  version: 1;
  name: string;
  /** Free text for the whole dial: what you were going for. */
  notes: string;
  /** Token overrides. "--x" for every width, "--x@wide" for 1024px and up. */
  vars: Record<string, string>;
  /** Palette shifts in OKLCH. "all" applies first, then the primitive's family. */
  shifts: Record<string, ColorShift>;
  sky: SkyOptions;
  /** Root font size in percent: scales every rem in the design. */
  typeScale: number;
  /** Per-token notes for Claude ("warmer, but not orange"). */
  comments: Record<string, string>;
}

export const DEFAULT_STATE: TweakState = {
  version: 1,
  name: "Untitled dial",
  notes: "",
  vars: {},
  shifts: {},
  sky: DEFAULT_SKY,
  typeScale: 100,
  comments: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" && k.startsWith("--")) out[k] = v;
  }
  return out;
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Accept anything (storage, a pasted file, a link) and return a valid state. */
export function sanitizeState(input: unknown): TweakState {
  if (!isRecord(input)) return DEFAULT_STATE;
  const shifts: Record<string, ColorShift> = {};
  if (isRecord(input.shifts)) {
    for (const [k, v] of Object.entries(input.shifts)) {
      if (!isRecord(v)) continue;
      shifts[k] = {
        hue: finite(v.hue, 0),
        chroma: finite(v.chroma, 1),
        lightness: finite(v.lightness, 0),
      };
    }
  }
  const sky = isRecord(input.sky) ? input.sky : {};
  const comments = isRecord(input.comments)
    ? Object.fromEntries(
        Object.entries(input.comments).filter(
          (e): e is [string, string] => typeof e[1] === "string",
        ),
      )
    : {};
  return {
    version: 1,
    name: typeof input.name === "string" ? input.name : DEFAULT_STATE.name,
    notes: typeof input.notes === "string" ? input.notes : "",
    vars: stringRecord(input.vars),
    shifts,
    sky: {
      starCount: Math.round(
        Math.min(
          3000,
          Math.max(0, finite(sky.starCount, DEFAULT_SKY.starCount)),
        ),
      ),
      starSeed: Math.round(finite(sky.starSeed, DEFAULT_SKY.starSeed)),
      starTopBias: finite(sky.starTopBias, DEFAULT_SKY.starTopBias),
      twinkleEvery: Math.max(
        1,
        Math.round(finite(sky.twinkleEvery, DEFAULT_SKY.twinkleEvery)),
      ),
      lightsDensity: Math.max(
        0,
        finite(sky.lightsDensity, DEFAULT_SKY.lightsDensity),
      ),
      lightsSeed: Math.round(finite(sky.lightsSeed, DEFAULT_SKY.lightsSeed)),
    },
    typeScale: Math.min(160, Math.max(60, finite(input.typeScale, 100))),
    comments,
  };
}

/** Shifts that apply to one primitive, in order. */
function shiftsFor(state: TweakState, name: string): ColorShift[] {
  const family = familyOf(name);
  const out = [state.shifts.all ?? NO_SHIFT];
  if (family) out.push(state.shifts[family] ?? NO_SHIFT);
  return out.filter((s) => !isIdentityShift(s));
}

/** The value one token has under this state, before var() is followed. */
export function declaredValue(
  catalog: Catalog,
  state: TweakState,
  name: string,
  wide = false,
): string | undefined {
  const def = catalog.get(name);
  const override = wide
    ? (state.vars[name + WIDE_SUFFIX] ??
      (def?.wide === undefined ? state.vars[name] : undefined))
    : state.vars[name];
  const raw = override ?? (wide ? (def?.wide ?? def?.base) : def?.base);
  if (raw === undefined) return undefined;
  if (familyOf(name)) {
    const shifts = shiftsFor(state, name);
    if (shifts.length > 0) return shiftHex(normalizeHex(raw) ?? raw, shifts);
  }
  return raw;
}

/** Follow var() references to a final value (a hex, a length, ...). */
export function resolveValue(
  catalog: Catalog,
  state: TweakState,
  name: string,
  wide = false,
): string | undefined {
  let current = name;
  for (let depth = 0; depth < 12; depth += 1) {
    const value = declaredValue(catalog, state, current, wide);
    if (value === undefined) return undefined;
    const ref = /^var\((--[\w-]+)\)$/.exec(value.trim());
    if (!ref?.[1]) return value;
    current = ref[1];
  }
  return undefined;
}

export interface Change {
  token: string;
  scope: "all" | "wide";
  from: string;
  to: string;
}

/** Every token whose declared value differs from the stylesheet's. */
export function listChanges(catalog: Catalog, state: TweakState): Change[] {
  const changes: Change[] = [];
  for (const def of catalog.values()) {
    const to = declaredValue(catalog, state, def.name);
    if (to !== undefined && to !== def.base) {
      changes.push({ token: def.name, scope: "all", from: def.base, to });
    }
    if (def.wide !== undefined) {
      const toWide = declaredValue(catalog, state, def.name, true);
      if (toWide !== undefined && toWide !== def.wide) {
        changes.push({
          token: def.name,
          scope: "wide",
          from: def.wide,
          to: toWide,
        });
      }
    }
  }
  return changes;
}

export function skyChanges(
  state: TweakState,
): [keyof SkyOptions, number, number][] {
  return (Object.keys(DEFAULT_SKY) as (keyof SkyOptions)[])
    .filter((k) => state.sky[k] !== DEFAULT_SKY[k])
    .map((k) => [k, DEFAULT_SKY[k], state.sky[k]]);
}

export function isPristine(catalog: Catalog, state: TweakState): boolean {
  return (
    listChanges(catalog, state).length === 0 &&
    skyChanges(state).length === 0 &&
    state.typeScale === 100
  );
}

/**
 * The stylesheet that applies a state. The doubled selector outranks the
 * theme's own block. A token with a separate wide value gets its "all widths"
 * override only below the breakpoint, so the theme's wide value survives
 * unless that is overridden too.
 */
export function buildCss(catalog: Catalog, state: TweakState): string {
  const narrowOnly: string[] = [];
  const every: string[] = [];
  const wide: string[] = [];
  for (const change of listChanges(catalog, state)) {
    const line = `  ${change.token}: ${change.to};`;
    const def = catalog.get(change.token);
    if (change.scope === "wide") wide.push(line);
    else if (def?.wide !== undefined) narrowOnly.push(line);
    else every.push(line);
  }
  const sel = `${THEME_SELECTOR}${THEME_SELECTOR}`;
  const blocks: string[] = [];
  if (state.typeScale !== 100)
    blocks.push(`html {\n  font-size: ${state.typeScale}%;\n}`);
  if (every.length) blocks.push(`${sel} {\n${every.join("\n")}\n}`);
  if (narrowOnly.length)
    blocks.push(
      `@media not all and ${WIDE_QUERY} {\n  ${sel} {\n  ${narrowOnly.join("\n  ")}\n  }\n}`,
    );
  if (wide.length)
    blocks.push(
      `@media ${WIDE_QUERY} {\n  ${sel} {\n  ${wide.join("\n  ")}\n  }\n}`,
    );
  return blocks.join("\n\n");
}

/** A patch for -theme.css: new values, each with the one it replaces. */
export function buildCssDiff(catalog: Catalog, state: TweakState): string {
  const changes = listChanges(catalog, state);
  const base = changes.filter((c) => c.scope === "all");
  const wide = changes.filter((c) => c.scope === "wide");
  const line = (c: Change) => `  ${c.token}: ${c.to}; /* was ${c.from} */`;
  const parts: string[] = [];
  if (state.typeScale !== 100)
    parts.push(`html {\n  font-size: ${state.typeScale}%;\n}`);
  if (base.length)
    parts.push(`${THEME_SELECTOR} {\n${base.map(line).join("\n")}\n}`);
  if (wide.length)
    parts.push(
      `@media ${WIDE_QUERY} {\n  ${THEME_SELECTOR} {\n${wide.map((c) => "  " + line(c)).join("\n")}\n  }\n}`,
    );
  const sky = skyChanges(state);
  if (sky.length)
    parts.push(
      `/* NightSky options (night-sky.tsx DEFAULT_SKY):\n${sky.map(([k, from, to]) => `   ${k}: ${to} (was ${from})`).join("\n")}\n*/`,
    );
  return parts.join("\n\n") || "/* No changes from the Starlit defaults. */";
}

/** Text pairs the design must keep readable, with the WCAG target for each. */
export const CONTRAST_PAIRS = [
  { fg: "--ink", bg: "--canvas", min: 4.5, label: "Body text on the page" },
  { fg: "--ink", bg: "--surface", min: 4.5, label: "Body text on a panel" },
  {
    fg: "--ink-muted",
    bg: "--surface",
    min: 4.5,
    label: "Muted text on a panel",
  },
  {
    fg: "--ink-muted",
    bg: "--canvas",
    min: 4.5,
    label: "Muted text on the page",
  },
  { fg: "--ink", bg: "--well", min: 4.5, label: "Typed text in an input" },
  {
    fg: "--on-accent",
    bg: "--accent",
    min: 4.5,
    label: "Primary button label",
  },
  {
    fg: "--accent-cool",
    bg: "--surface",
    min: 4.5,
    label: "Eyebrow on a panel",
  },
  { fg: "--good", bg: "--surface", min: 4.5, label: "Good on a panel" },
  { fg: "--evil", bg: "--surface", min: 4.5, label: "Evil on a panel" },
  { fg: "--success", bg: "--surface", min: 4.5, label: "Success on a panel" },
  { fg: "--fail", bg: "--surface", min: 4.5, label: "Fail on a panel" },
  { fg: "--warning", bg: "--surface", min: 4.5, label: "Warning on a panel" },
  {
    fg: "--line-strong",
    bg: "--surface",
    min: 3,
    label: "Strong line (UI shape)",
  },
  { fg: "--focus", bg: "--canvas", min: 3, label: "Focus ring" },
] as const;

export interface ContrastResult {
  label: string;
  fg: string;
  bg: string;
  fgHex?: string;
  bgHex?: string;
  ratio: number | null;
  min: number;
  pass: boolean;
}

export function checkContrast(
  catalog: Catalog,
  state: TweakState,
): ContrastResult[] {
  return CONTRAST_PAIRS.map((pair) => {
    const fgHex = resolveValue(catalog, state, pair.fg);
    const bgHex = resolveValue(catalog, state, pair.bg);
    const ratio = fgHex && bgHex ? contrastRatio(fgHex, bgHex) : null;
    return {
      label: pair.label,
      fg: pair.fg,
      bg: pair.bg,
      ...(fgHex ? { fgHex } : {}),
      ...(bgHex ? { bgHex } : {}),
      ratio,
      min: pair.min,
      pass: ratio !== null && ratio >= pair.min,
    };
  });
}

/** Only what differs from the defaults, so exports and links stay short. */
export function compactState(
  state: TweakState,
): Partial<TweakState> & { version: 1 } {
  const out: Partial<TweakState> & { version: 1 } = {
    version: 1,
    name: state.name,
  };
  if (state.notes) out.notes = state.notes;
  if (Object.keys(state.vars).length) out.vars = state.vars;
  const shifts = Object.fromEntries(
    Object.entries(state.shifts).filter(([, s]) => !isIdentityShift(s)),
  );
  if (Object.keys(shifts).length) out.shifts = shifts;
  if (skyChanges(state).length) out.sky = state.sky;
  if (state.typeScale !== 100) out.typeScale = state.typeScale;
  const comments = Object.fromEntries(
    Object.entries(state.comments).filter(([, c]) => c.trim()),
  );
  if (Object.keys(comments).length) out.comments = comments;
  return out;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const b64 = code.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(
    Uint8Array.from(binary, (c) => c.charCodeAt(0)),
  );
}

export function encodeState(state: TweakState): string {
  return toBase64Url(JSON.stringify(compactState(state)));
}

export function decodeState(code: string): TweakState | null {
  try {
    return sanitizeState(JSON.parse(fromBase64Url(code)));
  } catch {
    return null;
  }
}

/** A brief to paste to Claude: what changed, why, and the state to reload it. */
export function buildBrief(
  catalog: Catalog,
  state: TweakState,
  shareUrl: string,
): string {
  const lines: string[] = [`## Starlit dial: ${state.name}`, ""];
  if (state.notes.trim()) lines.push(state.notes.trim(), "");
  const changes = listChanges(catalog, state);
  const shifts = Object.entries(state.shifts).filter(
    ([, s]) => !isIdentityShift(s),
  );
  if (shifts.length) {
    lines.push("### Palette shifts (OKLCH)", "");
    for (const [family, s] of shifts) {
      lines.push(
        `- ${family}: hue ${s.hue > 0 ? "+" : ""}${s.hue}°, chroma ×${s.chroma}, lightness ${s.lightness > 0 ? "+" : ""}${s.lightness}`,
      );
    }
    lines.push("");
  }
  if (changes.length) {
    lines.push(
      "### Token changes",
      "",
      "| Token | Width | Was | Now | Note |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const c of changes) {
      const note = (state.comments[c.token] ?? "").replaceAll("|", "\\|");
      lines.push(
        `| \`${c.token}\` | ${c.scope === "wide" ? "≥1024px" : "all"} | \`${c.from}\` | \`${c.to}\` | ${note} |`,
      );
    }
    lines.push("");
  }
  const sky = skyChanges(state);
  if (sky.length || state.typeScale !== 100) {
    lines.push("### Sky and type scale", "");
    for (const [k, from, to] of sky) lines.push(`- ${k}: ${from} → ${to}`);
    if (state.typeScale !== 100)
      lines.push(`- root font size: 100% → ${state.typeScale}%`);
    lines.push("");
  }
  const loneComments = Object.entries(state.comments).filter(
    ([token, text]) => text.trim() && !changes.some((c) => c.token === token),
  );
  if (loneComments.length) {
    lines.push("### Notes on tokens I did not change", "");
    for (const [token, text] of loneComments)
      lines.push(`- \`${token}\`: ${text.trim()}`);
    lines.push("");
  }
  const failing = checkContrast(catalog, state).filter((r) => !r.pass);
  if (failing.length) {
    lines.push("### Contrast failures", "");
    for (const r of failing)
      lines.push(
        `- ${r.label}: ${r.ratio?.toFixed(2) ?? "?"}:1 (needs ${r.min}:1)`,
      );
    lines.push("");
  }
  lines.push(
    `Open it: ${shareUrl}`,
    "",
    "```json",
    JSON.stringify(compactState(state), null, 2),
    "```",
  );
  return lines.join("\n");
}
