import { pixelBox, PixelPaths, spritePaths } from "./pixel-sprite";
import { FIRE_BASE, FLAME_FRAMES } from "./sprites";

/** The fire is 16 by 14 art pixels: a 12 by 12 flame over a 16 by 4 base. */
export const CAMPFIRE_SIZE = { cols: 16, rows: 14 } as const;

/**
 * The campfire as SVG groups, for use inside a larger <svg>. Three flame
 * frames are stacked and shown one at a time with steps() timing. With
 * animation off, only the first frame is visible.
 */
export function CampfireParts({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform="translate(0 10)">
        <PixelPaths paths={spritePaths(FIRE_BASE)} />
      </g>
      {FLAME_FRAMES.map((frame, index) => (
        <g
          key={index}
          transform="translate(2 0)"
          className={`lv-fire-${index + 1}`}
        >
          <PixelPaths paths={spritePaths(frame)} />
        </g>
      ))}
      <rect
        className="lv-spark"
        x={5}
        y={-1}
        width={1}
        height={1}
        fill="var(--art-flame)"
      />
      <rect
        className="lv-spark"
        style={{ animationDelay: "-960ms" }}
        x={10}
        y={1}
        width={1}
        height={1}
        fill="var(--art-flame-outer)"
      />
    </g>
  );
}

export function Campfire({ className }: { className?: string }) {
  const { cols, rows } = CAMPFIRE_SIZE;
  return (
    <svg
      viewBox={`0 -4 ${cols} ${rows + 4}`}
      className={`lv-sprite ${className ?? ""}`}
      style={pixelBox(cols, rows + 4)}
      aria-hidden
      focusable="false"
    >
      <CampfireParts />
    </svg>
  );
}
