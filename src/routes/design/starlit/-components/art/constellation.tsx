import { useId, type CSSProperties } from "react";
import type { Alignment, Role } from "@/shared/roles";
import { cssVars } from "@/design/css-vars";
import { sparklePath } from "./seeded";

type Point = readonly [x: number, y: number];

interface Figure {
  /** What the stars draw, for the caption. */
  name: string;
  stars: ReadonlyArray<Point>;
  /** Pairs of star indexes joined by a line. */
  lines: ReadonlyArray<readonly [number, number]>;
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

/** Milliseconds: when the drawing starts, and the gap between lines. */
const DRAW_START = 160;
const LINE_GAP = 120;
const LINE_DRAW = 240;

/**
 * When each line starts and each star lights. The lines draw one after
 * another in the figure's order, and a star lights as the first line
 * reaches it, so the figure is traced star by star. The brightest star
 * lights last, as the full stop.
 */
interface Timeline {
  /** When each line starts drawing, in the figure's order. */
  lines: Array<number>;
  /** When each star lights, by index. */
  stars: Array<number>;
}

function timeline(figure: Figure): Timeline {
  const stars = figure.stars.map(() => Number.POSITIVE_INFINITY);
  const lines = figure.lines.map(([from, to], index) => {
    const start = DRAW_START + index * LINE_GAP;

    stars[from] = Math.min(stars[from] ?? start, start);
    stars[to] = Math.min(stars[to] ?? start, start + LINE_DRAW - 40);

    return start;
  });
  const end = DRAW_START + figure.lines.length * LINE_GAP + LINE_DRAW;

  stars[figure.bright] = end;

  return {
    lines,
    stars: stars.map((ms) => (Number.isFinite(ms) ? ms : DRAW_START)),
  };
}

function delay(ms: number | undefined): CSSProperties {
  return cssVars({ "--at": `${ms ?? 0}ms` });
}

/**
 * A role's constellation. It draws itself when it appears: each line in
 * turn (each path has pathLength 1, so one dash is the whole line), each
 * star lighting as a line reaches it, the brightest last with its glow.
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
  const times = timeline(figure);

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
      {figure.lines.map(([from, to], index) => {
        const a = figure.stars[from];
        const b = figure.stars[to];

        if (!a || !b) {
          return null;
        }

        return (
          <path
            key={`${from}-${to}`}
            className="sl-constellation__line sl-seq"
            style={delay(times.lines[index])}
            pathLength={1}
            d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`}
            opacity={0.8}
          />
        );
      })}
      {bright && (
        <circle
          className="sl-constellation__glow sl-seq"
          style={delay(times.stars[figure.bright])}
          cx={bright[0]}
          cy={bright[1]}
          r={26}
          fill={`url(#${id}-glow)`}
        />
      )}
      {figure.stars.map(([x, y], index) =>
        index === figure.bright ? (
          <g key={index} transform={`translate(${x} ${y})`}>
            <path
              className="sl-constellation__star sl-constellation__star--bright sl-seq"
              style={delay(times.stars[index])}
              d={sparklePath(13)}
              fill={color}
            />
          </g>
        ) : (
          <g key={index} transform={`translate(${x} ${y})`}>
            <circle
              className="sl-constellation__star sl-seq"
              style={delay(times.stars[index])}
              r={3.4}
              fill="var(--art-star)"
            />
          </g>
        ),
      )}
    </svg>
  );
}

function GlowGradient({ id, color }: { id: string; color: string }) {
  return (
    <radialGradient id={id}>
      <stop offset="0" stopColor={color} stopOpacity={0.6} />
      <stop offset="0.45" stopColor={color} stopOpacity={0.2} />
      <stop offset="1" stopColor={color} stopOpacity={0} />
    </radialGradient>
  );
}
