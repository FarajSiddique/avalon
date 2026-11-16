import { PixelCanvas, type Palette } from "./pixel-canvas";
import { pixelBox, PixelPaths } from "./pixel-sprite";

const COLS = 36;
const ROWS = 44;
const CENTRE = 16;
const HELM_TOP = 9;

/** Half-width of the helm on each of its rows: a dome, a barrel, a chin. */
const HALF_WIDTHS = [
  5, 8, 10, 11, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13,
  13, 13, 13, 13, 13, 13, 13, 13, 12, 12, 11, 10, 8, 5,
] as const;

const PLUME = [
  "......ppppqq........",
  "....pppppppppqq.....",
  "...ppppqpppppppqq...",
  "..pppqqpppqqpppppqq.",
  "..ppqpppqqppppqpppqq",
  "..pqpppq..pppq.ppqqq",
  "..pp.pp....pp...pqqq",
  "..p..p......p....qq.",
  ".................q..",
] as const;

function paintGreatHelm(plume: Palette): PixelCanvas {
  const c = new PixelCanvas(COLS, ROWS);
  const steel = "var(--art-steel)";
  const shade = "var(--art-steel-shade)";
  const light = "var(--art-steel-light)";
  const dark = "var(--art-outline)";
  const trim = "var(--art-trim)";

  // Outline first, one pixel larger all round, then the steel on top.
  HALF_WIDTHS.forEach((half, row) => {
    const y = HELM_TOP + row;
    c.rect(CENTRE - half - 1, y - 1, half * 2 + 2, 3, dark);
  });
  HALF_WIDTHS.forEach((half, row) => {
    const y = HELM_TOP + row;
    c.rect(CENTRE - half, y, half * 2, 1, steel);
    // Moonlight from the left, shadow on the right.
    c.rect(CENTRE - half, y, half > 10 ? 2 : 1, 1, light);
    c.rect(CENTRE + half - Math.min(5, half), y, Math.min(5, half), 1, shade);
  });

  // Brow band and the ridge down the face: the cross of a great helm.
  c.rect(CENTRE - 13, HELM_TOP + 10, 26, 2, trim);
  c.rect(CENTRE - 1, HELM_TOP + 4, 2, 27, trim);
  // The visor is shut: two dark slits, nothing to see.
  c.rect(CENTRE - 11, HELM_TOP + 14, 9, 2, dark);
  c.rect(CENTRE + 2, HELM_TOP + 14, 9, 2, dark);
  // Breaths.
  for (const y of [20, 23, 26]) {
    for (const x of [-9, -6, 5, 8]) {
      c.rect(CENTRE + x, HELM_TOP + y, 1, 2, dark);
    }
  }
  // Rivets along the brow.
  for (const x of [-11, -7, -4, 3, 6, 10]) {
    c.px(CENTRE + x, HELM_TOP + 8, x < 0 ? light : steel);
  }

  c.sprite({ rows: PLUME, palette: plume }, CENTRE - 5, 0);
  return c;
}

/**
 * The closed great helm on the face-down role card. Drawn by code at the
 * screen's own pixel size, not an enlarged copy of the small helm.
 */
export function GreatHelm({
  plume,
  className,
}: {
  /** Colours for "p" and "q", from plumePalette(). */
  plume: Palette;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${COLS} ${ROWS}`}
      className={`lv-sprite ${className ?? ""}`}
      style={pixelBox(COLS, ROWS)}
      aria-hidden
      focusable="false"
    >
      <PixelPaths paths={paintGreatHelm(plume).toPaths()} />
    </svg>
  );
}
