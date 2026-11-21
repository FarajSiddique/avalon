import type { BackdropStyle } from "./scene-options";

/**
 * Where each backdrop puts the camp and the castle, in the 1440 by 700
 * drawing. The camp (tent, banner, fire, seats, sword) is drawn at its
 * original place in the vale and moved by `camp`. The castle is drawn with
 * its foot at `castle.x, castle.y`, scaled by `castle.scale`.
 */
export interface BackdropLayout {
  camp: { dx: number; dy: number };
  castle: { x: number; y: number; scale: number };
}

/** The castle's foot in the original drawing. */
export const CASTLE_ORIGIN = { x: 742, y: 353 } as const;

export const BACKDROP_LAYOUT: Record<BackdropStyle, BackdropLayout> = {
  vale: { camp: { dx: 0, dy: 0 }, castle: { x: 742, y: 353, scale: 1 } },
  lake: { camp: { dx: 110, dy: 60 }, castle: { x: 790, y: 420, scale: 1.35 } },
  coast: { camp: { dx: 150, dy: 0 }, castle: { x: 800, y: 334, scale: 1 } },
  forest: { camp: { dx: 60, dy: 40 }, castle: { x: 830, y: 372, scale: 0.7 } },
  peaks: { camp: { dx: 120, dy: 52 }, castle: { x: 830, y: 272, scale: 1.1 } },
};

/** The transform that puts the castle where a backdrop wants it. */
export function castleTransform(backdrop: BackdropStyle): string | undefined {
  const { x, y, scale } = BACKDROP_LAYOUT[backdrop].castle;
  if (x === CASTLE_ORIGIN.x && y === CASTLE_ORIGIN.y && scale === 1)
    return undefined;
  return `translate(${x} ${y}) scale(${scale}) translate(${-CASTLE_ORIGIN.x} ${-CASTLE_ORIGIN.y})`;
}

export function campTransform(backdrop: BackdropStyle): string | undefined {
  const { dx, dy } = BACKDROP_LAYOUT[backdrop].camp;
  return dx === 0 && dy === 0 ? undefined : `translate(${dx} ${dy})`;
}

/** Close-up crops of each part, in the original drawing. */
const CROPS = {
  tent: [960, 270, 290, 250],
  fire: [730, 410, 240, 170],
  castle: [684, 236, 176, 120],
} as const;

/** A viewBox that frames one part of the camp inside a given backdrop. */
export function cropFor(
  part: keyof typeof CROPS,
  backdrop: BackdropStyle,
): string {
  const [x, y, w, h] = CROPS[part];
  const layout = BACKDROP_LAYOUT[backdrop];
  if (part === "castle") {
    const { x: cx, y: cy, scale } = layout.castle;
    return [
      cx + (x - CASTLE_ORIGIN.x) * scale,
      cy + (y - CASTLE_ORIGIN.y) * scale,
      w * scale,
      h * scale,
    ].join(" ");
  }
  return [x + layout.camp.dx, y + layout.camp.dy, w, h].join(" ");
}
