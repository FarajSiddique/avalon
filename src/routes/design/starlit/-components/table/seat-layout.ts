import { round } from "../art/seeded";

/** Where one seat's star sits, in percent of the ring's box. */
export interface SeatPoint {
  /** Phone: two staggered rows that still read as a closed loop. */
  mx: number;
  my: number;
  /** Wide screen: a ring around the fire. */
  dx: number;
  dy: number;
  /**
   * Wide screen only: seats on the flanks of the ring put their name beside
   * the star (outside the ring) instead of under it, so neighbours never
   * collide.
   */
  side: "left" | "right" | "none";
}

const MOBILE_TOP = 14.5;
const MOBILE_BOTTOM = 63.5;
/** Alternate seats sit a little lower, so the rows read as a constellation. */
const MOBILE_STAGGER = 3.2;

/**
 * Seat positions for 5 to 10 players, in clockwise seat order. On a phone
 * the first half sits left to right along the top and the rest comes back
 * right to left underneath, so joining the seats in order still draws a ring.
 */
export function seatLayout(count: number): SeatPoint[] {
  const top = Math.ceil(count / 2);
  const bottom = count - top;
  return Array.from({ length: count }, (_, index) => {
    const angle = ((-90 + (index * 360) / count) * Math.PI) / 180;
    const reach = Math.cos(angle);
    const desktop = {
      dx: round(50 + 29 * reach),
      dy: round(43 + 31 * Math.sin(angle)),
      side: reach > 0.5 ? "right" : reach < -0.5 ? "left" : "none",
    } as const;
    if (index < top) {
      return {
        mx: round(((index + 0.5) / top) * 100),
        my: MOBILE_TOP + (index % 2) * MOBILE_STAGGER,
        ...desktop,
      };
    }
    const fromRight = bottom - 1 - (index - top);
    const mx =
      bottom === top
        ? ((fromRight + 0.5) / bottom) * 100
        : ((fromRight + 1) / (bottom + 1)) * 100;
    return {
      mx: round(mx),
      my: MOBILE_BOTTOM + ((fromRight + 1) % 2) * MOBILE_STAGGER,
      ...desktop,
    };
  });
}

/** How many seats share the widest row on a phone. */
export function seatsPerRow(count: number): number {
  return Math.ceil(count / 2);
}
