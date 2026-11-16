import { round, seededRandom } from "./seeded";

export interface ValleyLight {
  x: number;
  y: number;
  r: number;
  warm: boolean;
}

/** Tiny village lights, gathered into clusters like hamlets seen from a hill. */
export function makeValleyLights(
  clusters: readonly (readonly [x: number, y: number, count: number])[],
  seed: number,
  spread: { x: number; y: number } = { x: 34, y: 9 },
): ValleyLight[] {
  const random = seededRandom(seed);
  return clusters.flatMap(([cx, cy, count]) =>
    Array.from({ length: count }, () => ({
      x: round(cx + (random() - 0.5) * 2 * spread.x),
      y: round(cy + (random() - 0.5) * 2 * spread.y),
      r: round(1 + random() * 1.3),
      warm: random() > 0.22,
    })),
  );
}

/** A row of grass blades as one path, growing up from `baseY`. */
export function makeGrass(
  fromX: number,
  toX: number,
  baseY: number,
  seed: number,
  height: { min: number; max: number } = { min: 14, max: 44 },
): string {
  const random = seededRandom(seed);
  let d = `M${fromX} ${baseY + 4}`;
  let x = fromX;
  while (x < toX) {
    const width = 7 + random() * 9;
    const tall = height.min + random() * (height.max - height.min);
    const lean = (random() - 0.5) * 14;
    d += `L${round(x)} ${baseY}Q${round(x + width / 2 + lean * 0.3)} ${round(baseY - tall * 0.5)} ${round(x + width / 2 + lean)} ${round(baseY - tall)}Q${round(x + width * 0.7 + lean * 0.2)} ${round(baseY - tall * 0.4)} ${round(x + width)} ${baseY}`;
    x += width;
  }
  return `${d}L${toX} ${baseY + 4}Z`;
}
