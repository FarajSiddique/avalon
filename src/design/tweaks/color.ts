/**
 * Colour maths for the tweak studio: hex parsing, OKLCH shifts and WCAG
 * contrast. Pure functions, tested in Node. Prototype-only.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

/** A hue, chroma and lightness adjustment applied in OKLCH. */
export interface ColorShift {
  /** Degrees added to the hue. */
  hue: number;
  /** Multiplies chroma. 1 leaves it alone, 0 is grey. */
  chroma: number;
  /** Added to OKLCH lightness, in percentage points (-100 to 100). */
  lightness: number;
}

export const NO_SHIFT: ColorShift = { hue: 0, chroma: 1, lightness: 0 };

export function isIdentityShift(shift: ColorShift): boolean {
  return shift.hue === 0 && shift.chroma === 1 && shift.lightness === 0;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX.test(value.trim());
}

/** Parse #rgb or #rrggbb. Returns null for anything else. */
export function parseHex(value: string): Rgb | null {
  const match = HEX.exec(value.trim());
  if (!match?.[1]) return null;
  let digits = match[1];
  if (digits.length === 3) {
    digits = [...digits].map((d) => d + d).join("");
  }
  const n = Number.parseInt(digits, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Lower-case #rrggbb, so values from the browser and the picker compare. */
export function normalizeHex(value: string): string | null {
  const rgb = parseHex(value);
  return rgb ? toHex(rgb) : null;
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number): number {
  const v = Math.min(1, Math.max(0, value));
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return c * 255;
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function inGamut([r, g, b]: [number, number, number]): boolean {
  const e = 0.0001;
  return (
    r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e
  );
}

/**
 * OKLCH to sRGB. Out-of-gamut colours keep their hue and lightness and lose
 * chroma until they fit, which looks far better than clipping channels.
 */
export function oklchToRgb(color: Oklch): Rgb {
  let lin = oklchToLinear(color);
  if (!inGamut(lin)) {
    let lo = 0;
    let hi = color.c;
    for (let i = 0; i < 20; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...color, c: mid }))) lo = mid;
      else hi = mid;
    }
    lin = oklchToLinear({ ...color, c: lo });
  }
  return {
    r: fromLinear(lin[0]),
    g: fromLinear(lin[1]),
    b: fromLinear(lin[2]),
  };
}

/** Apply shifts in order. Returns the input untouched when nothing shifts. */
export function shiftHex(hex: string, shifts: readonly ColorShift[]): string {
  const active = shifts.filter((s) => !isIdentityShift(s));
  const rgb = parseHex(hex);
  if (!rgb || active.length === 0) return hex;
  let color = rgbToOklch(rgb);
  for (const shift of active) {
    color = {
      l: Math.min(1, Math.max(0, color.l + shift.lightness / 100)),
      c: Math.max(0, color.c * shift.chroma),
      h: (color.h + shift.hue + 360) % 360,
    };
  }
  return toHex(oklchToRgb(color));
}

function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2 contrast ratio, or null if either colour is not a hex value. */
export function contrastRatio(fg: string, bg: string): number | null {
  const a = parseHex(fg);
  const b = parseHex(bg);
  if (!a || !b) return null;
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `a` at `amount` (0 to 1) over `b`, mixed in sRGB like color-mix(in srgb). */
export function mixHex(a: string, b: string, amount: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return a;
  const mix = (p: number, q: number) => p * amount + q * (1 - amount);
  return toHex({ r: mix(x.r, y.r), g: mix(x.g, y.g), b: mix(x.b, y.b) });
}
