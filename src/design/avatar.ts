/**
 * A player's look at the table: a cloak colour, headwear and a chest emblem.
 * Prototype-only for now, but shaped to travel with a seat: when it moves to
 * the room protocol it becomes `avatar` on `SeatView` and on the join input,
 * validated with the same lists.
 *
 * Nothing here may hint at a hidden role or side: no wizard hats or crowns,
 * and none of the Good or Evil colours.
 */

export const CLOAKS = [
  "rose",
  "indigo",
  "river",
  "moss",
  "plum",
  "amber",
  "canvas",
  "slate",
] as const;
export const HEADWEAR = ["bare", "hood", "helm", "circlet", "cap"] as const;
export const EMBLEMS = ["star", "moon", "sun", "leaf", "key"] as const;

export type Cloak = (typeof CLOAKS)[number];
export type Headwear = (typeof HEADWEAR)[number];
export type Emblem = (typeof EMBLEMS)[number];

export interface Avatar {
  cloak: Cloak;
  headwear: Headwear;
  emblem: Emblem;
}

export const DEFAULT_AVATAR: Avatar = {
  cloak: "indigo",
  headwear: "hood",
  emblem: "star",
};

/** Names for the pickers. */
export const CLOAK_LABELS: Record<Cloak, string> = {
  rose: "Rose",
  indigo: "Indigo",
  river: "River blue",
  moss: "Moss",
  plum: "Plum",
  amber: "Amber",
  canvas: "Linen",
  slate: "Slate",
};
export const HEADWEAR_LABELS: Record<Headwear, string> = {
  bare: "Bare head",
  hood: "Hood",
  helm: "Helm",
  circlet: "Circlet",
  cap: "Feathered cap",
};
export const EMBLEM_LABELS: Record<Emblem, string> = {
  star: "Star",
  moon: "Moon",
  sun: "Sun",
  leaf: "Leaf",
  key: "Key",
};

/** "Indigo cloak, hood, star emblem": a look in words, for a closed section. */
export function lookSummary(look: Avatar): string {
  const headwear = HEADWEAR_LABELS[look.headwear].toLowerCase();
  const emblem = EMBLEM_LABELS[look.emblem].toLowerCase();

  return `${CLOAK_LABELS[look.cloak]} cloak, ${headwear}, ${emblem} emblem`;
}

/** The art token each cloak is dyed with (never --good or --evil). */
export const CLOAK_TOKENS: Record<Cloak, string> = {
  rose: "--art-tent-stripe",
  indigo: "--art-banner",
  river: "--art-river",
  moss: "--art-ground-lit-2",
  plum: "--art-log-end",
  amber: "--art-fire-outer",
  canvas: "--art-tent-shade",
  slate: "--art-stone",
};

function pick<T extends string>(
  list: ReadonlyArray<T>,
  value: unknown,
  fallback: T,
): T {
  return list.find((item) => item === value) ?? fallback;
}

/** Accept anything and return a valid look. */
export function sanitizeAvatar(input: unknown): Avatar {
  const v = typeof input === "object" && input !== null ? input : {};

  return {
    cloak: pick(CLOAKS, "cloak" in v ? v.cloak : null, DEFAULT_AVATAR.cloak),
    headwear: pick(
      HEADWEAR,
      "headwear" in v ? v.headwear : null,
      DEFAULT_AVATAR.headwear,
    ),
    emblem: pick(
      EMBLEMS,
      "emblem" in v ? v.emblem : null,
      DEFAULT_AVATAR.emblem,
    ),
  };
}

/** An item of a non-empty constant list. */
function itemAt<T>(list: ReadonlyArray<T>, index: number): T {
  const item = list[index];

  if (item === undefined) {
    throw new Error(`No item at ${index} of a ${list.length}-item list.`);
  }

  return item;
}

/** A stable made-up look for a mock player, from their id. */
export function avatarFor(id: string): Avatar {
  let h = 2_166_136_261;

  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }

  const at = <T>(list: ReadonlyArray<T>, shift: number): T =>
    itemAt(list, ((h >>> shift) & 0xff) % list.length);

  return {
    cloak: at(CLOAKS, 0),
    headwear: at(HEADWEAR, 8),
    emblem: at(EMBLEMS, 16),
  };
}

/** A short stable key, to tell when a look has changed. */
export function avatarKey(a: Avatar): string {
  return `${a.cloak}/${a.headwear}/${a.emblem}`;
}
