import { useId, type CSSProperties } from "react";
import { useSceneArt } from "./scene-context";
import type { FireStyle } from "./scene-options";

const SPARKS = [
  { x: -10, y: -52, drift: "-12px", delay: "0s" },
  { x: 6, y: -58, drift: "10px", delay: "1.1s" },
  { x: 14, y: -46, drift: "16px", delay: "2s" },
  { x: -3, y: -64, drift: "-4px", delay: "2.6s" },
] as const;

/**
 * The fire, drawn around 0,0 (the middle of its base). Shared by the landing
 * scene and the middle of the seat ring. The version drawn comes from the
 * scene-art context unless `variant` says otherwise.
 */
export function Fire({ variant }: { variant?: FireStyle }) {
  const chosen = useSceneArt().fire;
  switch (variant ?? chosen) {
    case "tipi":
      return <TipiFire />;
    case "cauldron":
      return <CauldronFire />;
    case "brazier":
      return <BrazierFire />;
    default:
      return <CrossedFire />;
  }
}

const INK = {
  stroke: "var(--art-outline)",
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

function Sparks({ dy = 0 }: { dy?: number }) {
  return (
    <g transform={`translate(0 ${dy})`}>
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
    </g>
  );
}

/** The three nested flames of the original fire, base at 0,0, scaled. */
function Flames({ scale = 1, dy = 0 }: { scale?: number; dy?: number }) {
  return (
    <g transform={`translate(0 ${dy}) scale(${scale})`}>
      <path
        className="sl-flame"
        d="M-26 -2C-38 -28 -16 -44 -9 -74C-2 -56 12 -54 9 -34C18 -42 20 -54 18 -62C34 -42 38 -18 24 -2Z"
        fill="var(--art-fire-outer)"
        {...INK}
        strokeWidth={2 / scale}
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
    </g>
  );
}

function Stone({
  x,
  y,
  rx = 9,
  ry = 6,
  shade = false,
}: {
  x: number;
  y: number;
  rx?: number;
  ry?: number;
  shade?: boolean;
}) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={rx}
      ry={ry}
      fill={shade ? "var(--art-stone-shade)" : "var(--art-stone)"}
      stroke="var(--art-outline)"
      strokeWidth={2}
    />
  );
}

/** A log (or a pole) as an inked stroke. */
function Log({ d, width = 10 }: { d: string; width?: number }) {
  return (
    <g strokeLinecap="round" fill="none">
      <path d={d} stroke="var(--art-outline)" strokeWidth={width + 5} />
      <path d={d} stroke="var(--art-log)" strokeWidth={width} />
    </g>
  );
}

/** Logs leaned into a cone, flames climbing through the gaps. */
function TipiFire() {
  return (
    <g>
      <Stone x={-36} y={6} />
      <Stone x={36} y={7} />
      <Log d="M-30 4L-3 -52" width={8} />
      <Log d="M30 4L3 -52" width={8} />
      <Log d="M-4 6L0 -56" width={8} />
      <Flames scale={0.95} />
      <Log d="M-17 8L-1 -44" width={8} />
      <Log d="M17 8L1 -44" width={8} />
      <path
        d="M-14 -2L-6 -20M12 -4L5 -19"
        stroke="var(--art-log-end)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Sparks dy={-6} />
      <Stone x={-12} y={11} rx={8} ry={5} shade />
      <Stone x={12} y={11} rx={9} ry={5.5} />
    </g>
  );
}

/** A pot hung from a lashed tripod over a low fire, with steam rising. */
function CauldronFire() {
  return (
    <g>
      <Log d="M0 -98L6 6" width={3} />
      <Stone x={-34} y={7} />
      <Stone x={34} y={8} />
      <g transform="scale(0.8)">
        <Log d="M-30 4L26 -9M-26 -9L30 4" />
      </g>
      <Flames scale={0.5} />
      <path
        d="M0 -94V-64"
        stroke="var(--art-steel)"
        strokeWidth={2}
        strokeDasharray="3 2"
      />
      <path
        d="M-22 -60Q0 -82 22 -60"
        fill="none"
        stroke="var(--art-steel)"
        strokeWidth={1.75}
      />
      <path
        d="M-25 -60C-27 -36 -16 -28 0 -28C16 -28 27 -36 25 -60Z"
        fill="var(--art-trunk)"
        {...INK}
        strokeWidth={2}
      />
      <path
        d="M-18 -50C-18 -40 -12 -34 -4 -32"
        fill="none"
        stroke="var(--art-log-end)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <ellipse
        cx={0}
        cy={-60}
        rx={27}
        ry={6}
        fill="var(--art-stone-shade)"
        {...INK}
        strokeWidth={2}
      />
      <ellipse
        cx={0}
        cy={-60}
        rx={20}
        ry={3}
        fill="var(--art-fire-mid)"
        opacity={0.7}
      />
      <g
        fill="none"
        stroke="var(--art-star)"
        strokeWidth={2.25}
        strokeLinecap="round"
        opacity={0.55}
      >
        <path className="sl-flame" d="M-8 -66q-7 -9 0 -18q7 -9 0 -18" />
        <path
          className="sl-flame sl-flame--inner"
          d="M7 -68q6 -8 0 -15q-6 -8 0 -15"
        />
      </g>
      <Log d="M0 -98L-48 10" width={3} />
      <Log d="M0 -98L48 10" width={3} />
      <circle
        cx={0}
        cy={-98}
        r={4.5}
        fill="var(--art-log-end)"
        {...INK}
        strokeWidth={1.5}
      />
      <Sparks dy={10} />
    </g>
  );
}

/** A gold-rimmed iron bowl on three legs, with tall flames. */
function BrazierFire() {
  return (
    <g>
      <g strokeLinecap="round">
        <path
          d="M-20 -12L-32 8M20 -12L32 8M0 -8V10"
          stroke="var(--art-outline)"
          strokeWidth={8}
        />
        <path
          d="M-20 -12L-32 8M20 -12L32 8M0 -8V10"
          stroke="var(--art-stone-shade)"
          strokeWidth={4}
        />
      </g>
      <Flames scale={1.1} dy={-30} />
      <path
        d="M-37 -30H37C35 -12 19 -4 0 -4C-19 -4 -35 -12 -37 -30Z"
        fill="var(--art-stone)"
        {...INK}
        strokeWidth={2}
      />
      <path
        d="M-20 -20C-14 -12 -6 -10 2 -10"
        fill="none"
        stroke="var(--art-steel)"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.6}
      />
      <rect
        x={-40}
        y={-35}
        width={80}
        height={6}
        rx={3}
        fill="var(--art-gold)"
        {...INK}
        strokeWidth={2}
      />
      <g fill="var(--art-fire-outer)" {...INK} strokeWidth={1.5}>
        <circle cx={-24} cy={-36} r={4} />
        <circle cx={-10} cy={-37} r={4.5} />
        <circle cx={8} cy={-37} r={4} />
        <circle cx={22} cy={-36} r={4.5} />
      </g>
      <Sparks dy={-36} />
    </g>
  );
}

/** The original: stones, two crossed logs, three flat flames and sparks. */
function CrossedFire() {
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
