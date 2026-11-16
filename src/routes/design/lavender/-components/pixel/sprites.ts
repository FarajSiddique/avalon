/**
 * Every sprite in the Lavender Vigil direction, as rows of characters plus a
 * colour key. Original work drawn for this repo. "." is transparent.
 *
 * Icons use one character, "c", which maps to `currentColor`, so an icon
 * takes the colour of the text around it.
 */

import type { Palette, Sprite, SpriteRows } from "./pixel-canvas";

const ARMOUR: Palette = {
  o: "var(--art-outline)",
  s: "var(--art-steel)",
  d: "var(--art-steel-shade)",
  h: "var(--art-steel-light)",
  v: "var(--art-outline)",
  g: "var(--art-trim)",
  p: "var(--plume-1)",
  q: "var(--plume-1-tip)",
};

/** The mascot: a great helm with a plume. Also every seat's avatar. */
export const HELM: Sprite = {
  palette: ARMOUR,
  rows: [
    "....pppqq...",
    "...pppppqqq.",
    "...oooooopq.",
    "..ohhsssdoq.",
    ".ohsssssddo.",
    ".osssssssdo.",
    ".osvvvvvvdo.",
    ".osssvvssdo.",
    ".osdsvvsddo.",
    ".osssvvssdo.",
    "..osssssdo..",
    "...oooooo...",
  ],
};

/** A seated knight's body. Drawn under HELM in the camp scene. */
export const KNIGHT_BODY: Sprite = {
  palette: { ...ARMOUR, c: "var(--plume-1)" },
  rows: [
    ".oddssssddo.",
    "osdosccsodso",
    "osdosccsodso",
    ".oossccssoo.",
    "oddddooddddo",
    ".oooo..oooo.",
  ],
};

const FLAME: Palette = {
  c: "var(--art-flame-core)",
  y: "var(--art-flame)",
  f: "var(--art-flame-outer)",
  r: "var(--art-flame-base)",
};

/** Three frames of the campfire flame, played in a loop. */
export const FLAME_FRAMES: readonly Sprite[] = [
  {
    palette: FLAME,
    rows: [
      "............",
      ".....y......",
      ".....yf.....",
      "....yff.....",
      "....fyf.f...",
      "...ffyyff...",
      "...fyycyf...",
      "..ffyccyff..",
      "..fyyccyyf..",
      "..rfyccyfr..",
      "...rfyyfr...",
      "....rrrr....",
    ],
  },
  {
    palette: FLAME,
    rows: [
      "............",
      "......y.....",
      "....f.yy....",
      "....ffyf....",
      "...ffyyf....",
      "...fyyyff...",
      "..ffycyyf...",
      "..fyyccyff..",
      "..fyccyyyf..",
      "..rfyccyfr..",
      "...rfyyfr...",
      "....rrrr....",
    ],
  },
  {
    palette: FLAME,
    rows: [
      ".......y....",
      "......f.....",
      ".....fy.....",
      "....fyyf....",
      "....fyyff...",
      "...ffycyf...",
      "..ffyyccff..",
      "..fyyccyyf..",
      "..fyyccyyf..",
      "..rfyccyfr..",
      "...rfyyfr...",
      "....rrrr....",
    ],
  },
];

/** Logs and a ring of stones. The flame sits on top, two rows up. */
export const FIRE_BASE: Sprite = {
  palette: {
    l: "var(--art-wood)",
    L: "var(--art-wood-shade)",
    s: "var(--art-stone)",
    S: "var(--art-stone-shade)",
  },
  rows: [
    "...l........l...",
    ".s.llLllllLll.s.",
    "sSsLllLLLLllLsSs",
    ".SS.SsS..SsS.SS.",
  ],
};

export const STAR_BIG: Sprite = {
  palette: { c: "var(--art-star)", d: "var(--art-star-dim)" },
  rows: ["..c..", "..d..", "cdcdc", "..d..", "..c.."],
};

/** The Success card's picture. */
export const GRAIL: Sprite = {
  palette: {
    o: "var(--art-outline)",
    g: "var(--art-flame)",
    G: "var(--art-flame-outer)",
    h: "var(--art-flame-core)",
  },
  rows: [
    ".ooooooooooo.",
    "ogggggggggggo",
    "oghggggggggGo",
    "oghggggggggGo",
    "oghgggggggGGo",
    ".oghgggggGGo.",
    ".ogggggggGGo.",
    "..ogggggGGo..",
    "...oogGGoo...",
    ".....oGo.....",
    ".....oGo.....",
    "....ogGGo....",
    "..oogggGGoo..",
    ".ogggggggGGo.",
    ".ooooooooooo.",
  ],
};

/** The Fail card's picture. */
export const SKULL: Sprite = {
  palette: {
    o: "var(--art-outline)",
    w: "var(--art-steel-light)",
    s: "var(--art-tent)",
  },
  rows: [
    "...ooooooo...",
    "..owwwwwwso..",
    ".owwwwwwwwso.",
    "owwwwwwwwwwso",
    "owooowwwooowo",
    "owooowwwooowo",
    "owwoowwwoowso",
    "owwwwwowwwwso",
    ".owwwwooowso.",
    "..owwwwwwso..",
    "..owowowoso..",
    "..owowowoso..",
    "...ooooooo...",
    ".............",
    ".............",
  ],
};

const ICON: Palette = { c: "currentColor" };

function icon(rows: SpriteRows): Sprite {
  return { palette: ICON, rows };
}

export const ICONS = {
  /** Approve, ready, done. */
  check: icon([
    ".......c",
    "......cc",
    ".....cc.",
    "c...cc..",
    "cc.cc...",
    ".ccc....",
    "..c.....",
  ]),
  /** Reject. */
  cross: icon([
    "c.....c",
    "cc...cc",
    ".cc.cc.",
    "..ccc..",
    ".cc.cc.",
    "cc...cc",
    "c.....c",
  ]),
  /** Good. */
  shield: icon([
    "ccccccc",
    "ccc.ccc",
    "c.....c",
    "ccc.ccc",
    "ccc.ccc",
    ".cc.cc.",
    "..ccc..",
    "...c...",
  ]),
  /** Evil: a horned mask. */
  horns: icon([
    "c.......c",
    "cc.....cc",
    "ccc...ccc",
    ".ccccccc.",
    ".c..c..c.",
    ".ccccccc.",
    "..cc.cc..",
    "...c.c...",
  ]),
  /** Success: the grail. */
  grail: icon([
    "ccccccc",
    "c.ccccc",
    "c.ccccc",
    ".ccccc.",
    "..ccc..",
    "...c...",
    "..ccc..",
    ".ccccc.",
  ]),
  /** Fail: a skull. */
  skull: icon([
    ".ccccc.",
    "ccccccc",
    "c..c..c",
    "c..c..c",
    "ccc.ccc",
    ".ccccc.",
    ".c.c.c.",
    ".c.c.c.",
  ]),
  /** Leader. */
  crown: icon(["c..c..c", "cc.c.cc", "ccccccc", "c.c.c.c", "ccccccc"]),
  /** On the quest team. */
  sword: icon([
    "...c...",
    "..ccc..",
    "..ccc..",
    "..ccc..",
    "..ccc..",
    "ccccccc",
    "...c...",
    "...c...",
  ]),
  /** Locked in. */
  lock: icon([
    "..ccc..",
    ".c...c.",
    ".c...c.",
    "ccccccc",
    "ccc.ccc",
    "ccc.ccc",
    "ccccccc",
  ]),
  /** Waiting. */
  hourglass: icon([
    "ccccccc",
    ".c...c.",
    "..ccc..",
    "...c...",
    "..c.c..",
    ".c.c.c.",
    "ccccccc",
  ]),
  /** Away: asleep under the moon. */
  moon: icon([
    "..ccc..",
    ".cc....",
    "cc.....",
    "cc.....",
    "cc....c",
    ".cc..cc",
    "..cccc.",
  ]),
  /** Copy. */
  copy: icon([
    "..cccccc",
    "..c....c",
    "ccccc..c",
    "c...c..c",
    "c...c..c",
    "c...cccc",
    "c...c...",
    "ccccc...",
  ]),
  /** Private: an eye. */
  eye: icon([
    "..ccccc..",
    ".c.....c.",
    "c..ccc..c",
    "c..ccc..c",
    ".c.....c.",
    "..ccccc..",
  ]),
  /** Cursor pointing right. */
  arrowRight: icon(["c...", "cc..", "ccc.", "cccc", "ccc.", "cc..", "c..."]),
  /** Cursor pointing down. */
  arrowDown: icon(["ccccccc", ".ccccc.", "..ccc..", "...c..."]),
  /** A sealed vote or card: something is inside, you cannot see what. */
  sealed: icon([
    "ccccccc",
    "cc...cc",
    "c.c.c.c",
    "c..c..c",
    "c.....c",
    "ccccccc",
  ]),
  /** One pip of a counter. */
  pip: icon([".ccc.", "ccccc", "ccccc", "ccccc", ".ccc."]),
  /** An empty pip. */
  pipEmpty: icon([".ccc.", "c...c", "c...c", "c...c", ".ccc."]),
} as const satisfies Record<string, Sprite>;

export type IconName = keyof typeof ICONS;

/** Plume colours by seat. Seven here; the full game cycles with crest shapes. */
export const PLUME_COUNT = 7;

export function plumePalette(seatIndex: number): Palette {
  const n = (seatIndex % PLUME_COUNT) + 1;
  return {
    p: `var(--plume-${n})`,
    q: `var(--plume-${n}-tip)`,
    c: `var(--plume-${n})`,
  };
}
