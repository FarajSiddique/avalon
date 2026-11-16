import { useId, type CSSProperties } from "react";

const SPARKS = [
  { x: -10, y: -52, drift: "-12px", delay: "0s" },
  { x: 6, y: -58, drift: "10px", delay: "1.1s" },
  { x: 14, y: -46, drift: "16px", delay: "2s" },
  { x: -3, y: -64, drift: "-4px", delay: "2.6s" },
] as const;

/**
 * The fire: stones, two crossed logs, three flat flames and a few sparks,
 * drawn around 0,0 (the middle of the fire's base). Shared by the landing
 * scene and the middle of the seat ring.
 */
export function Fire() {
  return (
    <g>
      {[-38, -22, 24, 39].map((x, index) => (
        <ellipse
          key={x}
          cx={x}
          cy={index % 2 === 0 ? 7 : 9}
          rx={9}
          ry={6}
          fill="var(--art-stone)"
          stroke="var(--art-outline)"
          strokeWidth={2}
        />
      ))}
      <g strokeLinecap="round">
        <path
          d="M-30 4L26 -9M-26 -9L30 4"
          stroke="var(--art-outline)"
          strokeWidth={15}
        />
        <path
          d="M-30 4L26 -9M-26 -9L30 4"
          stroke="var(--art-log)"
          strokeWidth={10}
        />
        <path
          d="M-24 1L-6 -3M8 -3L22 0"
          stroke="var(--art-log-end)"
          strokeWidth={2.5}
        />
      </g>
      <path
        className="sl-flame"
        d="M-26 -2C-38 -28 -16 -44 -9 -74C-2 -56 12 -54 9 -34C18 -42 20 -54 18 -62C34 -42 38 -18 24 -2Z"
        fill="var(--art-fire-outer)"
        stroke="var(--art-outline)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        className="sl-flame sl-flame--inner"
        d="M-16 -2C-23 -20 -9 -30 -4 -50C2 -36 11 -32 9 -18C13 -22 15 -29 14 -34C22 -20 22 -10 14 -2Z"
        fill="var(--art-fire-mid)"
      />
      <path
        className="sl-flame"
        d="M-7 -2C-10 -11 -3 -17 0 -28C4 -17 9 -10 6 -2Z"
        fill="var(--art-fire-core)"
      />
      {SPARKS.map((spark) => (
        <circle
          key={spark.delay}
          className="sl-spark"
          cx={spark.x}
          cy={spark.y}
          r={2}
          fill="var(--art-fire-mid)"
          style={
            {
              "--spark-x": spark.drift,
              animationDelay: spark.delay,
            } as CSSProperties
          }
        />
      ))}
      <ellipse
        cx={-9}
        cy={10}
        rx={8}
        ry={5}
        fill="var(--art-stone-shade)"
        stroke="var(--art-outline)"
        strokeWidth={2}
      />
      <ellipse
        cx={9}
        cy={11}
        rx={9}
        ry={5.5}
        fill="var(--art-stone)"
        stroke="var(--art-outline)"
        strokeWidth={2}
      />
    </g>
  );
}

/** A soft round glow for a light source. `id` must be unique on the page. */
export function GlowGradient({ id, color }: { id: string; color: string }) {
  return (
    <radialGradient id={id}>
      <stop offset="0" stopColor={color} stopOpacity={0.6} />
      <stop offset="0.45" stopColor={color} stopOpacity={0.2} />
      <stop offset="1" stopColor={color} stopOpacity={0} />
    </radialGradient>
  );
}

/** The campfire on its own patch of lit grass, for the middle of the table. */
export function Campfire({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg
      viewBox="-110 -120 220 170"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <GlowGradient id={`${id}-glow`} color="var(--art-fire-glow)" />
      </defs>
      <ellipse cx={0} cy={14} rx={104} ry={24} fill="var(--art-ground-lit-1)" />
      <ellipse cx={0} cy={13} rx={70} ry={16} fill="var(--art-ground-lit-2)" />
      <ellipse cx={0} cy={12} rx={36} ry={8} fill="var(--art-ground-lit-3)" />
      <circle
        className="sl-fire-glow"
        cx={0}
        cy={-26}
        r={92}
        fill={`url(#${id}-glow)`}
      />
      <Fire />
    </svg>
  );
}
