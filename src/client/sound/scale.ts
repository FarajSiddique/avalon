/**
 * One key for the whole game: D major pentatonic (D E F# A B). Any run of
 * these notes sounds good together, so cues can overlap freely. Its relative
 * minor (B) uses the same five notes, which is how Evil outcomes darken
 * without leaving the key: Good cadences land on D, Evil ones fall to B.
 */
const D4 = 293.665;
const STEPS = [0, 2, 4, 7, 9] as const;

/** Frequency of a scale degree. 0 is D4, 5 is D5, -1 is B3, and so on. */
export function pitch(degree: number): number {
  const octave = Math.floor(degree / STEPS.length);
  const index = ((degree % STEPS.length) + STEPS.length) % STEPS.length;
  const semitones = (STEPS[index] ?? 0) + 12 * octave;
  return D4 * 2 ** (semitones / 12);
}

/**
 * Degrees of the D major triad (D, F#, A) stacked upward. Seat n joining the
 * lobby plays the n-th of these, so a full table builds one big chord.
 */
const TRIAD = [0, 2, 3] as const;

export function triadDegree(index: number): number {
  const safe = Math.max(0, Math.floor(index));
  return (TRIAD[safe % TRIAD.length] ?? 0) + 5 * Math.floor(safe / 3);
}
