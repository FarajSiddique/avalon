/**
 * The three design directions and the screens every direction must provide.
 * Prototype-only: this folder and src/app/design are removed (or reduced to
 * the winner) once a direction is picked.
 */

export const DIRECTIONS = [
  {
    slug: "ember",
    name: "Ember & Rune",
    style: "Candlelit tabletop",
    summary:
      "A worn oak table lit by candles and a glowing rune circle. Carved serif capitals, parchment cards, wax seals.",
  },
  {
    slug: "lavender",
    name: "Lavender Vigil",
    style: "16-bit pixel art",
    summary:
      "A knight's camp in a lavender field at dusk. Chunky pixel frames, sprite art, stepped animation.",
  },
  {
    slug: "starlit",
    name: "Starlit Vale",
    style: "Painted storybook night",
    summary:
      "A hand-inked valley under a deep blue sky full of stars. Soft storybook serif, layered hills, one warm campfire.",
  },
] as const;

export type Direction = (typeof DIRECTIONS)[number];
export type DirectionSlug = Direction["slug"];

export const ROLE_VARIANTS = ["merlin", "assassin"] as const;
export type RoleVariant = (typeof ROLE_VARIANTS)[number];

export function isRoleVariant(value: string): value is RoleVariant {
  return (ROLE_VARIANTS as readonly string[]).includes(value);
}

/** The in-game table is shown at five moments of one round. */
export const TABLE_STEPS = [
  "propose",
  "vote",
  "reveal",
  "quest",
  "result",
] as const;
export type TableStep = (typeof TABLE_STEPS)[number];

export function isTableStep(value: string): value is TableStep {
  return (TABLE_STEPS as readonly string[]).includes(value);
}

export const TABLE_STEP_LABELS: Record<TableStep, string> = {
  propose: "Team proposal",
  vote: "Team vote",
  reveal: "Votes revealed",
  quest: "Quest cards",
  result: "Quest result",
};

/** Every prototype URL for one direction. Use these instead of string paths. */
export function designPaths(slug: DirectionSlug) {
  const base = `/design/${slug}` as const;
  return {
    landing: base,
    lobby: `${base}/lobby`,
    role: (variant: RoleVariant) => `${base}/role/${variant}` as const,
    table: (step: TableStep) => `${base}/table/${step}` as const,
  } as const;
}

/** The step after this one in the click-through, looping back to the start. */
export function nextTableStep(step: TableStep): TableStep {
  const index = TABLE_STEPS.indexOf(step);
  return TABLE_STEPS[(index + 1) % TABLE_STEPS.length] ?? "propose";
}
