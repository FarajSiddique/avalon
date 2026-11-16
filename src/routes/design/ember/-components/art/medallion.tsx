import type { CSSProperties } from "react";

/** Eight studs around the frame, like rivets on a round portrait frame. */
function Studs() {
  return (
    <svg
      viewBox="-50 -50 100 100"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d="M0-49.5 2.2-46.5 0-43.5-2.2-46.5Z"
          fill="var(--medal-ring)"
          stroke="var(--frame-outer)"
          strokeWidth={0.6}
          transform={`rotate(${i * 45})`}
        />
      ))}
    </svg>
  );
}

/**
 * A round, framed heraldic medallion holding the player's monogram. The
 * frame is CSS (see .ember-medallion); the studs are SVG.
 */
export function Medallion({
  name,
  size,
  you = false,
  team = false,
  away = false,
  className,
}: {
  name: string;
  /** Pixel size. Defaults to the --seat-size token. */
  size?: number;
  you?: boolean;
  team?: boolean;
  away?: boolean;
  className?: string;
}) {
  const style = size
    ? ({ "--medal-size": `${size}px` } as CSSProperties)
    : undefined;
  const classes = [
    "ember-medallion",
    you ? "ember-medallion--you" : "",
    team ? "ember-medallion--team" : "",
    away ? "ember-medallion--away" : "",
    className ?? "",
  ].join(" ");

  return (
    <span className={classes} style={style} aria-hidden="true">
      <Studs />
      <span className="relative translate-y-[4%]">
        {name.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}
