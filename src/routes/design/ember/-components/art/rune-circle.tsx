import type { ReactNode } from "react";

/**
 * The rune circle at the centre of the table. Original artwork: concentric
 * rings, an inscribed triangle and a band of invented rune strokes.
 *
 * It is drawn as two stacked SVGs so the glyph band can turn (one slow CSS
 * rotation of the whole element, which stays on the compositor) while the
 * triangle counter-turns. `children` sit on a dark core in the middle, so
 * text never has to be read across the glowing lines.
 */

/** Invented rune strokes, each drawn in a box 8 wide and 12 tall. */
const GLYPHS = [
  "M-3-6V6M-3-6 3-2-3 2",
  "M0-6V6M-3-3 3 3M3-3-3 3",
  "M-3 6V-6L3-1V6",
  "M0-6V6M0-6 4-3M0-2 4 1",
  "M-3-6 3 0-3 6M3-6V6",
  "M0-6V6M-4-2 0-6 4-2",
  "M-3-6V6M3-6V6M-3-2 3 2",
  "M0-6 4 0 0 6-4 0Z",
  "M0-6V6M-3 0H3",
  "M-3 6 0-6 3 6M-1.5 1h3",
  "M-3-6V6M-3 0 3-6M-3 0 3 6",
  "M-3-6H3L-3 6H3",
] as const;

const GLYPH_COUNT = 18;
const TICK_COUNT = 36;

function GlyphBand() {
  return (
    <svg
      viewBox="-100 -100 200 200"
      className="ember-rune ember-turn absolute inset-0 h-full w-full"
      fill="none"
      stroke="var(--rune-line)"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle r={97} strokeWidth={1.6} />
      <circle r={91} strokeWidth={0.7} />
      <circle r={71} strokeWidth={1.4} />
      {Array.from({ length: TICK_COUNT }, (_, i) => (
        <path
          key={`tick-${i}`}
          d="M0-91V-94.5"
          strokeWidth={0.8}
          transform={`rotate(${i * (360 / TICK_COUNT)})`}
        />
      ))}
      {Array.from({ length: GLYPH_COUNT }, (_, i) => (
        <path
          key={`glyph-${i}`}
          d={GLYPHS[i % GLYPHS.length]}
          strokeWidth={1.5}
          stroke={i % 3 === 0 ? "var(--rune-line-hot)" : undefined}
          transform={`rotate(${i * (360 / GLYPH_COUNT)}) translate(0 -81)`}
        />
      ))}
    </svg>
  );
}

function Sigil() {
  return (
    <svg
      viewBox="-100 -100 200 200"
      className="ember-rune ember-turn ember-turn--back absolute inset-0 h-full w-full"
      fill="none"
      stroke="var(--rune-line)"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle r={66} strokeWidth={0.6} strokeDasharray="1.5 4" />
      <path d="M0-66 57.2 33-57.2 33Z" strokeWidth={1.4} />
      <path
        d="M0 66-57.2-33 57.2-33Z"
        strokeWidth={0.6}
        stroke="var(--rune-line-hot)"
        opacity={0.55}
      />
      <circle r={47} strokeWidth={0.8} />
      {[0, 120, 240].map((angle) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <circle cy={-66} r={4} strokeWidth={1.2} fill="var(--well)" />
          <path d="M0-47V-60" strokeWidth={0.6} />
        </g>
      ))}
    </svg>
  );
}

export function RuneCircle({
  children,
  className,
  bare = false,
}: {
  /** Shown on the dark core in the middle. */
  children?: ReactNode;
  className?: string;
  /** No dark core: the circle is pure decoration. */
  bare?: boolean;
}) {
  return (
    <div className={`relative aspect-square ${className ?? ""}`}>
      <div
        className="ember-rune-halo ember-halo absolute -inset-[14%]"
        aria-hidden="true"
      />
      <GlyphBand />
      <Sigil />
      {bare ? null : (
        <div className="ember-rune-core absolute inset-[28%] grid place-items-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
