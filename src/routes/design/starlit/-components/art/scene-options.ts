/**
 * Which version of each piece of camp artwork to draw. The first entry of
 * each list is the original drawing.
 */

export const BACKDROP_STYLES = [
  "vale",
  "lake",
  "coast",
  "forest",
  "peaks",
] as const;
export const TENT_STYLES = ["pavilion", "bell", "ridge", "none"] as const;
export const FIRE_STYLES = ["crossed", "tipi", "cauldron", "brazier"] as const;
export const CASTLE_STYLES = [
  "keep",
  "spires",
  "ruin",
  "fortress",
  "none",
] as const;

export type BackdropStyle = (typeof BACKDROP_STYLES)[number];
export type TentStyle = (typeof TENT_STYLES)[number];
export type FireStyle = (typeof FIRE_STYLES)[number];
export type CastleStyle = (typeof CASTLE_STYLES)[number];

export interface SceneOptions {
  backdrop: BackdropStyle;
  tent: TentStyle;
  fire: FireStyle;
  castle: CastleStyle;
}

export const DEFAULT_SCENE: SceneOptions = {
  backdrop: "vale",
  tent: "pavilion",
  fire: "crossed",
  castle: "keep",
};

export const SCENE_PARTS = [
  {
    key: "backdrop",
    title: "Backdrop",
    styles: BACKDROP_STYLES,
    labels: {
      vale: [
        "Starlit vale",
        "The original: a camp on a hill above a sleeping valley and its river.",
      ],
      lake: [
        "Moonlit lake",
        "The camp on a lakeshore, the castle on an island, the moon laid across the water.",
      ],
      coast: [
        "Clifftop by the sea",
        "A headland camp above a night sea, the castle on the far cliffs.",
      ],
      forest: [
        "Standing stones",
        "A clearing walled in by pines, a ring of old stones around the fire.",
      ],
      peaks: [
        "Mountain pass",
        "A rocky ledge under snowy peaks, the castle on a crag with a waterfall.",
      ],
    },
  },
  {
    key: "tent",
    title: "Tent",
    styles: TENT_STYLES,
    labels: {
      pavilion: [
        "Striped pavilion",
        "The original: a round tournament pavilion with a scalloped valance.",
      ],
      bell: [
        "Bell tent",
        "One centre pole, a low bell of canvas, guy ropes pegged into the hill.",
      ],
      ridge: [
        "Ridge tent",
        "A knight's campaign tent: an A-frame gable with the ridge running back.",
      ],
      none: ["No tent", "The fire and the banner alone on the hill."],
    },
  },
  {
    key: "fire",
    title: "Campfire",
    styles: FIRE_STYLES,
    labels: {
      crossed: [
        "Crossed logs",
        "The original: two crossed logs in a ring of stones.",
      ],
      tipi: [
        "Log tipi",
        "Logs leaned into a cone, flames climbing through the gaps.",
      ],
      cauldron: [
        "Cauldron",
        "A pot on a lashed tripod over a low fire, steam rising.",
      ],
      brazier: [
        "Iron brazier",
        "A gold-rimmed bowl on three legs: tall flames, more ceremonial.",
      ],
    },
  },
  {
    key: "castle",
    title: "Castle",
    styles: CASTLE_STYLES,
    labels: {
      keep: ["Small keep", "The original: a modest keep with one flag."],
      spires: [
        "Fairytale spires",
        "Three tall pointed towers and a pennant on the highest.",
      ],
      ruin: ["Ruin", "Broken walls with one lit arch. Lonelier, more ominous."],
      fortress: [
        "Walled fortress",
        "Curtain walls, round towers and a lit gate. Camelot-sized.",
      ],
      none: ["No castle", "An open skyline."],
    },
  },
] as const;

function pick<T extends string>(
  list: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return typeof value === "string" &&
    (list as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Accept anything and return valid options. */
export function sanitizeScene(input: unknown): SceneOptions {
  const v =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  return {
    backdrop: pick(BACKDROP_STYLES, v.backdrop, DEFAULT_SCENE.backdrop),
    tent: pick(TENT_STYLES, v.tent, DEFAULT_SCENE.tent),
    fire: pick(FIRE_STYLES, v.fire, DEFAULT_SCENE.fire),
    castle: pick(CASTLE_STYLES, v.castle, DEFAULT_SCENE.castle),
  };
}
