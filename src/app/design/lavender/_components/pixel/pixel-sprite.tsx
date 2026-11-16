import type { CSSProperties } from "react";
import {
  PixelCanvas,
  spriteSize,
  type Palette,
  type PixelPath,
  type Sprite,
} from "./pixel-canvas";
import { HELM, ICONS, plumePalette, type IconName } from "./sprites";

/** The paths for one sprite, for composing sprites inside a larger <svg>. */
export function spritePaths(sprite: Sprite, palette?: Palette): PixelPath[] {
  const { cols, rows } = spriteSize(sprite.rows);
  const canvas = new PixelCanvas(cols, rows);
  canvas.sprite(sprite, 0, 0, { palette });
  return canvas.toPaths();
}

export function PixelPaths({ paths }: { paths: PixelPath[] }) {
  return (
    <>
      {paths.map((path) => (
        <path key={path.fill} d={path.d} fill={path.fill} />
      ))}
    </>
  );
}

/** CSS size for art that is `cols` by `rows` art pixels. */
export function pixelBox(cols: number, rows: number): CSSProperties {
  return {
    width: `calc(var(--px) * ${cols})`,
    height: `calc(var(--px) * ${rows})`,
  };
}

interface PixelSpriteProps {
  sprite: Sprite;
  /** Recolour some characters, for example the plume. */
  palette?: Palette;
  /** Leave out for decoration. Set it when the sprite carries meaning alone. */
  label?: string;
  className?: string;
}

/**
 * Draws a sprite at one art pixel per character. The size follows --px, so
 * every sprite on a screen shares the same pixel size.
 */
export function PixelSprite({
  sprite,
  palette,
  label,
  className,
}: PixelSpriteProps) {
  const { cols, rows } = spriteSize(sprite.rows);
  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      className={`lv-sprite ${className ?? ""}`}
      style={pixelBox(cols, rows)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <PixelPaths paths={spritePaths(sprite, palette)} />
    </svg>
  );
}

export function PixelIcon({
  name,
  label,
  className,
}: {
  name: IconName;
  label?: string;
  className?: string;
}) {
  return (
    <PixelSprite sprite={ICONS[name]} label={label} className={className} />
  );
}

/** A seat's avatar: the helm, with the plume colour of that seat. */
export function Helm({
  seatIndex,
  className,
}: {
  seatIndex: number;
  className?: string;
}) {
  return (
    <PixelSprite
      sprite={HELM}
      palette={plumePalette(seatIndex)}
      className={className}
    />
  );
}
