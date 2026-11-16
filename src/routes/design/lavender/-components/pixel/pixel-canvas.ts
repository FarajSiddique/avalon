/**
 * A tiny raster for pixel art. Draw rectangles and sprites onto a grid of
 * art pixels, then turn the grid into one SVG path per colour. Later draws
 * cover earlier ones, as on a real canvas.
 */

/** Maps one character of sprite data to a CSS colour (use var(--art-*)). */
export type Palette = Readonly<Record<string, string>>;

/** Rows of equal length. "." is always transparent. */
export type SpriteRows = readonly string[];

export interface Sprite {
  readonly rows: SpriteRows;
  readonly palette: Palette;
}

export interface PixelPath {
  fill: string;
  d: string;
}

export function spriteSize(rows: SpriteRows): { cols: number; rows: number } {
  return { cols: rows[0]?.length ?? 0, rows: rows.length };
}

export class PixelCanvas {
  readonly cols: number;
  readonly rows: number;
  private readonly cells: (string | null)[];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array<string | null>(cols * rows).fill(null);
  }

  /** Paint one pixel. Out-of-bounds pixels are ignored. */
  px(x: number, y: number, fill: string): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.cells[y * this.cols + x] = fill;
  }

  rect(x: number, y: number, w: number, h: number, fill: string): void {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) this.px(col, row, fill);
    }
  }

  /** A horizontally centred row: `width` pixels around column `cx`. */
  span(cx: number, y: number, width: number, fill: string): void {
    this.rect(cx - Math.floor(width / 2), y, width, 1, fill);
  }

  sprite(
    sprite: Sprite,
    x: number,
    y: number,
    options: { flip?: boolean; palette?: Palette } = {},
  ): void {
    const palette = options.palette
      ? { ...sprite.palette, ...options.palette }
      : sprite.palette;
    sprite.rows.forEach((line, row) => {
      const chars = options.flip ? [...line].reverse() : [...line];
      chars.forEach((char, col) => {
        const fill = palette[char];
        if (fill) this.px(x + col, y + row, fill);
      });
    });
  }

  /**
   * One path per colour. Horizontal runs are merged, and runs that repeat on
   * the next row are stretched downwards, which keeps the markup small.
   */
  toPaths(): PixelPath[] {
    interface Run {
      x: number;
      y: number;
      w: number;
      h: number;
    }
    const byFill = new Map<string, Run[]>();
    const open = new Map<string, Run>();

    for (let y = 0; y < this.rows; y++) {
      let x = 0;
      while (x < this.cols) {
        const fill = this.cells[y * this.cols + x];
        if (!fill) {
          x++;
          continue;
        }
        let end = x + 1;
        while (end < this.cols && this.cells[y * this.cols + end] === fill) {
          end++;
        }
        const key = `${fill}|${x}|${end - x}`;
        const above = open.get(key);
        if (above && above.y + above.h === y) {
          above.h++;
        } else {
          const run: Run = { x, y, w: end - x, h: 1 };
          open.set(key, run);
          const list = byFill.get(fill);
          if (list) list.push(run);
          else byFill.set(fill, [run]);
        }
        x = end;
      }
    }

    return [...byFill.entries()].map(([fill, runs]) => ({
      fill,
      d: runs.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join(""),
    }));
  }
}

/** Deterministic random numbers, so server and client draw the same scene. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
