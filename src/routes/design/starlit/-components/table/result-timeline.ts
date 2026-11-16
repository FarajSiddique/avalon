/**
 * The quest result as it opens, in milliseconds. Shared by the stage (cards,
 * crown, sound) and the side panel (moon, score) so they stay in step.
 * The whole sequence is under three seconds, and a tap skips it.
 */
export const RESULT_TIMELINE = {
  /** The face-down cards slide over each other. */
  shuffle: 0,
  /** Each card turns; the long gap before the last is the held breath. */
  turns: [600, 950, 1700],
  /** The last card lifts a little while everyone waits. */
  breath: 1050,
  /** Success or failure on the quest's moon, and the words. */
  outcome: 2050,
  score: 2200,
  /** The crown flies to the next leader, and the line saying so rises. */
  crown: 2350,
  /** Everything has settled. */
  end: 2950,
} as const;

/** Votes revealed: a beat of suspense, then every vote turns at once. */
export const REVEAL_TIMELINE = {
  turn: 700,
  tally: 1000,
} as const;

export function ms(value: number): string {
  return `${value}ms`;
}
