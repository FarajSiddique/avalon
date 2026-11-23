import type { CSSProperties } from "react";

/** A style that also sets CSS custom properties (`--name`), typed without a cast. */
export type StyleWithVars = CSSProperties & {
  [name: `--${string}`]: string | number;
};

/** Inline style with custom properties, e.g. `cssVars({ "--i": 2 })`. */
export function cssVars(style: StyleWithVars): CSSProperties {
  return style;
}
