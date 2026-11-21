import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  normalizeHex,
  oklchToRgb,
  rgbToOklch,
  shiftHex,
  toHex,
} from "./color";
import {
  WIDE_SUFFIX,
  buildCatalog,
  kindOf,
  type Declarations,
} from "./catalog";
import { PROPOSED_DIALS } from "./presets";
import {
  BACKDROP_LAYOUT,
  cropFor,
} from "@/routes/design/starlit/-components/art/backdrop-layout";
import { BACKDROP_STYLES } from "@/routes/design/starlit/-components/art/scene-options";
import {
  DEFAULT_STATE,
  buildBrief,
  buildCss,
  checkContrast,
  decodeState,
  encodeState,
  isPristine,
  listChanges,
  resolveValue,
  sanitizeState,
} from "./state";

const THEME_DIR = path.join(
  import.meta.dirname,
  "..",
  "..",
  "routes",
  "design",
  "starlit",
);

/** The custom properties in each `.theme-starlit { ... }` block of a CSS file. */
function declarationsIn(css: string): Declarations {
  const out: Declarations = { base: new Map(), wide: new Map() };
  const block = /(@media[^{]*\{\s*)?\.theme-starlit\s*\{([^}]*)\}/g;
  for (const match of css.matchAll(block)) {
    const media = match[1] ?? "";
    if (media.includes("reduced-motion")) continue;
    const target = media.includes("1024px") ? out.wide : out.base;
    const body = (match[2] ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const decl of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      if (decl[1] && decl[2])
        target.set(decl[1], decl[2].replace(/\s+/g, " ").trim());
    }
  }
  return out;
}

function themeCatalog() {
  const decls = declarationsIn(
    readFileSync(path.join(THEME_DIR, "-theme.css"), "utf8"),
  );
  const fonts = declarationsIn(
    readFileSync(path.join(THEME_DIR, "-fonts.css"), "utf8"),
  );
  for (const [k, v] of fonts.base) decls.base.set(k, v);
  return buildCatalog(decls);
}

describe("colour maths", () => {
  it("round-trips sRGB through OKLCH", () => {
    for (const hex of [
      "#0a1030",
      "#f7b955",
      "#fffaf0",
      "#6fdcec",
      "#000000",
      "#ffffff",
    ]) {
      expect(toHex(oklchToRgb(rgbToOklch(hexRgb(hex))))).toBe(hex);
    }
  });

  it("leaves a colour alone when no shift is active", () => {
    expect(shiftHex("#f7b955", [{ hue: 0, chroma: 1, lightness: 0 }])).toBe(
      "#f7b955",
    );
  });

  it("darkens with negative lightness and greys with zero chroma", () => {
    const darker = shiftHex("#7f8fdc", [{ hue: 0, chroma: 1, lightness: -10 }]);
    expect(contrastRatio(darker, "#000000")!).toBeLessThan(
      contrastRatio("#7f8fdc", "#000000")!,
    );
    const grey = hexRgb(
      shiftHex("#f2933a", [{ hue: 0, chroma: 0, lightness: 0 }]),
    );
    expect(Math.abs(grey.r - grey.b)).toBeLessThanOrEqual(2);
  });

  it("computes WCAG contrast", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
  });
});

function hexRgb(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

describe("the theme catalogue", () => {
  const catalog = themeCatalog();

  it("finds every layer of the theme, including the tuning dials", () => {
    expect(catalog.get("--starlit-night-900")?.kind).toBe("color");
    expect(catalog.get("--canvas")?.kind).toBe("ref");
    expect(catalog.get("--ease-out")?.kind).toBe("easing");
    expect(catalog.get("--display-font")?.kind).toBe("font");
    for (const dial of [
      "--display-soft",
      "--panel-opacity",
      "--glow-fire-size",
      "--ambient-tempo",
      "--sky-mid-stop",
    ]) {
      expect(catalog.has(dial), dial).toBe(true);
    }
    expect(catalog.size).toBeGreaterThan(150);
  });

  it("knows which tokens change at the wide breakpoint", () => {
    expect(catalog.get("--seat-size")).toMatchObject({
      base: "52px",
      wide: "68px",
    });
    expect(catalog.get("--canvas")?.wide).toBeUndefined();
  });

  it("classifies values", () => {
    expect(kindOf("250ms")).toBe("time");
    expect(kindOf("92%")).toBe("percent");
    expect(kindOf("-0.02em")).toBe("length");
    expect(kindOf("1.35")).toBe("number");
    expect(kindOf("clamp(1px, 2vw, 3px)")).toBe("text");
  });

  it("resolves semantic tokens through the palette", () => {
    expect(resolveValue(catalog, DEFAULT_STATE, "--canvas")).toBe("#0a1030");
    expect(resolveValue(catalog, DEFAULT_STATE, "--art-fire-core")).toBe(
      "#fffaf0",
    );
  });

  it("the shipped theme meets every contrast target", () => {
    const failing = checkContrast(catalog, DEFAULT_STATE).filter(
      (r) => !r.pass,
    );
    expect(failing.map((r) => `${r.label} ${r.ratio?.toFixed(2)}`)).toEqual([]);
  });
});

describe("turning a dial into CSS", () => {
  const catalog = themeCatalog();

  it("emits nothing for the defaults", () => {
    expect(buildCss(catalog, DEFAULT_STATE)).toBe("");
    expect(isPristine(catalog, DEFAULT_STATE)).toBe(true);
  });

  it("an override equal to the default is not a change", () => {
    const state = { ...DEFAULT_STATE, vars: { "--corner-sm": "10px" } };
    expect(listChanges(catalog, state)).toEqual([]);
  });

  it("outranks the theme block and keeps wide values separate", () => {
    const state = {
      ...DEFAULT_STATE,
      vars: {
        "--accent": "var(--starlit-pink-300)",
        "--seat-size": "60px",
        ["--seat-size" + WIDE_SUFFIX]: "90px",
      },
    };
    const css = buildCss(catalog, state);
    expect(css).toContain(
      ".theme-starlit.theme-starlit {\n  --accent: var(--starlit-pink-300);",
    );
    expect(css).toMatch(
      /@media not all and \(min-width: 1024px\) \{[^@]*--seat-size: 60px;/,
    );
    expect(css).toMatch(
      /@media \(min-width: 1024px\) \{[^@]*--seat-size: 90px;/,
    );
  });

  it("palette shifts rewrite the primitives they touch, and only those", () => {
    const state = {
      ...DEFAULT_STATE,
      shifts: { amber: { hue: 20, chroma: 1, lightness: 0 } },
    };
    const changed = listChanges(catalog, state).map((c) => c.token);
    expect(changed).toContain("--starlit-amber-400");
    expect(changed.every((t) => t.startsWith("--starlit-amber-"))).toBe(true);
  });

  it("travels in a share code and survives garbage", () => {
    const state = sanitizeState({
      name: "Test",
      vars: { "--accent": "#ff0000" },
      typeScale: 110,
      comments: { "--accent": "hotter" },
    });
    expect(decodeState(encodeState(state))).toEqual(state);
    expect(decodeState("not a code")).toBeNull();
    expect(
      sanitizeState({ vars: { notAToken: "x" }, typeScale: 9999 }),
    ).toMatchObject({ vars: {}, typeScale: 160 });
  });

  it("writes a brief with notes, changes and the reload JSON", () => {
    const state = sanitizeState({
      name: "Warm",
      notes: "More fire",
      vars: { "--glow-fire-size": "40px" },
      comments: { "--glow-fire-size": "not too much" },
    });
    const brief = buildBrief(
      catalog,
      state,
      "http://x/design/starlit?tweaks=abc",
    );
    expect(brief).toContain("## Starlit dial: Warm");
    expect(brief).toContain("More fire");
    expect(brief).toContain(
      "| `--glow-fire-size` | all | `28px` | `40px` | not too much |",
    );
    expect(brief).toContain('"--glow-fire-size": "40px"');
  });
});

describe("artwork versions", () => {
  const catalog = themeCatalog();

  it("default to the original drawings and reject unknown versions", () => {
    expect(sanitizeState({}).scene).toEqual({
      backdrop: "vale",
      tent: "pavilion",
      fire: "crossed",
      castle: "keep",
    });
    expect(
      sanitizeState({ scene: { tent: "bell", fire: "dragon", castle: 3 } })
        .scene,
    ).toEqual({
      backdrop: "vale",
      tent: "bell",
      fire: "crossed",
      castle: "keep",
    });
    expect(sanitizeState({ scene: { backdrop: "moon" } }).scene.backdrop).toBe(
      "vale",
    );
  });

  it("travel in share codes and appear in the brief", () => {
    const state = sanitizeState({
      name: "Art",
      scene: {
        backdrop: "peaks",
        tent: "ridge",
        fire: "brazier",
        castle: "fortress",
      },
    });
    expect(decodeState(encodeState(state))?.scene).toEqual(state.scene);
    expect(isPristine(catalog, state)).toBe(false);
    const brief = buildBrief(catalog, state, "http://x");
    expect(brief).toContain("### Artwork");
    expect(brief).toContain("- tent: pavilion → ridge");
    expect(brief).toContain("- backdrop: vale → peaks");
    expect(buildCss(catalog, state)).toBe("");
  });
});

describe("backdrop layouts", () => {
  it("frame each part where the backdrop puts it", () => {
    expect(cropFor("fire", "vale")).toBe("730 410 240 170");
    expect(cropFor("castle", "vale")).toBe("684 236 176 120");
    for (const backdrop of BACKDROP_STYLES) {
      const [x, y, w, h] = cropFor("castle", backdrop).split(" ").map(Number);
      const { castle } = BACKDROP_LAYOUT[backdrop];
      // The castle's foot stays inside its close-up.
      expect(castle.x).toBeGreaterThan(x!);
      expect(castle.x).toBeLessThan(x! + w!);
      expect(castle.y).toBeGreaterThan(y!);
      expect(castle.y).toBeLessThan(y! + h!);
    }
  });
});

describe("panel contrast", () => {
  const catalog = themeCatalog();

  it("measures panel pairs on the panel as it is drawn, at its opacity", () => {
    const at = (opacity: string) =>
      checkContrast(
        catalog,
        sanitizeState({ vars: { "--panel-opacity": opacity } }),
      ).find((r) => r.label === "Muted text on a panel");
    const solid = at("100%");
    const clear = at("0%");
    expect(solid?.bgHex).toBe(
      resolveValue(catalog, DEFAULT_STATE, "--surface"),
    );
    expect(clear?.bgHex).toBe(resolveValue(catalog, DEFAULT_STATE, "--canvas"));
  });
});

describe("proposed dials", () => {
  const catalog = themeCatalog();

  it("only name tokens and families the theme has", () => {
    const families = new Set(
      [...catalog.keys()]
        .map((k) => /^--starlit-([a-z]+)-/.exec(k)?.[1])
        .filter(Boolean),
    );
    for (const dial of PROPOSED_DIALS) {
      for (const key of Object.keys(dial.vars)) {
        expect(
          catalog.has(key.replace(WIDE_SUFFIX, "")),
          `${dial.name}: ${key}`,
        ).toBe(true);
      }
      for (const fam of Object.keys(dial.shifts)) {
        expect(fam === "all" || families.has(fam), `${dial.name}: ${fam}`).toBe(
          true,
        );
      }
    }
  });

  it("keep text readable", () => {
    for (const dial of PROPOSED_DIALS) {
      const failing = checkContrast(catalog, dial).filter((r) => !r.pass);
      expect(
        failing.map((r) => `${dial.name}: ${r.label} ${r.ratio?.toFixed(2)}`),
      ).toEqual([]);
    }
  });
});
