import {
  DEFAULT_SKY,
  DEFAULT_STATE,
  sanitizeState,
  type TweakState,
} from "./state";

/**
 * Dials Claude proposes, committed so they show up in the studio's preset
 * list. Add one by pasting a "Copy JSON" export into this array. Each is a
 * starting point to push against, not a decision.
 */
export const PROPOSED_DIALS: readonly TweakState[] = [
  {
    ...DEFAULT_STATE,
    name: "Starlit (as shipped)",
    notes: "The theme exactly as it is in -theme.css.",
  },
  sanitizeState({
    name: "Deeper midnight",
    notes:
      "Push the night darker and the stars brighter so the fire and the panels carry more of the light. Panels go nearly opaque to keep text safe on the darker sky.",
    shifts: {
      night: { hue: 4, chroma: 1.1, lightness: -3 },
      vale: { hue: 0, chroma: 1, lightness: -3 },
      indigo: { hue: 0, chroma: 1.05, lightness: -1 },
    },
    vars: {
      "--panel-opacity": "96%",
      "--glow-fire-strength": "58%",
      "--glow-fire-size": "34px",
      "--sky-mid-stop": "50%",
      "--sky-clouds-opacity": "0.6",
    },
    sky: { ...DEFAULT_SKY, starCount: 620, twinkleEvery: 4 },
  }),
  sanitizeState({
    name: "Hearthside",
    notes:
      "Warmer and cosier: a bigger fire glow, a lower warmer horizon, slower ambient motion and the wonky Fraunces letters for a more hand-lettered storybook feel.",
    shifts: {
      amber: { hue: -6, chroma: 1.08, lightness: 0 },
      pink: { hue: -10, chroma: 1, lightness: 0 },
    },
    vars: {
      "--display-wonk": "1",
      "--wordmark-tracking": "-0.03em",
      "--glow-fire-size": "44px",
      "--glow-fire-strength": "62%",
      "--glow-star-strength": "65%",
      "--panel-highlight-strength": "11%",
      "--sky-horizon-glow-height": "72%",
      "--ambient-tempo": "1.3",
      "--accent-cool": "var(--starlit-amber-300)",
    },
    sky: { ...DEFAULT_SKY, lightsDensity: 1.6 },
  }),
  sanitizeState({
    name: "Moonlit silver",
    notes:
      "Cooler and quieter: less saturation everywhere, a pale gold accent instead of amber, ice-blue eyebrows, crisper Fraunces and tighter corners. Reads more like an engraving than a painting.",
    shifts: {
      all: { hue: 0, chroma: 0.78, lightness: 0 },
      night: { hue: 8, chroma: 1, lightness: 0 },
      amber: { hue: 12, chroma: 0.7, lightness: 4 },
    },
    vars: {
      "--accent-cool": "var(--starlit-ice-200)",
      "--display-soft": "30",
      "--eyebrow-tracking": "0.2em",
      "--corner-lg": "16px",
      "--corner-md": "12px",
      "--button-radius": "14px",
      "--glow-fire-strength": "30%",
    },
    sky: { ...DEFAULT_SKY, starCount: 520, starTopBias: 1.7 },
  }),
  sanitizeState({
    name: "Storybook bold",
    notes:
      "Bigger and friendlier for a table of phones: a slightly larger type scale, heavier display, taller buttons and bigger seats on the shared screen.",
    typeScale: 106,
    vars: {
      "--display-weight": "600",
      "--button-height": "56px",
      "--input-height": "58px",
      "--seat-size@wide": "76px",
      "--seat-cell@wide": "148px",
      "--eyebrow-weight": "900",
    },
  }),
];
