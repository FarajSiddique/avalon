/**
 * How a look is shown: the names in the picker, a look in words, and the art
 * tokens each skin and cloak is drawn with. The look itself (its lists, type
 * and defaults) is in `@/shared/avatar`.
 */

import type {
  Avatar,
  Body,
  Cloak,
  Emblem,
  Headwear,
  Skin,
} from "@/shared/avatar";

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
