/**
 * The token catalogue: every custom property the Starlit theme declares, read
 * from the live stylesheet so the studio never carries a second copy of the
 * defaults. Classification and grouping are pure and tested. Prototype-only.
 */
import { isHex, normalizeHex } from "./color";

/** The element the theme's tokens are declared on. Phase 0 makes it :root. */
export const THEME_SELECTOR = ".theme-starlit";
/** The theme's one width breakpoint. */
export const WIDE_QUERY = "(min-width: 1024px)";
/** Suffix for an override that applies only at the wide breakpoint. */
export const WIDE_SUFFIX = "@wide";

export type TokenKind =
  | "color"
  | "ref"
  | "length"
  | "time"
  | "percent"
  | "number"
  | "easing"
  | "font"
  | "text";

export interface TokenDef {
  name: string;
  /** The value as declared, for example `#0a1030` or `var(--starlit-night-900)`. */
  base: string;
  /** The value declared in the wide breakpoint, when there is one. */
  wide?: string;
  kind: TokenKind;
  group: GroupId;
  label: string;
  hint?: string;
  range?: { min: number; max: number; step: number };
  options?: readonly { label: string; value: string }[];
}

export type Catalog = ReadonlyMap<string, TokenDef>;

export const GROUPS = [
  {
    id: "palette",
    title: "Palette primitives",
    blurb: "The raw paint. Every other colour points at one of these.",
  },
  {
    id: "semantic",
    title: "Semantic colours",
    blurb: "What the UI means by canvas, ink, accent, good, evil.",
  },
  {
    id: "type",
    title: "Typography",
    blurb: "Fraunces axes, weights and tracking.",
  },
  {
    id: "shape",
    title: "Shape and controls",
    blurb: "Corners, button and input sizes.",
  },
  {
    id: "panels",
    title: "Panels and glow",
    blurb: "How solid the panels are and how much light sources bloom.",
  },
  {
    id: "sky",
    title: "Sky and horizon",
    blurb: "Gradient stops, star and cloud visibility.",
  },
  {
    id: "art-sky",
    title: "Art: sky, stars, clouds",
    blurb: "Colours of the sky painting.",
  },
  {
    id: "art-vale",
    title: "Art: hills and ground",
    blurb: "The valley, from far hills to the grass by the fire.",
  },
  {
    id: "art-camp",
    title: "Art: camp and fire",
    blurb: "Tents, logs, stones, the flame.",
  },
  {
    id: "table",
    title: "Table layout",
    blurb: "Seats, ring, role card and moons. Phone and wide values.",
  },
  { id: "motion", title: "Motion", blurb: "Easing curves and UI durations." },
  {
    id: "ambient",
    title: "Ambient motion",
    blurb: "Twinkle, drift, fire. Tempo scales all of them.",
  },
  {
    id: "other",
    title: "Other tokens",
    blurb: "Everything else the theme declares.",
  },
] as const;

export type GroupId = (typeof GROUPS)[number]["id"];

const SEMANTIC = new Set([
  "--canvas",
  "--surface",
  "--well",
  "--ink",
  "--ink-muted",
  "--line",
  "--line-strong",
  "--focus",
  "--accent",
  "--accent-strong",
  "--on-accent",
  "--accent-cool",
  "--good",
  "--evil",
  "--success",
  "--fail",
  "--warning",
]);

export const EASING_OPTIONS = [
  { label: "Starlit out", value: "cubic-bezier(0.22, 1, 0.36, 1)" },
  { label: "Starlit in", value: "cubic-bezier(0.55, 0, 1, 0.45)" },
  { label: "Spring", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { label: "Travel", value: "cubic-bezier(0.4, 0, 0.2, 1)" },
  { label: "Gentle out", value: "cubic-bezier(0.33, 1, 0.68, 1)" },
  { label: "Expo out", value: "cubic-bezier(0.16, 1, 0.3, 1)" },
  { label: "Soft spring", value: "cubic-bezier(0.5, 1.25, 0.75, 1.1)" },
  { label: "Linear", value: "linear" },
] as const;

export const DISPLAY_FONT_OPTIONS = [
  {
    label: "Fraunces",
    value: "var(--font-fraunces), ui-serif, Georgia, serif",
  },
  { label: "System serif", value: "ui-serif, Georgia, serif" },
  {
    label: "Nunito Sans",
    value:
      "var(--font-nunito-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
] as const;

export const BODY_FONT_OPTIONS = [
  {
    label: "Nunito Sans",
    value:
      "var(--font-nunito-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  {
    label: "Fraunces",
    value: "var(--font-fraunces), ui-serif, Georgia, serif",
  },
  { label: "System sans", value: "ui-sans-serif, system-ui, sans-serif" },
] as const;

type Meta = Partial<
  Pick<TokenDef, "label" | "hint" | "range" | "options" | "kind" | "group">
>;

/** Hand-written labels and ranges where the heuristics are not good enough. */
const META: Record<string, Meta> = {
  "--display-soft": {
    label: "Fraunces SOFT",
    hint: "0 is crisp, 100 is rounded like a brush",
    range: { min: 0, max: 100, step: 1 },
  },
  "--display-wonk": {
    label: "Fraunces WONK",
    hint: "1 swaps in the leaning, quirky letters",
    range: { min: 0, max: 1, step: 1 },
  },
  "--display-weight": {
    label: "Display weight",
    hint: "Wordmark and room code",
    range: { min: 100, max: 900, step: 10 },
  },
  "--wordmark-tracking": {
    label: "Wordmark tracking",
    range: { min: -0.1, max: 0.3, step: 0.005 },
  },
  "--code-tracking": {
    label: "Room code tracking",
    range: { min: 0, max: 0.5, step: 0.01 },
  },
  "--eyebrow-weight": {
    label: "Eyebrow weight",
    range: { min: 200, max: 1000, step: 10 },
  },
  "--eyebrow-tracking": {
    label: "Eyebrow tracking",
    range: { min: 0, max: 0.4, step: 0.005 },
  },
  "--button-weight": {
    label: "Button weight",
    range: { min: 200, max: 1000, step: 10 },
  },
  "--label-weight": {
    label: "Field label weight",
    range: { min: 200, max: 1000, step: 10 },
  },
  "--display-font": {
    kind: "font",
    label: "Display font",
    options: DISPLAY_FONT_OPTIONS,
  },
  "--body-font": {
    kind: "font",
    label: "Body font",
    options: BODY_FONT_OPTIONS,
  },
  "--panel-opacity": {
    label: "Panel opacity",
    range: { min: 0, max: 100, step: 1 },
  },
  "--panel-highlight-strength": {
    label: "Panel inner highlight",
    range: { min: 0, max: 40, step: 1 },
  },
  "--panel-border-width": {
    label: "Panel border width",
    range: { min: 0, max: 4, step: 0.5 },
  },
  "--chart-opacity": {
    label: "Chart opacity",
    range: { min: 0, max: 100, step: 1 },
  },
  "--glow-fire-size": {
    label: "Fire glow size",
    hint: "Primary buttons",
    range: { min: 0, max: 80, step: 1 },
  },
  "--glow-fire-strength": {
    label: "Fire glow strength",
    range: { min: 0, max: 100, step: 1 },
  },
  "--glow-star-ring": {
    label: "Star glow ring",
    hint: "Lit seats and the held role card",
    range: { min: 0, max: 12, step: 0.5 },
  },
  "--glow-star-ring-strength": {
    label: "Star ring strength",
    range: { min: 0, max: 100, step: 1 },
  },
  "--glow-star-size": {
    label: "Star glow size",
    range: { min: 0, max: 80, step: 1 },
  },
  "--glow-star-strength": {
    label: "Star glow strength",
    range: { min: 0, max: 100, step: 1 },
  },
  "--sky-mid-stop": {
    label: "Sky midpoint",
    hint: "Where the mid-blue sits between zenith and horizon",
    range: { min: 5, max: 95, step: 1 },
  },
  "--sky-horizon-glow-width": {
    label: "Horizon glow width",
    range: { min: 40, max: 250, step: 1 },
  },
  "--sky-horizon-glow-height": {
    label: "Horizon glow height",
    range: { min: 0, max: 150, step: 1 },
  },
  "--sky-stars-opacity": {
    label: "Stars visibility",
    range: { min: 0, max: 1, step: 0.01 },
  },
  "--sky-clouds-opacity": {
    label: "Clouds visibility",
    range: { min: 0, max: 1, step: 0.01 },
  },
  "--horizon-height": { label: "Horizon band height" },
  "--ambient-tempo": {
    label: "Ambient tempo",
    hint: "Above 1 is slower, below 1 is livelier",
    range: { min: 0.2, max: 4, step: 0.05 },
  },
  "--corner-sm": { range: { min: 0, max: 40, step: 1 } },
  "--corner-md": { range: { min: 0, max: 40, step: 1 } },
  "--corner-lg": { range: { min: 0, max: 60, step: 1 } },
  "--button-radius": {
    label: "Button radius",
    hint: "999px is a pill",
    range: { min: 0, max: 999, step: 1 },
  },
  "--button-height": {
    range: { min: 44, max: 80, step: 1 },
    hint: "Never below 44px",
  },
  "--input-height": {
    range: { min: 44, max: 80, step: 1 },
    hint: "Never below 44px",
  },
  "--seat-size": { range: { min: 44, max: 120, step: 1 } },
  "--seat-cell": { range: { min: 60, max: 200, step: 1 } },
  "--skycard-height": { range: { min: 300, max: 800, step: 1 } },
  "--moon-size": { range: { min: 24, max: 80, step: 1 } },
};

function groupOf(name: string): GroupId {
  if (name.startsWith("--starlit-")) return "palette";
  if (SEMANTIC.has(name)) return "semantic";
  if (/^--(art-(sky|star|moon|cloud))/.test(name)) return "art-sky";
  if (/^--art-(hill|ground|river|tree)/.test(name)) return "art-vale";
  if (name.startsWith("--art-")) return "art-camp";
  if (
    /^--(font-|display-|body-font|wordmark|code-tracking|eyebrow|button-weight|label-weight)/.test(
      name,
    )
  )
    return "type";
  if (/^--(corner|button|input)/.test(name)) return "shape";
  if (/^--(panel|chart|bar-bg|glow|surface-raised)/.test(name)) return "panels";
  if (/^--(sky-|horizon)/.test(name)) return "sky";
  if (/^--(seat|ring|skycard|moon)/.test(name)) return "table";
  if (/^--(ease|dur)-/.test(name)) return "motion";
  if (
    /^--(ambient|shoot|drift|fire-breathe|flame|spark|pennant|twinkle)/.test(
      name,
    )
  )
    return "ambient";
  return "other";
}

export function kindOf(value: string): TokenKind {
  const v = value.trim();
  if (isHex(v)) return "color";
  if (/^var\(--[\w-]+\)$/.test(v)) return "ref";
  if (/^(cubic-bezier\(|linear$|ease)/.test(v)) return "easing";
  if (/^-?[\d.]+(px|rem|em)$/.test(v)) return "length";
  if (/^[\d.]+(ms|s)$/.test(v)) return "time";
  if (/^-?[\d.]+%$/.test(v)) return "percent";
  if (/^-?[\d.]+$/.test(v)) return "number";
  return "text";
}

/** "--starlit-night-900" becomes "night 900", "--ink-muted" becomes "ink muted". */
export function labelOf(name: string): string {
  return name.replace(/^--(starlit-|art-)?/, "").replaceAll("-", " ");
}

/** The family of a palette primitive: "--starlit-night-900" is "night". */
export function familyOf(name: string): string | null {
  const match = /^--starlit-([a-z]+)-\d+$/.exec(name);
  return match?.[1] ?? null;
}

/** A slider range from the default when no META entry gives one. */
function guessRange(value: string, kind: TokenKind): TokenDef["range"] {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return undefined;
  switch (kind) {
    case "time": {
      const ms = value.endsWith("ms");
      if (ms) return { min: 0, max: Math.max(1000, n * 4), step: 10 };
      return { min: 0, max: Math.max(2, n * 4), step: n >= 20 ? 1 : 0.1 };
    }
    case "percent":
      return { min: 0, max: 100, step: 1 };
    case "length": {
      const unit = value.replace(/^-?[\d.]+/, "");
      if (unit === "px")
        return { min: 0, max: Math.max(40, Math.ceil(n * 3)), step: 1 };
      return { min: -1, max: Math.max(1, n * 4), step: 0.01 };
    }
    case "number":
      return { min: 0, max: Math.max(1, n * 4), step: n >= 10 ? 1 : 0.05 };
    default:
      return undefined;
  }
}

export function defineToken(
  name: string,
  base: string,
  wide?: string,
): TokenDef {
  const value = normalizeHex(base) ?? base.trim();
  const meta = META[name] ?? {};
  const kind = meta.kind ?? kindOf(value);
  return {
    name,
    base: value,
    ...(wide === undefined ? {} : { wide: normalizeHex(wide) ?? wide.trim() }),
    kind,
    group: meta.group ?? groupOf(name),
    label: meta.label ?? labelOf(name),
    ...(meta.hint ? { hint: meta.hint } : {}),
    ...(meta.options
      ? { options: meta.options }
      : kind === "easing"
        ? { options: EASING_OPTIONS }
        : {}),
    ...((meta.range ?? guessRange(value, kind))
      ? { range: meta.range ?? guessRange(value, kind) }
      : {}),
  };
}

/** Raw declarations, as read from a stylesheet or parsed from CSS text. */
export interface Declarations {
  base: Map<string, string>;
  wide: Map<string, string>;
}

export function buildCatalog({ base, wide }: Declarations): Catalog {
  const out = new Map<string, TokenDef>();
  for (const [name, value] of base) {
    out.set(name, defineToken(name, value, wide.get(name)));
  }
  return out;
}

/*
 * Duck-typed on purpose: the studio reads rules from an iframe, whose rules
 * are instances of the iframe's CSSStyleRule, not this window's.
 */
function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return "selectorText" in rule && "style" in rule;
}

function isMediaRule(rule: CSSRule): rule is CSSMediaRule {
  return "conditionText" in rule && "media" in rule;
}

function childRules(rule: CSSRule): CSSRuleList | null {
  return "cssRules" in rule ? (rule as CSSGroupingRule).cssRules : null;
}

function collect(
  rules: CSSRuleList,
  inWide: boolean,
  into: Declarations,
): void {
  for (const rule of Array.from(rules)) {
    if (isStyleRule(rule)) {
      if (rule.selectorText.trim() !== THEME_SELECTOR) continue;
      const target = inWide ? into.wide : into.base;
      for (const prop of Array.from(rule.style)) {
        if (prop.startsWith("--"))
          target.set(prop, rule.style.getPropertyValue(prop).trim());
      }
    } else if (isMediaRule(rule)) {
      const text = rule.conditionText.replace(/\s+/g, " ");
      if (text.includes("prefers-reduced-motion")) continue;
      if (
        text.includes("min-width: 1024px") ||
        text.includes("width >= 1024px")
      ) {
        collect(rule.cssRules, true, into);
      }
    } else {
      const children = childRules(rule);
      if (children) collect(children, inWide, into);
    }
  }
}

/** Read the theme's declarations from a document's stylesheets. */
export function readDeclarations(doc: Document): Declarations {
  const into: Declarations = { base: new Map(), wide: new Map() };
  for (const sheet of Array.from(doc.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    collect(rules, false, into);
  }
  return into;
}
