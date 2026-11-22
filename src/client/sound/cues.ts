import { pitch, triadDegree } from "./scale";
import { breath, chime, glide, harp, pad, thump } from "./synth";

/**
 * Every sound the game can make, by name. Each cue is a small score written
 * against the instruments in `synth.ts`, so it can be rendered into any
 * BaseAudioContext: the live one in the browser, or an OfflineAudioContext
 * for measuring.
 *
 * Privacy: a neighbour can hear your phone. Cues that follow a secret choice
 * (`clouds-part`, `constellation`, `vote-lock`, `card-play`) are the same for
 * every role, every vote and every card.
 */
export const CUE_NAMES = [
  // Small responses to a tap (under about 400ms)
  "tap",
  "toggle-on",
  "toggle-off",
  "sound-on",
  "copy",
  "ready",
  "unready",
  "pick",
  "unpick",
  "vote-in",
  "deal",
  "card-in",
  "score",
  "assassin-aim",
  // Things that happen to the table
  "join",
  "away",
  "back",
  "reconnected",
  "all-ready",
  "start",
  "title",
  "shooting-star",
  // The private role card
  "clouds-part",
  "constellation",
  "clouds-close",
  "confirm",
  "all-confirmed",
  // A round
  "crown",
  "team-complete",
  "propose",
  "vote-lock",
  "suspense",
  "votes-turn",
  "approved",
  "rejected",
  "track-advance",
  "card-play",
  "shuffle",
  "card-success",
  "card-fail",
  "quest-success",
  "quest-fail",
  "crown-pass",
  // The end of the game
  "assassin-strike",
  "good-wins",
  "evil-wins",
] as const;

export type CueName = (typeof CUE_NAMES)[number];

export interface CueOptions {
  /** Seconds from now. Sequences schedule on the audio clock, not timers. */
  delay?: number;
  /** For cues that climb: the seat that joined, the pick count, the star. */
  index?: number;
}

interface CueSpec {
  /** Seconds until the last voice has died away. */
  length: number;
  /** A short buzz on phones that support it (not iPhone). */
  vibrate?: ReadonlyArray<number>;
  render: (
    context: BaseAudioContext,
    out: AudioNode,
    at: number,
    index: number,
  ) => void;
}

/** A quick paper flick: cards, tokens. */
function flick(
  context: BaseAudioContext,
  out: AudioNode,
  at: number,
  centre = 2200,
  gain = 0.05,
  offset = 0,
): void {
  breath(context, out, at, 0.11, {
    from: centre,
    to: centre * 0.6,
    gain: gain * 1.8,
    q: 1.4,
    offset,
  });
}

/** Notes one after another. */
function run(
  degrees: ReadonlyArray<number>,
  gap: number,
  play: (frequency: number, at: number, index: number) => void,
  at: number,
): void {
  degrees.forEach((degree, index) =>
    play(pitch(degree), at + gap * index, index),
  );
}

export const CUES: Record<CueName, CueSpec> = {
  /* ------------------------------------------------------------- small */

  tap: {
    length: 0.3,
    render: (c, out, at) =>
      harp(c, out, at, pitch(7), { gain: 0.07, decay: 0.24 }),
  },
  "toggle-on": {
    length: 0.36,
    render: (c, out, at) =>
      run(
        [5, 7],
        0.07,
        (f, t) => chime(c, out, t, f, { gain: 0.08, decay: 0.26 }),
        at,
      ),
  },
  "toggle-off": {
    length: 0.36,
    render: (c, out, at) =>
      run(
        [7, 4],
        0.07,
        (f, t) => chime(c, out, t, f, { gain: 0.07, decay: 0.24, dark: true }),
        at,
      ),
  },
  "sound-on": {
    length: 0.42,
    render: (c, out, at) =>
      run(
        [3, 5, 7],
        0.06,
        (f, t) => chime(c, out, t, f, { gain: 0.08, decay: 0.28 }),
        at,
      ),
  },
  copy: {
    length: 0.36,
    render: (c, out, at) =>
      run(
        [8, 10],
        0.08,
        (f, t) => chime(c, out, t, f, { gain: 0.08, decay: 0.26 }),
        at,
      ),
  },
  ready: {
    length: 0.4,
    render: (c, out, at) =>
      run(
        [5, 7],
        0.06,
        (f, t) => harp(c, out, t, f, { gain: 0.09, decay: 0.32 }),
        at,
      ),
  },
  unready: {
    length: 0.3,
    render: (c, out, at) =>
      harp(c, out, at, pitch(4), { gain: 0.08, decay: 0.26, dark: true }),
  },
  pick: {
    length: 0.4,
    render: (c, out, at, index) =>
      harp(c, out, at, pitch(3 + Math.min(index, 6)), {
        gain: 0.09,
        decay: 0.36,
      }),
  },
  unpick: {
    length: 0.3,
    render: (c, out, at) =>
      harp(c, out, at, pitch(1), { gain: 0.07, decay: 0.26, dark: true }),
  },
  "vote-in": {
    length: 0.22,
    render: (c, out, at, index) => {
      flick(c, out, at, 3200, 0.025, index * 0.17);
      chime(c, out, at + 0.01, pitch(8), {
        gain: 0.035,
        decay: 0.16,
        dark: true,
      });
    },
  },
  deal: {
    length: 0.26,
    render: (c, out, at) => {
      flick(c, out, at, 2000, 0.045, 0.1);
      flick(c, out, at + 0.09, 2400, 0.04, 0.7);
    },
  },
  "card-in": {
    length: 0.26,
    render: (c, out, at, index) => {
      flick(c, out, at, 1800, 0.035, 0.3 + index * 0.2);
      thump(c, out, at + 0.05, { gain: 0.05, frequency: 150 });
    },
  },
  score: {
    length: 0.36,
    render: (c, out, at) =>
      chime(c, out, at, pitch(10), { gain: 0.06, decay: 0.3 }),
  },
  "assassin-aim": {
    length: 0.26,
    render: (c, out, at) =>
      harp(c, out, at, pitch(-3), { gain: 0.07, decay: 0.22, dark: true }),
  },

  /* ------------------------------------------------------------ the table */

  join: {
    // Long tail on purpose: joins overlap into one chord.
    length: 1.75,
    render: (c, out, at, index) =>
      chime(c, out, at, pitch(triadDegree(index)), { gain: 0.075, decay: 1.6 }),
  },
  away: {
    length: 0.7,
    render: (c, out, at) =>
      run(
        [-1, -3],
        0.12,
        (f, t) => harp(c, out, t, f, { gain: 0.07, decay: 0.5, dark: true }),
        at,
      ),
  },
  back: {
    length: 0.6,
    render: (c, out, at) =>
      run(
        [-2, 0],
        0.1,
        (f, t) => harp(c, out, t, f, { gain: 0.08, decay: 0.45 }),
        at,
      ),
  },
  reconnected: {
    length: 0.62,
    render: (c, out, at) =>
      run(
        [-2, 0, 3],
        0.07,
        (f, t) => harp(c, out, t, f, { gain: 0.08, decay: 0.45 }),
        at,
      ),
  },
  "all-ready": {
    length: 1.85,
    render: (c, out, at) => {
      run(
        [0, 2, 3, 5, 7],
        0.07,
        (f, t) => chime(c, out, t, f, { gain: 0.06, decay: 1.4 }),
        at,
      );
      pad(c, out, at, [pitch(0), pitch(3)], 1.8, { gain: 0.022, attack: 0.25 });
    },
  },
  start: {
    length: 2.45,
    render: (c, out, at) => {
      pad(c, out, at, [pitch(-5), pitch(-2), pitch(0)], 2.4, {
        gain: 0.022,
        attack: 0.45,
      });
      breath(c, out, at, 1.2, { from: 400, to: 2400, gain: 0.018, q: 0.8 });
      run(
        [3, 5, 7, 10],
        0.15,
        (f, t) => harp(c, out, t, f, { gain: 0.07, decay: 1 }),
        at + 0.9,
      );
    },
  },
  title: {
    length: 1.45,
    render: (c, out, at) =>
      run(
        [0, 3, 5],
        0.11,
        (f, t) => chime(c, out, t, f, { gain: 0.055, decay: 1.2 }),
        at,
      ),
  },
  "shooting-star": {
    length: 0.8,
    render: (c, out, at) => {
      glide(c, out, at, pitch(12), pitch(5), 0.7, 0.03);
      breath(c, out, at, 0.6, { from: 6000, to: 3000, gain: 0.02, q: 2 });
    },
  },

  /* ---------------------------------------------------------- the role card */

  "clouds-part": {
    length: 0.66,
    render: (c, out, at) => {
      breath(c, out, at, 0.6, { from: 300, to: 1800, gain: 0.2, q: 0.8 });
      breath(c, out, at + 0.04, 0.5, {
        from: 500,
        to: 3000,
        gain: 0.09,
        q: 1,
        offset: 0.5,
      });
    },
  },
  constellation: {
    // One note per line of the drawing, then the bright star. The same for
    // every role, so a neighbour learns nothing from it.
    length: 1.9,
    render: (c, out, at) => {
      run(
        [5, 6, 7, 8, 9],
        0.12,
        (f, t) => chime(c, out, t, f, { gain: 0.045, decay: 0.55 }),
        at + 0.2,
      );
      chime(c, out, at + 1.15, pitch(10), { gain: 0.06, decay: 0.7 });
    },
  },
  "clouds-close": {
    length: 0.36,
    render: (c, out, at) =>
      breath(c, out, at, 0.32, {
        from: 1600,
        to: 400,
        gain: 0.15,
        q: 0.8,
        offset: 1.1,
      }),
  },
  confirm: {
    length: 0.45,
    render: (c, out, at) =>
      run(
        [3, 5],
        0.08,
        (f, t) => harp(c, out, t, f, { gain: 0.09, decay: 0.36 }),
        at,
      ),
  },
  "all-confirmed": {
    length: 1.4,
    render: (c, out, at) =>
      run(
        [0, 3, 5, 7],
        0.06,
        (f, t) => chime(c, out, t, f, { gain: 0.06, decay: 1.2 }),
        at,
      ),
  },

  /* --------------------------------------------------------------- a round */

  crown: {
    length: 0.66,
    render: (c, out, at) => {
      run(
        [10, 12],
        0.09,
        (f, t) => chime(c, out, t, f, { gain: 0.06, decay: 0.5 }),
        at,
      );
      breath(c, out, at, 0.22, { from: 5200, gain: 0.008, q: 3 });
    },
  },
  "team-complete": {
    length: 1.05,
    render: (c, out, at) =>
      run(
        [5, 7, 8],
        0.035,
        (f, t) => chime(c, out, t, f, { gain: 0.06, decay: 0.95 }),
        at,
      ),
  },
  propose: {
    length: 0.76,
    render: (c, out, at) => {
      glide(c, out, at, pitch(5), pitch(8), 0.25, 0.026);
      chime(c, out, at + 0.2, pitch(10), { gain: 0.07, decay: 0.5 });
    },
  },
  "vote-lock": {
    // The same for Approve and Reject: a neighbour can hear it.
    length: 0.45,
    vibrate: [14],
    render: (c, out, at) => {
      thump(c, out, at, { gain: 0.14, frequency: 120 });
      chime(c, out, at + 0.04, pitch(5), { gain: 0.06, decay: 0.36 });
    },
  },
  suspense: {
    length: 0.86,
    render: (c, out, at) => {
      pad(c, out, at, [pitch(-5), pitch(-2)], 0.84, {
        gain: 0.035,
        dark: true,
        attack: 0.85,
      });
      breath(c, out, at, 0.8, { from: 200, to: 600, gain: 0.012, q: 0.7 });
    },
  },
  "votes-turn": {
    length: 0.62,
    render: (c, out, at) => {
      flick(c, out, at, 2600, 0.04, 0.9);
      run(
        [5, 6, 7, 8, 9, 10, 11],
        0.02,
        (f, t) => harp(c, out, t, f, { gain: 0.035, decay: 0.45 }),
        at + 0.01,
      );
    },
  },
  approved: {
    length: 1.42,
    render: (c, out, at) => {
      run(
        [5, 7, 8, 10],
        0.09,
        (f, t) => chime(c, out, t, f, { gain: 0.06, decay: 0.9 }),
        at,
      );
      pad(c, out, at, [pitch(0), pitch(2), pitch(3)], 1.35, { gain: 0.018 });
    },
  },
  rejected: {
    length: 1.42,
    render: (c, out, at) => {
      run(
        [7, 5, 4, -1],
        0.1,
        (f, t) => harp(c, out, t, f, { gain: 0.07, decay: 0.8, dark: true }),
        at,
      );
      pad(c, out, at, [pitch(-6), pitch(-3)], 1.35, { gain: 0.03, dark: true });
    },
  },
  "track-advance": {
    length: 0.6,
    render: (c, out, at) => {
      chime(c, out, at, pitch(-1), { gain: 0.07, decay: 0.5, dark: true });
      thump(c, out, at, { gain: 0.07, frequency: 80 });
    },
  },
  "card-play": {
    // The same for Success and Fail: a neighbour can hear it.
    length: 0.8,
    vibrate: [16],
    render: (c, out, at) => {
      flick(c, out, at, 2400, 0.05, 0.2);
      breath(c, out, at + 0.14, 0.42, {
        from: 900,
        to: 300,
        gain: 0.035,
        q: 0.8,
        offset: 1.3,
      });
      thump(c, out, at + 0.54, { gain: 0.1, frequency: 95 });
    },
  },
  shuffle: {
    length: 0.5,
    render: (c, out, at) =>
      [0, 0.08, 0.17, 0.24, 0.33].forEach((t, index) =>
        flick(c, out, at + t, 1900 + (index % 3) * 350, 0.035, index * 0.31),
      ),
  },
  "card-success": {
    length: 0.62,
    render: (c, out, at) => {
      flick(c, out, at, 2600, 0.03, 0.4);
      harp(c, out, at + 0.03, pitch(8), { gain: 0.08, decay: 0.55 });
    },
  },
  "card-fail": {
    length: 0.62,
    render: (c, out, at) => {
      flick(c, out, at, 2600, 0.03, 1.4);
      harp(c, out, at + 0.03, pitch(-1), {
        gain: 0.09,
        decay: 0.55,
        dark: true,
      });
      thump(c, out, at + 0.03, { gain: 0.06, frequency: 70 });
    },
  },
  "quest-success": {
    length: 2.6,
    render: (c, out, at) => {
      run(
        [3, 5, 7, 10],
        0.12,
        (f, t) => chime(c, out, t, f, { gain: 0.06, decay: 1.3 }),
        at,
      );
      pad(c, out, at + 0.1, [pitch(0), pitch(3), pitch(5), pitch(7)], 2.45, {
        gain: 0.022,
        attack: 0.25,
      });
      breath(c, out, at + 0.4, 1.2, {
        from: 6500,
        gain: 0.005,
        q: 3,
        offset: 0.8,
      });
    },
  },
  "quest-fail": {
    length: 2.6,
    render: (c, out, at) => {
      run(
        [7, 4, 2, -1],
        0.14,
        (f, t) => harp(c, out, t, f, { gain: 0.07, decay: 1.1, dark: true }),
        at,
      );
      pad(c, out, at + 0.1, [pitch(-6), pitch(-3), pitch(-1), pitch(0)], 2.45, {
        gain: 0.03,
        dark: true,
        attack: 0.3,
      });
      thump(c, out, at + 0.56, { gain: 0.08, frequency: 70 });
    },
  },
  "crown-pass": {
    length: 0.76,
    render: (c, out, at) => {
      glide(c, out, at, pitch(5), pitch(8), 0.35, 0.022);
      chime(c, out, at + 0.3, pitch(10), { gain: 0.06, decay: 0.42 });
    },
  },

  /* ------------------------------------------------------ the end of game */

  "assassin-strike": {
    length: 1.45,
    render: (c, out, at) => {
      breath(c, out, at, 0.25, { from: 3000, to: 600, gain: 0.04, q: 1 });
      harp(c, out, at + 0.2, pitch(-1), { gain: 0.09, decay: 0.9, dark: true });
      thump(c, out, at + 0.2, { gain: 0.08, frequency: 70 });
      pad(c, out, at + 0.2, [pitch(-6), pitch(-5)], 1.2, {
        gain: 0.028,
        dark: true,
      });
    },
  },
  "good-wins": {
    length: 2.95,
    render: (c, out, at) => {
      pad(c, out, at, [pitch(-5), pitch(-2), pitch(0), pitch(2)], 2.9, {
        gain: 0.026,
        attack: 0.4,
      });
      run(
        [0, 2, 3, 5, 7, 8, 10],
        0.17,
        (f, t) => chime(c, out, t, f, { gain: 0.055, decay: 1 }),
        at + 0.25,
      );
    },
  },
  "evil-wins": {
    length: 2.95,
    render: (c, out, at) => {
      pad(c, out, at, [pitch(-6), pitch(-3), pitch(-1), pitch(0)], 2.9, {
        gain: 0.024,
        dark: true,
        attack: 0.3,
      });
      run(
        [8, 6, 4, 2, 1, -1],
        0.22,
        (f, t) => harp(c, out, t, f, { gain: 0.065, decay: 1, dark: true }),
        at + 0.2,
      );
      thump(c, out, at + 1.42, { gain: 0.06, frequency: 60 });
    },
  },
};

/** Schedule one cue on any context, starting at `at` on that context's clock. */
export function renderCue(
  context: BaseAudioContext,
  out: AudioNode,
  cue: CueName,
  at: number,
  index = 0,
): void {
  CUES[cue].render(context, out, at, index);
}
