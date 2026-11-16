import { useId } from "react";
import type { Alignment, Role } from "@/shared/roles";
import { GlowGradient } from "./campfire";
import { sparklePath } from "./seeded";

type Point = readonly [x: number, y: number];

interface Figure {
  /** What the stars draw, for the caption. */
  name: string;
  stars: readonly Point[];
  /** Pairs of star indexes joined by a line. */
  lines: readonly (readonly [number, number])[];
  /** Index of the brightest star. */
  bright: number;
}

/** The Sage's Hat: a tall, bent point over a wide brim. */
const HAT: Figure = {
  name: "The Sage's Hat",
  stars: [
    [30, 110],
    [68, 97],
    [86, 58],
    [118, 16],
    [124, 60],
    [136, 97],
    [172, 110],
  ],
  lines: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [1, 5],
  ],
  bright: 3,
};

/** The Dagger: pommel, crossguard and a long blade. */
const DAGGER: Figure = {
  name: "The Dagger",
  stars: [
    [136, 14],
    [124, 34],
    [98, 22],
    [148, 50],
    [98, 72],
    [62, 116],
  ],
  lines: [
    [0, 1],
    [2, 1],
    [1, 3],
    [1, 4],
    [4, 5],
  ],
  bright: 5,
};

/** The Shield and The Thorn stand in for roles without a figure of their own. */
const SHIELD: Figure = {
  name: "The Shield",
  stars: [
    [56, 22],
    [100, 12],
    [144, 22],
    [140, 70],
    [100, 116],
    [60, 70],
  ],
  lines: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 0],
  ],
  bright: 1,
};

const THORN: Figure = {
  name: "The Thorn",
  stars: [
    [40, 100],
    [84, 78],
    [70, 40],
    [120, 60],
    [160, 20],
  ],
  lines: [
    [0, 1],
    [1, 2],
    [1, 3],
    [3, 4],
  ],
  bright: 4,
};

const FIGURES: Partial<Record<Role, Figure>> = {
  merlin: HAT,
  assassin: DAGGER,
};

export function constellationFor(role: Role, alignment: Alignment): Figure {
  return FIGURES[role] ?? (alignment === "good" ? SHIELD : THORN);
}

/**
 * A role's constellation. The lines draw themselves when it appears (each
 * path has pathLength 1, so one dash is the whole line).
 */
export function Constellation({
  figure,
  color,
  className,
}: {
  figure: Figure;
  color: string;
  className?: string;
}) {
  const id = useId();
  const bright = figure.stars[figure.bright];
  return (
    <svg
      viewBox="0 0 200 130"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <GlowGradient id={`${id}-glow`} color={color} />
      </defs>
      {figure.lines.map(([from, to]) => {
        const a = figure.stars[from];
        const b = figure.stars[to];
        if (!a || !b) return null;
        return (
          <path
            key={`${from}-${to}`}
            className="sl-constellation__line"
            pathLength={1}
            d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`}
            opacity={0.8}
          />
        );
      })}
      {bright && (
        <circle
          cx={bright[0]}
          cy={bright[1]}
          r={26}
          fill={`url(#${id}-glow)`}
        />
      )}
      {figure.stars.map(([x, y], index) =>
        index === figure.bright ? (
          <path
            key={index}
            d={sparklePath(13)}
            transform={`translate(${x} ${y})`}
            fill={color}
          />
        ) : (
          <circle key={index} cx={x} cy={y} r={3.4} fill="var(--art-star)" />
        ),
      )}
    </svg>
  );
}
