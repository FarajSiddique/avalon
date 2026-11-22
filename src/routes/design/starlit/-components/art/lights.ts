import { round, seededRandom } from "./seeded";

interface ValleyLight {
  x: number;
  y: number;
  r: number;
  warm: boolean;
}

/** Tiny village lights, gathered into clusters like hamlets seen from a hill. */
export function makeValleyLights(
  clusters: ReadonlyArray<readonly [x: number, y: number, count: number]>,
  seed: number,
  spread: { x: number; y: number } = { x: 34, y: 9 },
): Array<ValleyLight> {
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
