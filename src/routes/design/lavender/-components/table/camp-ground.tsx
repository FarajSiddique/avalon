import { CampfireParts } from "../pixel/campfire";
import { PixelCanvas, seededRandom } from "../pixel/pixel-canvas";
import { pixelBox, PixelPaths } from "../pixel/pixel-sprite";

const COLS = 108;
const ROWS = 52;

function paintGround(): PixelCanvas {
  const c = new PixelCanvas(COLS, ROWS);
  const cx = COLS / 2;
  const cy = ROWS / 2 + 4;
  const ellipse = (rx: number, ry: number, fill: string) => {
    for (let dy = -ry; dy <= ry; dy++) {
      const half =
        Math.floor((rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.01))) / 2) * 2;
      c.rect(cx - half, cy + dy, half * 2, 1, fill);
    }
  };
  ellipse(52, 21, "var(--art-field-dark)");
  ellipse(46, 17, "var(--art-grass)");
  ellipse(22, 6, "var(--art-glow)");

  const random = seededRandom(21);
  for (let i = 0; i < 70; i++) {
    const angle = random() * Math.PI * 2;
    const reach = 0.5 + random() * 0.45;
    const x = Math.round(cx + Math.cos(angle) * 46 * reach);
    const y = Math.round(cy + Math.sin(angle) * 17 * reach);
    c.px(x, y, "var(--art-grass-lit)");
  }
  // Lavender creeping in at the rim of the clearing.
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angle) * 49);
    const y = Math.round(cy + Math.sin(angle) * 19);
    c.px(x, y - 1, "var(--art-sprig-tip)");
    c.px(x, y, "var(--art-sprig)");
  }
  return c;
}

/**
 * The clearing the knights sit around on a shared screen: grass, firelight
 * and the campfire. Decorative.
 */
export function CampGround({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${COLS} ${ROWS}`}
      className={`lv-sprite ${className ?? ""}`}
      style={pixelBox(COLS, ROWS)}
      aria-hidden
      focusable="false"
    >
      <PixelPaths paths={paintGround().toPaths()} />
      <CampfireParts x={COLS / 2 - 8} y={ROWS / 2 - 8} />
    </svg>
  );
}
