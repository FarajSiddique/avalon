/**
 * A player's look at the table: a body, a skin colour (from everyday tones
 * to the frankly fantastical), a cloak colour, headwear and a chest emblem.
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
export const BODIES = ["male", "female"] as const;
/** Everyday tones first, then the fantastical ones. */
export const SKINS = [
  "porcelain",
  "peach",
  "honey",
  "bronze",
  "umber",
  "ebony",
  "moss",
  "frost",
  "lilac",
  "ghost",
  "gilded",
  "starborn",
] as const;
/** Where the fantastical tones start in `SKINS`, for grouping in the picker. */
export const FIRST_FANCY_SKIN = 6;
export const EMBLEMS = ["star", "moon", "sun", "leaf", "key"] as const;

export type Cloak = (typeof CLOAKS)[number];
export type Headwear = (typeof HEADWEAR)[number];
export type Emblem = (typeof EMBLEMS)[number];
export type Body = (typeof BODIES)[number];
export type Skin = (typeof SKINS)[number];

export interface Avatar {
  body: Body;
  skin: Skin;
  cloak: Cloak;
  headwear: Headwear;
  emblem: Emblem;
}

export const DEFAULT_AVATAR: Avatar = {
  body: "female",
  skin: "honey",
  cloak: "indigo",
  headwear: "hood",
  emblem: "star",
};

/** Names for the pickers. */
export const BODY_LABELS: Record<Body, string> = {
  male: "Male",
  female: "Female",
};
export const SKIN_LABELS: Record<Skin, string> = {
  porcelain: "Porcelain",
  peach: "Peach",
  honey: "Honey",
  bronze: "Bronze",
  umber: "Umber",
  ebony: "Ebony",
  moss: "Bog troll",
  frost: "Frost giant",
  lilac: "Fae lilac",
  ghost: "Ghostly",
  gilded: "Gilded",
  starborn: "Starborn",
};
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

/**
 * "Female, honey skin, indigo cloak, hood, star emblem": a look in words,
 * for a closed section.
 */
export function lookSummary(look: Avatar): string {
  const skin = SKIN_LABELS[look.skin].toLowerCase();
  const cloak = CLOAK_LABELS[look.cloak].toLowerCase();
  const headwear = HEADWEAR_LABELS[look.headwear].toLowerCase();
  const emblem = EMBLEM_LABELS[look.emblem].toLowerCase();

  return `${BODY_LABELS[look.body]}, ${skin} skin, ${cloak} cloak, ${headwear}, ${emblem} emblem`;
}

/**
 * The art token each skin is drawn with. None is near --good (teal) or
 * --evil (coral), so a skin never hints at a side.
 */
export const SKIN_TOKENS: Record<Skin, string> = {
  porcelain: "--art-skin-porcelain",
  peach: "--art-skin-peach",
  honey: "--art-skin-honey",
  bronze: "--art-skin-bronze",
  umber: "--art-skin-umber",
  ebony: "--art-skin-ebony",
  moss: "--art-skin-moss",
  frost: "--art-skin-frost",
  lilac: "--art-skin-lilac",
  ghost: "--art-skin-ghost",
  gilded: "--art-skin-gilded",
  starborn: "--art-skin-starborn",
};

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
    body: pick(BODIES, "body" in v ? v.body : null, DEFAULT_AVATAR.body),
    skin: pick(SKINS, "skin" in v ? v.skin : null, DEFAULT_AVATAR.skin),
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

  // A second mix for the two newer traits, so the first three keep the
  // looks they had.
  const h2 = Math.imul(h ^ (h >>> 15), 0x2c_1b_3c_6d);
  const at = <T>(list: ReadonlyArray<T>, shift: number, from = h): T =>
    itemAt(list, ((from >>> shift) & 0xff) % list.length);

  return {
    body: at(BODIES, 0, h2),
    skin: at(SKINS, 8, h2),
    cloak: at(CLOAKS, 0),
    headwear: at(HEADWEAR, 8),
    emblem: at(EMBLEMS, 16),
  };
}

/** A short stable key, to tell when a look has changed. */
export function avatarKey(a: Avatar): string {
  return `${a.body}/${a.skin}/${a.cloak}/${a.headwear}/${a.emblem}`;
}
