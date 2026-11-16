import { CampfireParts } from "./campfire";
import { PixelCanvas, seededRandom } from "./pixel-canvas";
import { pixelBox, PixelPaths, spritePaths } from "./pixel-sprite";
import { HELM, KNIGHT_BODY, STAR_BIG, plumePalette } from "./sprites";

/**
 * The landing illustration: a camp in a lavender field at dusk, with a
 * castle on a hill and a crescent moon. Drawn onto a pixel raster by code,
 * so it can be re-composed for a phone and for a wide screen.
 */
export interface SceneLayout {
  cols: number;
  rows: number;
  /** Row where the sky meets the field. */
  horizon: number;
  /** Column of the castle's keep. Leave out for open country. */
  castleX?: number;
  moon?: { x: number; y: number };
  /** The fire: centre column, and the row its logs rest on. */
  camp?: { x: number; y: number };
  /** Pines on the horizon: [column, tiers]. */
  pines: readonly (readonly [number, number])[];
  /** Twinkling stars: [column, row]. */
  twinkles: readonly (readonly [number, number])[];
  seed: number;
}

/** For phones. The middle 130 columns hold everything. */
export const SCENE_COMPACT: SceneLayout = {
  cols: 256,
  rows: 168,
  horizon: 120,
  castleX: 100,
  moon: { x: 164, y: 62 },
  camp: { x: 126, y: 148 },
  pines: [
    [8, 5],
    [22, 3],
    [44, 4],
    [56, 3],
    [68, 4],
    [142, 3],
    [152, 4],
    [164, 3],
    [178, 5],
    [192, 4],
    [218, 5],
    [236, 3],
    [250, 5],
  ],
  twinkles: [
    [68, 6],
    [184, 12],
    [76, 52],
    [146, 44],
    [16, 20],
    [240, 30],
  ],
  seed: 7,
};

/** For a laptop or a shared screen. The art sits right of centre. */
export const SCENE_WIDE: SceneLayout = {
  cols: 480,
  rows: 216,
  horizon: 128,
  castleX: 316,
  moon: { x: 398, y: 34 },
  camp: { x: 318, y: 178 },
  pines: [
    [14, 6],
    [30, 5],
    [50, 6],
    [72, 4],
    [92, 5],
    [116, 4],
    [136, 5],
    [158, 3],
    [180, 4],
    [204, 3],
    [226, 4],
    [246, 3],
    [262, 4],
    [364, 4],
    [378, 5],
    [392, 3],
    [410, 5],
    [428, 6],
    [446, 4],
    [464, 6],
  ],
  twinkles: [
    [90, 24],
    [176, 12],
    [250, 40],
    [300, 14],
    [352, 52],
    [440, 20],
    [130, 58],
    [460, 66],
  ],
  seed: 11,
};

/** A low band of hills and lavender for the foot of a wide screen. */
export const SCENE_STRIP: SceneLayout = {
  cols: 640,
  rows: 48,
  horizon: 28,
  pines: [
    [18, 4],
    [34, 5],
    [56, 3],
    [120, 4],
    [136, 3],
    [210, 5],
    [226, 4],
    [244, 3],
    [330, 4],
    [348, 5],
    [420, 3],
    [436, 4],
    [500, 5],
    [520, 3],
    [596, 4],
    [614, 5],
  ],
  twinkles: [
    [80, 3],
    [290, 6],
    [470, 2],
  ],
  seed: 17,
};

const SKY = [
  "var(--art-sky-1)",
  "var(--art-sky-2)",
  "var(--art-sky-3)",
  "var(--art-sky-4)",
  "var(--art-sky-5)",
  "var(--art-sky-6)",
  "var(--art-sky-7)",
  "var(--art-sky-8)",
] as const;

/** Where each sky band ends, as a share of the sky's height. */
const SKY_STOPS = [0.3, 0.5, 0.66, 0.79, 0.89, 0.95, 0.985, 1] as const;

function drawSky(c: PixelCanvas, layout: SceneLayout): void {
  let top = 0;
  SKY_STOPS.forEach((stop, index) => {
    const fill = SKY[index] ?? SKY[0];
    const bottom = Math.round(layout.horizon * stop);
    c.rect(0, top, c.cols, bottom - top, fill);
    // One early scanline of the next colour: a banded stand-in for a blend.
    const next = SKY[index + 1];
    if (next && bottom - top > 4) c.rect(0, bottom - 2, c.cols, 1, next);
    top = bottom;
  });
}

function drawStars(c: PixelCanvas, layout: SceneLayout): void {
  const random = seededRandom(layout.seed);
  const count = Math.round((c.cols * layout.horizon) / 220);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * c.cols);
    const y = Math.floor(random() * layout.horizon * 0.62);
    const bright = random() > 0.72;
    c.px(x, y, bright ? "var(--art-star)" : "var(--art-star-dim)");
  }
}

function drawClouds(c: PixelCanvas, layout: SceneLayout): void {
  const random = seededRandom(layout.seed + 3);
  const count = Math.round(c.cols / 44);
  for (let i = 0; i < count; i++) {
    const length = 16 + Math.floor(random() * 30);
    const x = Math.floor(random() * c.cols) - 10;
    const share = 0.56 + random() * 0.36;
    const y = Math.round(layout.horizon * share);
    const band = SKY_STOPS.findIndex((stop) => share < stop);
    const fill = SKY[Math.max(0, band - 2)] ?? SKY[0];
    c.rect(x, y, length, 1, fill);
    c.rect(x + 4, y + 1, length - 10, 1, fill);
    c.rect(x + 6, y - 1, Math.floor(length / 3), 1, fill);
  }
}

/** A crescent: a disc with a second, offset disc cut out of it. */
function drawMoon(c: PixelCanvas, left: number, top: number): void {
  const size = 13;
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      const inDisc = dx * dx + dy * dy <= r * r;
      const cutX = dx - 3.6;
      const cutY = dy + 2.2;
      const inCut = cutX * cutX + cutY * cutY <= 5.6 * 5.6;
      if (!inDisc || inCut) continue;
      const nearCut = cutX * cutX + cutY * cutY <= 6.7 * 6.7;
      c.px(
        left + x,
        top + y,
        nearCut ? "var(--art-moon-shade)" : "var(--art-moon)",
      );
    }
  }
}

function drawFarHills(c: PixelCanvas, layout: SceneLayout): void {
  for (let x = 0; x < c.cols; x++) {
    const height = Math.round(
      5 + 3 * Math.sin(x / 23 + layout.seed) + 2 * Math.sin(x / 9 + 1.7),
    );
    c.rect(x, layout.horizon - height, 1, height, "var(--art-hill-far)");
  }
}

function castleHillHeight(layout: SceneLayout, x: number): number {
  if (layout.castleX === undefined) return 0;
  const spread = layout.cols > 400 ? 46 : 34;
  const peak = layout.cols > 400 ? 26 : 20;
  const distance = (x - layout.castleX) / spread;
  // Rounded to even numbers so the slope climbs in two-pixel steps.
  return Math.round((peak * Math.exp(-distance * distance)) / 2) * 2;
}

function drawCastleHill(c: PixelCanvas, layout: SceneLayout): void {
  for (let x = 0; x < c.cols; x++) {
    const height = castleHillHeight(layout, x);
    if (height > 0) {
      c.rect(x, layout.horizon - height, 1, height, "var(--art-hill-near)");
    }
  }
}

function drawCastle(c: PixelCanvas, cx: number, baseY: number): void {
  const body = "var(--art-castle)";
  const lit = "var(--art-castle-lit)";
  const glow = "var(--art-window)";

  const tower = (x: number, w: number, h: number, spire: number) => {
    c.rect(x, baseY - h, w, h, body);
    c.rect(x + w - 1, baseY - h + 1, 1, h - 1, lit);
    // An overhanging parapet, then a stepped spire.
    c.rect(x - 1, baseY - h - 1, w + 2, 2, body);
    for (let i = 0; i < spire; i++) {
      const width = Math.max(1, Math.round((w + 2) * (1 - i / spire)));
      c.span(x + Math.floor(w / 2), baseY - h - 2 - i, width, body);
    }
  };
  const wall = (x: number, w: number, h: number) => {
    c.rect(x, baseY - h, w, h, body);
    for (let i = 0; i < w; i += 3) c.rect(x + i, baseY - h - 1, 2, 1, body);
  };

  wall(cx - 22, 44, 8);
  tower(cx - 24, 5, 16, 6);
  tower(cx + 19, 5, 14, 5);
  // Keep.
  wall(cx - 9, 18, 17);
  c.rect(cx + 8, baseY - 16, 1, 16, lit);
  tower(cx - 14, 6, 24, 8);
  tower(cx + 7, 6, 21, 7);
  tower(cx - 4, 8, 32, 10);
  // Banner on the tallest spire.
  c.rect(cx, baseY - 48, 1, 5, body);
  c.rect(cx + 1, baseY - 48, 3, 2, "var(--art-flame-base)");

  // Gate and lit windows.
  c.rect(cx - 2, baseY - 6, 4, 6, lit);
  c.rect(cx - 1, baseY - 7, 2, 1, lit);
  const windows: readonly (readonly [number, number])[] = [
    [-12, 19],
    [-12, 14],
    [-1, 27],
    [1, 21],
    [-2, 14],
    [9, 16],
    [10, 11],
    [-22, 11],
    [21, 9],
    [-6, 10],
    [5, 10],
    [14, 4],
    [-18, 4],
  ];
  for (const [dx, dy] of windows) c.rect(cx + dx, baseY - dy, 1, 2, glow);
}

function drawPine(c: PixelCanvas, cx: number, baseY: number, tiers: number) {
  const tierRows = 3;
  const rows = tiers * tierRows;
  for (let r = 0; r < rows; r++) {
    const width = 1 + 2 * (Math.floor(r / tierRows) + (r % tierRows));
    const y = baseY - 2 - rows + r;
    c.span(cx, y, width, "var(--art-pine)");
    const shade = Math.floor(width / 3);
    if (shade > 0) {
      c.rect(
        cx + Math.ceil(width / 2) - shade,
        y,
        shade,
        1,
        "var(--art-pine-shade)",
      );
    }
  }
  c.rect(cx, baseY - 2, 1, 2, "var(--art-pine-shade)");
}

/**
 * The field. Its flat bands go on the ground layer and its flowers on the
 * detail layer above, so thousands of flowers do not chop the bands into
 * thousands of pieces.
 */
function drawField(
  ground: PixelCanvas,
  c: PixelCanvas,
  layout: SceneLayout,
): void {
  const { horizon } = layout;
  ground.rect(0, horizon, c.cols, c.rows - horizon, "var(--art-field)");
  ground.rect(0, horizon, c.cols, 2, "var(--art-field-far)");

  // Lavender grows in rows. Each row is a band: flower tips along the top,
  // a dark furrow along the bottom, and taller as it comes closer.
  const random = seededRandom(layout.seed + 5);
  let top = horizon + 3;
  let height = 2;
  while (top < c.rows) {
    const rows = Math.floor(height);
    const bottom = top + rows;
    ground.rect(0, bottom - 1, c.cols, 1, "var(--art-field-near)");
    if (rows >= 5) {
      ground.rect(0, bottom - 2, c.cols, 1, "var(--art-field-near)");
    }

    let x = Math.floor(random() * 3);
    while (x < c.cols) {
      const clump = rows >= 6 ? 2 : 1;
      const tall = rows >= 4 && random() > 0.5 ? 2 : 1;
      c.rect(x, top - tall + 1, clump, tall, "var(--art-sprig-tip)");
      if (rows >= 3) c.rect(x, top + 1, clump, 1, "var(--art-sprig)");
      if (rows >= 6) {
        c.px(x - 1, top + 1, "var(--art-sprig)");
        c.rect(x, top + 2, clump + 1, 1, "var(--art-sprig)");
      }
      x += clump + 2 + Math.floor(random() * 4);
    }
    top = bottom;
    height += 0.8;
  }
}

/** A filled ellipse with stepped edges. */
function drawEllipse(
  c: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.01)));
    // Even half-widths keep the edge in two-pixel steps.
    const stepped = Math.floor(half / 2) * 2;
    c.rect(cx - stepped, cy + dy, stepped * 2, 1, fill);
  }
}

function drawTent(c: PixelCanvas, apexX: number, apexY: number, h: number) {
  for (let r = 0; r < h; r++) {
    const half = Math.floor(r * 0.8) + 1;
    const y = apexY + r;
    c.rect(apexX - half - 1, y, half * 2 + 2, 1, "var(--art-outline)");
    c.rect(apexX - half, y, half, 1, "var(--art-tent)");
    c.rect(apexX, y, half, 1, "var(--art-tent-shade)");
    // The door: a dark slit that widens towards the ground.
    if (r > h * 0.45) {
      const door = Math.max(1, Math.floor((r - h * 0.45) * 0.45));
      c.rect(apexX - door, y, door * 2, 1, "var(--art-outline)");
    }
  }
  c.rect(apexX, apexY - 2, 1, 2, "var(--art-outline)");
}

function drawKnight(c: PixelCanvas, x: number, y: number, seat: number): void {
  const palette = plumePalette(seat);
  c.sprite(HELM, x, y, { palette });
  c.sprite(KNIGHT_BODY, x, y + 12, { palette });
}

function drawCamp(
  c: PixelCanvas,
  camp: { x: number; y: number },
  seed: number,
): void {
  const { x, y } = camp;
  drawEllipse(c, x, y + 1, 46, 9, "var(--art-grass)");
  drawEllipse(c, x, y + 1, 22, 4, "var(--art-glow)");
  const random = seededRandom(seed + 9);
  for (let i = 0; i < 26; i++) {
    const gx = x - 40 + Math.floor(random() * 80);
    const gy = y - 5 + Math.floor(random() * 13);
    if (Math.abs(gx - x) > 22) c.px(gx, gy, "var(--art-grass-lit)");
  }
  drawTent(c, x - 34, y - 22, 20);
  drawKnight(c, x - 23, y - 15, 0);
  drawKnight(c, x + 11, y - 15, 2);
  drawKnight(c, x + 28, y - 12, 4);
}

function drawForeground(c: PixelCanvas, layout: SceneLayout): void {
  const random = seededRandom(layout.seed + 13);
  // Two rows of bushes: the back row dark, the front row the page colour,
  // so the picture's lower edge breaks up into the page.
  const rowsOfBushes = [
    { fill: "var(--art-field-dark)", base: c.rows - 4, tall: 9, tips: true },
    { fill: "var(--art-sky-1)", base: c.rows, tall: 7, tips: false },
  ];
  for (const row of rowsOfBushes) {
    let x = -4;
    while (x < c.cols) {
      const width = 8 + Math.floor(random() * 10);
      const height = 3 + Math.floor(random() * row.tall);
      for (let i = 0; i < width; i++) {
        const bump = Math.sin((i / (width - 1)) * Math.PI);
        const column = Math.max(1, Math.round(height * bump));
        c.rect(x + i, row.base - column, 1, column + 4, row.fill);
        if (row.tips && i % 3 === 1 && column > 2) {
          c.px(x + i, row.base - column - 1, "var(--art-sprig-tip)");
          c.px(x + i, row.base - column, "var(--art-sprig)");
        }
      }
      x += width - 2;
    }
  }
}

/** Two layers: flat ground and sky below, flowers and figures above. */
function paintScene(layout: SceneLayout): PixelCanvas[] {
  const ground = new PixelCanvas(layout.cols, layout.rows);
  drawSky(ground, layout);
  drawStars(ground, layout);
  drawClouds(ground, layout);
  if (layout.moon) drawMoon(ground, layout.moon.x, layout.moon.y);
  drawFarHills(ground, layout);
  drawCastleHill(ground, layout);
  if (layout.castleX !== undefined) {
    const hillTop = layout.horizon - castleHillHeight(layout, layout.castleX);
    drawCastle(ground, layout.castleX, hillTop + 2);
  }
  for (const [x, tiers] of layout.pines) {
    const base = layout.horizon - castleHillHeight(layout, x) + 1;
    drawPine(ground, x, base, tiers);
  }

  const detail = new PixelCanvas(layout.cols, layout.rows);
  drawField(ground, detail, layout);
  if (layout.camp) drawCamp(detail, layout.camp, layout.seed);
  drawForeground(detail, layout);
  return [ground, detail];
}

export function DuskScene({
  layout,
  className,
}: {
  layout: SceneLayout;
  className?: string;
}) {
  const layers = paintScene(layout);
  const star = spritePaths(STAR_BIG);
  const { camp } = layout;

  return (
    <svg
      viewBox={`0 0 ${layout.cols} ${layout.rows}`}
      className={`lv-sprite ${className ?? ""}`}
      style={pixelBox(layout.cols, layout.rows)}
      aria-hidden
      focusable="false"
    >
      {layers.map((layer, index) => (
        <g key={index}>
          <PixelPaths paths={layer.toPaths()} />
        </g>
      ))}
      {layout.twinkles.map(([x, y], index) => (
        <g
          key={`${x}-${y}`}
          transform={`translate(${x} ${y})`}
          className="lv-twinkle"
          style={{ animationDelay: `${index * -410}ms` }}
        >
          <PixelPaths paths={star} />
        </g>
      ))}
      {camp ? (
        <>
          <CampfireParts x={camp.x - 8} y={camp.y - 11} />
          {/* One knight at this fire is not what he seems. */}
          <rect
            className="lv-glint"
            x={camp.x + 31}
            y={camp.y - 6}
            width={6}
            height={1}
            fill="var(--art-evil-eye)"
          />
        </>
      ) : null}
    </svg>
  );
}
