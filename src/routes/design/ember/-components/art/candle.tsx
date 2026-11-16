/**
 * A tallow candle on a small dish. Original SVG. A lit candle has a flame
 * that flickers and a halo of light; a snuffed one has a curl of smoke.
 * Decorative unless a parent gives it a label.
 */
export function Candle({
  lit = true,
  height = 64,
  className,
}: {
  lit?: boolean;
  /** Rendered height in pixels. The width follows (ratio 5:8). */
  height?: number;
  className?: string;
}) {
  const width = (height * 5) / 8;
  return (
    <span
      className={`relative inline-block shrink-0 ${className ?? ""}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      {lit ? (
        <span className="ember-rune-halo ember-halo absolute -inset-x-[70%] -top-[45%] bottom-[25%]" />
      ) : null}
      <svg
        viewBox="0 0 40 64"
        width={width}
        height={height}
        className="relative"
        focusable="false"
      >
        {/* dish */}
        <ellipse cx={20} cy={58} rx={15} ry={4.5} fill="var(--ember-oak-600)" />
        <ellipse
          cx={20}
          cy={56.5}
          rx={12}
          ry={3}
          fill="var(--ember-char-950)"
        />
        {/* wax body with drips */}
        <path
          d="M12 30c0-2 3-3 8-3s8 1 8 3v26c0 1.5-3 2.5-8 2.5s-8-1-8-2.5Z"
          fill={
            lit ? "var(--ember-parchment-200)" : "var(--ember-parchment-400)"
          }
        />
        <path
          d="M23 28c3 .3 5 1 5 2v26c0 1.2-2 2.1-5 2.4Z"
          fill="var(--ember-ink-700)"
          opacity={0.35}
        />
        <path
          d="M12 31c0 4 1.2 5 1.2 9 0 1.6 2.2 1.6 2.2 0 0-3 1.6-4 1.6-7"
          fill="none"
          stroke="var(--ember-parchment-100)"
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={lit ? 0.9 : 0.4}
        />
        <ellipse
          cx={20}
          cy={30}
          rx={8}
          ry={2.6}
          fill={lit ? "var(--ember-gold-200)" : "var(--ember-parchment-300)"}
        />
        {/* wick */}
        <path
          d="M20 30v-5"
          stroke="var(--ember-char-950)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        {lit ? (
          <g className="ember-flame">
            <path
              d="M20 4c4 6 6.5 9.5 6.5 14 0 4.2-2.9 7-6.5 7s-6.5-2.8-6.5-7c0-4.5 2.5-8 6.5-14Z"
              fill="var(--ember-flame-500)"
            />
            <path
              d="M20 10c2.5 4 4 6 4 9 0 2.8-1.8 4.6-4 4.6s-4-1.8-4-4.6c0-3 1.5-5 4-9Z"
              fill="var(--ember-gold-300)"
            />
            <path
              d="M20 16c1.2 2 1.9 3 1.9 4.5 0 1.5-.9 2.5-1.9 2.5s-1.9-1-1.9-2.5c0-1.5.7-2.5 1.9-4.5Z"
              fill="var(--ember-parchment-100)"
            />
          </g>
        ) : (
          <path
            d="M20 23c-3-3 3-5 0-8s3-5 0-8"
            fill="none"
            stroke="var(--ink-muted)"
            strokeWidth={1.3}
            strokeLinecap="round"
            opacity={0.7}
          />
        )}
      </svg>
    </span>
  );
}
