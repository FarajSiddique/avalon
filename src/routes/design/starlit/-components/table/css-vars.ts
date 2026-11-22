import type { CSSProperties } from "react";

/** CSS custom properties set from a style prop: `--at`, `--head-h`, ... */
export type CssVars = Readonly<Record<`--${string}`, string>>;

/**
 * React's `CSSProperties` has no custom properties. Every custom property
 * is a valid style, so this widens without an assertion.
 */
export function cssVars(vars: CssVars): CSSProperties {
  return vars;
}
