import type { CSSProperties } from "react";
import { STAR_FILL, sparklePath, type Star } from "./seeded";

function twinkleStyle(star: Star): CSSProperties | undefined {
  if (!star.twinkle) {
    return undefined;
  }

  return {
    "--twinkle-dur": `${star.twinkle.duration}s`,
    "--twinkle-delay": `${star.twinkle.delay}s`,
  } as CSSProperties;
}

/** The stars themselves. Put this inside an <svg> with a matching viewBox. */
export function StarField({ stars }: { stars: ReadonlyArray<Star> }) {
  return (
    <g>
      {stars.map((star, index) =>
        star.sparkle ? (
          <path
            key={index}
            d={sparklePath(star.r)}
            transform={`translate(${star.x} ${star.y})`}
            fill={STAR_FILL[star.tone]}
            opacity={star.opacity}
            className="sl-twinkle"
            style={twinkleStyle(star)}
          />
        ) : (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill={STAR_FILL[star.tone]}
            opacity={star.opacity}
            className={star.twinkle ? "sl-twinkle" : undefined}
            style={twinkleStyle(star)}
          />
        ),
      )}
    </g>
  );
}
