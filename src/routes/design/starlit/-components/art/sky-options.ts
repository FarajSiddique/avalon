/** The parts of the sky that are drawn from numbers rather than tokens. */
export interface SkyOptions {
  starCount: number;
  starSeed: number;
  /** Above 1 crowds the stars toward the top of the sky. */
  starTopBias: number;
  /** One star in this many twinkles. */
  twinkleEvery: number;
  /** Multiplies the number of lights in each hamlet along the valley. */
  lightsDensity: number;
  lightsSeed: number;
}

export const DEFAULT_SKY: SkyOptions = {
  starCount: 430,
  starSeed: 1136,
  starTopBias: 1.35,
  twinkleEvery: 5,
  lightsDensity: 1,
  lightsSeed: 52,
};
