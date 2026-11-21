import { Color } from "three";

/** The art tokens a 3D scene draws with. Same palette as the SVG artwork. */
export const ART_TOKENS = [
  "sky-top",
  "sky-mid",
  "sky-low",
  "sky-horizon",
  "star",
  "star-blue",
  "star-pink",
  "star-amber",
  "moon",
  "cloud",
  "cloud-light",
  "cloud-deep",
  "cloud-bright",
  "cloud-edge",
  "cloud-edge-dim",
  "hill-0",
  "hill-1",
  "hill-2",
  "hill-3",
  "hill-4",
  "ground",
  "ground-dark",
  "ground-lit-1",
  "ground-lit-2",
  "ground-lit-3",
  "river",
  "outline",
  "tree",
  "tree-light",
  "trunk",
  "tent",
  "tent-shade",
  "tent-stripe",
  "tent-dark",
  "log",
  "log-end",
  "stone",
  "stone-shade",
  "steel",
  "gold",
  "banner",
  "fire-outer",
  "fire-mid",
  "fire-core",
  "fire-glow",
  "window",
] as const;

export type ArtToken = (typeof ART_TOKENS)[number];
export type Palette = Record<ArtToken, Color>;

/** The token values as written, to tell when a dial has changed them. */
export function readPaletteSource(el: Element): string {
  const style = getComputedStyle(el);
  return ART_TOKENS.map((t) =>
    style.getPropertyValue(`--art-${t}`).trim(),
  ).join("|");
}

/** Resolve every art token on `el` into a colour (linear, as three wants). */
export function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  const out = {} as Palette;
  for (const token of ART_TOKENS) {
    const value = style.getPropertyValue(`--art-${token}`).trim();
    const color = new Color();
    try {
      if (value) color.setStyle(value);
    } catch {
      // An unparseable value leaves the colour black rather than breaking.
    }
    out[token] = color;
  }
  return out;
}
