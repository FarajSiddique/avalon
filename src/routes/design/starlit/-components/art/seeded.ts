/**
 * A tiny seeded random number generator (mulberry32). The artwork uses it so
 * the server and the browser draw exactly the same stars, lights and grass.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Round to two decimals so server and client print the same string. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

type StarTone = "cream" | "blue" | "pink" | "amber";

export const STAR_FILL: Record<StarTone, string> = {
  cream: "var(--art-star)",
  blue: "var(--art-star-blue)",
  pink: "var(--art-star-pink)",
  amber: "var(--art-star-amber)",
};

export interface Star {
  x: number;
  y: number;
  r: number;
  tone: StarTone;
  opacity: number;
  /** Bright stars are drawn as a four-point sparkle instead of a dot. */
  sparkle: boolean;
  /** Seconds. Null for the stars that hold still. */
  twinkle: { duration: number; delay: number } | null;
}

interface StarFieldOptions {
  count: number;
  seed: number;
  width: number;
  height: number;
  /** Above 1 crowds the stars toward the top of the field. */
  topBias?: number;
  /** One star in this many twinkles. */
  twinkleEvery?: number;
}

export function makeStars({
  count,
  seed,
  width,
  height,
  topBias = 1.35,
  twinkleEvery = 5,
}: StarFieldOptions): Array<Star> {
  const random = seededRandom(seed);
  const stars: Array<Star> = [];

  for (let i = 0; i < count; i += 1) {
    const size = random();
    const toneRoll = random();
    const sparkle = size > 0.972;
    const tone: StarTone =
      toneRoll < 0.58
        ? "cream"
        : toneRoll < 0.82
          ? "blue"
          : toneRoll < 0.92
            ? "pink"
            : "amber";

    stars.push({
      x: round(random() * width),
      y: round(random() ** topBias * height),
      r: sparkle ? round(3.4 + random() * 2.4) : round(0.45 + size ** 3 * 1.6),
      tone,
      opacity: round(sparkle ? 0.9 : 0.45 + random() * 0.55),
      sparkle,
      twinkle:
        sparkle || i % twinkleEvery === 0
          ? {
              duration: round(3 + random() * 4.5),
              delay: round(-random() * 7),
            }
          : null,
    });
  }

  return stars;
}

/** A four-point sparkle centred on 0,0 with the given reach. */
export function sparklePath(reach: number): string {
  const r = round(reach);
  const w = round(reach * 0.16);

  return `M0 ${-r}Q${w} ${-w} ${r} 0Q${w} ${w} 0 ${r}Q${-w} ${w} ${-r} 0Q${-w} ${-w} 0 ${-r}Z`;
}
