import type { CSSProperties, ReactNode } from "react";
import { campTransform, castleTransform } from "./backdrop-layout";
import { Cloud } from "./cloud";
import { makeGrass, makeValleyLights } from "./lights";
import type { BackdropStyle } from "./scene-options";
import { round, seededRandom, sparklePath } from "./seeded";

/**
 * Whole-scene alternatives to the original vale. Each one changes the
 * horizon, the landmark and where the camp sits, and keeps the rules of the
 * original: the sky stays open for the page's star field, everything that
 * matters sits in the right-hand 60% (what a phone sees), and the bottom edge
 * is the dark ground the landing form sits on.
 */
export interface BackdropProps {
  id: string;
  /** The camp, drawn at its place in the original vale. */
  camp: ReactNode;
  /** The chosen castle, drawn at its place in the original vale. */
  castle: ReactNode;
}

const OUTLINE = {
  stroke: "var(--art-outline)",
  strokeWidth: 2.5,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

export function Backdrop({
  style,
  ...props
}: BackdropProps & { style: Exclude<BackdropStyle, "vale"> }) {
  switch (style) {
    case "lake":
      return <LakeBackdrop {...props} />;
    case "coast":
      return <CoastBackdrop {...props} />;
    case "forest":
      return <ForestBackdrop {...props} />;
    case "peaks":
      return <PeaksBackdrop {...props} />;
  }
}

/* ---------- shared pieces ---------- */

function Defs({ id }: { id: string }) {
  return (
    <>
      <radialGradient id={`${id}-moonglow`}>
        <stop offset="0" stopColor="var(--art-moon)" stopOpacity={0.6} />
        <stop offset="0.45" stopColor="var(--art-moon)" stopOpacity={0.2} />
        <stop offset="1" stopColor="var(--art-moon)" stopOpacity={0} />
      </radialGradient>
      <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--art-sky-horizon)" />
        <stop offset="0.35" stopColor="var(--art-hill-3)" />
        <stop offset="1" stopColor="var(--art-hill-4)" />
      </linearGradient>
    </>
  );
}

function Moon({
  id,
  x,
  y,
  r = 34,
  full = false,
}: {
  id: string;
  x: number;
  y: number;
  r?: number;
  full?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r * 2.6} fill={`url(#${id}-moonglow)`} />
      {full ? (
        <>
          <circle r={r} fill="var(--art-moon)" />
          <g fill="var(--art-steel)" opacity={0.55}>
            <circle cx={-r * 0.32} cy={-r * 0.2} r={r * 0.17} />
            <circle cx={r * 0.28} cy={r * 0.3} r={r * 0.12} />
            <circle cx={r * 0.12} cy={-r * 0.45} r={r * 0.08} />
          </g>
        </>
      ) : (
        <path
          d={`M0 ${-r}A${r} ${r} 0 1 0 0 ${r}A${r * 0.68} ${r} 0 1 1 0 ${-r}Z`}
          transform="rotate(-28)"
          fill="var(--art-moon)"
        />
      )}
    </g>
  );
}

/** Moonlight broken on water: a column of short strokes that shimmer. */
function MoonPath({
  x,
  top,
  bottom,
  seed,
  spread = 1,
}: {
  x: number;
  top: number;
  bottom: number;
  seed: number;
  spread?: number;
}) {
  const random = seededRandom(seed);
  const rows: { x: number; y: number; w: number; dur: string }[] = [];
  for (let y = top; y < bottom; y += 7 + (y - top) * 0.05) {
    const t = (y - top) / (bottom - top);
    const w = (14 + t * 70 + random() * 26) * spread;
    rows.push({
      x: round(x + (random() - 0.5) * (10 + t * 40) - w / 2),
      y: round(y),
      w: round(w),
      dur: `${round(3 + random() * 4)}s`,
    });
  }
  return (
    <g fill="var(--art-moon)">
      {rows.map((row, index) => (
        <rect
          key={index}
          className="sl-twinkle"
          x={row.x}
          y={row.y}
          width={row.w}
          height={2.5}
          rx={1.25}
          opacity={0.75 - (index / rows.length) * 0.4}
          style={{ "--twinkle-dur": row.dur } as CSSProperties}
        />
      ))}
    </g>
  );
}

/** A layered fir, base centre at x, y. */
function Pine({
  x,
  y,
  h,
  fill = "var(--art-tree)",
  outline = false,
}: {
  x: number;
  y: number;
  h: number;
  fill?: string;
  outline?: boolean;
}) {
  const w = h * 0.36;
  const tiers = [0, 0.3, 0.55];
  const d = tiers
    .map((t, i) => {
      const top = y - h + t * h;
      const base = y - h * 0.12 - (2 - i) * h * 0.2;
      const half = w * (0.55 + i * 0.25);
      return `M${round(x)} ${round(top)}L${round(x + half)} ${round(base)}Q${round(x)} ${round(base - h * 0.05)} ${round(x - half)} ${round(base)}Z`;
    })
    .join("");
  return (
    <g>
      <rect
        x={x - h * 0.03}
        y={y - h * 0.16}
        width={h * 0.06}
        height={h * 0.16}
        fill="var(--art-trunk)"
      />
      <path
        d={d}
        fill={fill}
        {...(outline ? OUTLINE : {})}
        strokeWidth={outline ? 2 : undefined}
      />
    </g>
  );
}

/** A row of firs with seeded heights, for a tree line. */
function TreeLine({
  from,
  to,
  y,
  seed,
  min,
  max,
  fill,
  step = 0.42,
}: {
  from: number;
  to: number;
  y: number;
  seed: number;
  min: number;
  max: number;
  fill: string;
  step?: number;
}) {
  const random = seededRandom(seed);
  const trees: [number, number, number][] = [];
  for (let x = from; x < to;) {
    const h = min + random() * (max - min);
    trees.push([round(x), round(y + random() * 8), round(h)]);
    x += h * step * (0.7 + random() * 0.6);
  }
  return (
    <g>
      {trees.map(([x, ty, h]) => (
        <Pine key={x} x={x} y={ty} h={h} fill={fill} />
      ))}
    </g>
  );
}

/** Lit grass round the fire, clipped to the ground it sits on. */
function FireLight({
  clip,
  x,
  y,
  scale = 1,
}: {
  clip: string;
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g clipPath={`url(#${clip})`}>
      <ellipse
        cx={x}
        cy={y}
        rx={250 * scale}
        ry={50 * scale}
        fill="var(--art-ground-lit-1)"
      />
      <ellipse
        cx={x}
        cy={y - 2}
        rx={160 * scale}
        ry={31 * scale}
        fill="var(--art-ground-lit-2)"
      />
      <ellipse
        cx={x}
        cy={y - 4}
        rx={84 * scale}
        ry={16 * scale}
        fill="var(--art-ground-lit-3)"
      />
    </g>
  );
}

function Tufts({ points }: { points: readonly (readonly [number, number])[] }) {
  return (
    <g
      fill="none"
      stroke="var(--art-ground-lit-1)"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      {points.map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x - 3} ${y}q-1 -8 -7 -12M${x} ${y}q-1 -9 2 -17M${x + 3} ${y}q2 -7 8 -10M${x + 7} ${y}q3 -4 9 -5`}
        />
      ))}
    </g>
  );
}

/** Drifting motes of light. */
function Fireflies({
  seed,
  count,
  box,
}: {
  seed: number;
  count: number;
  box: [x: number, y: number, w: number, h: number];
}) {
  const random = seededRandom(seed);
  const flies = Array.from({ length: count }, () => ({
    x: round(box[0] + random() * box[2]),
    y: round(box[1] + random() * box[3]),
    r: round(1.6 + random() * 1.6),
    dur: `${round(2.5 + random() * 4)}s`,
    delay: `${round(-random() * 6)}s`,
  }));
  return (
    <g fill="var(--art-ground-lit-3)">
      {flies.map((fly, index) => (
        <circle
          key={index}
          className="sl-twinkle"
          cx={fly.x}
          cy={fly.y}
          r={fly.r}
          style={
            {
              "--twinkle-dur": fly.dur,
              animationDelay: fly.delay,
            } as CSSProperties
          }
        />
      ))}
    </g>
  );
}

function Placed({
  transform,
  tone,
  children,
}: {
  transform: string | undefined;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <g
      transform={transform}
      style={tone ? ({ "--castle-tone": tone } as CSSProperties) : undefined}
    >
      {children}
    </g>
  );
}

/* ---------- Moonlit lake ---------- */

const LAKE_SHORE =
  "M560 700C600 640 700 612 820 598C960 582 1100 566 1240 566C1340 566 1400 574 1440 578V700Z";
const LAKE_GRASS = makeGrass(0, 1440, 700, 4411, { min: 14, max: 46 });
const LAKE_LIGHTS = makeValleyLights(
  [
    [210, 392, 6],
    [460, 388, 5],
    [1120, 390, 7],
    [1300, 394, 5],
  ],
  61,
  { x: 30, y: 4 },
);

function LakeBackdrop({ id, camp, castle }: BackdropProps) {
  const shore = `${id}-shore`;
  const water = `${id}-waterclip`;
  return (
    <>
      <defs>
        <Defs id={id} />
        <clipPath id={shore}>
          <path d={LAKE_SHORE} />
        </clipPath>
        <clipPath id={water}>
          <rect x={0} y={402} width={1440} height={300} />
        </clipPath>
      </defs>
      <Moon id={id} x={1010} y={140} r={40} full />
      <Cloud
        variant="wispy"
        transform="translate(1160 210) scale(0.7)"
        className="sl-drift sl-drift--slow"
      />
      <Cloud
        variant="puffy"
        transform="translate(560 190) scale(0.55)"
        className="sl-drift"
      />

      {/* Far shore: two low ridges and a tree line */}
      <path
        d="M0 350C120 330 220 352 340 340C460 328 540 300 640 306C760 314 820 346 940 340C1060 334 1160 300 1280 310C1360 316 1410 330 1440 328V404H0Z"
        fill="var(--art-hill-1)"
      />
      <path
        d="M0 380C140 368 260 384 400 376C560 368 660 386 820 382C980 378 1120 366 1280 374C1360 378 1410 384 1440 382V404H0Z"
        fill="var(--art-hill-2)"
      />
      <TreeLine
        from={0}
        to={1440}
        y={404}
        seed={88}
        min={16}
        max={34}
        fill="var(--art-hill-3)"
      />
      {LAKE_LIGHTS.map((light, index) => (
        <circle
          key={index}
          cx={light.x}
          cy={light.y}
          r={light.r}
          fill={light.warm ? "var(--art-window)" : "var(--art-star)"}
        />
      ))}

      {/* The lake */}
      <rect
        x={0}
        y={402}
        width={1440}
        height={298}
        fill={`url(#${id}-water)`}
      />

      {/* The island and its castle, and their reflection */}
      <g clipPath={`url(#${water})`} opacity={0.4}>
        <g transform="translate(0 864) scale(1 -1)">
          <Island />
          <Placed transform={castleTransform("lake")} tone="var(--art-hill-1)">
            {castle}
          </Placed>
        </g>
      </g>
      <g stroke="var(--art-hill-3)" strokeWidth={3} strokeLinecap="round">
        {[444, 456, 468, 482, 496, 512].map((y, index) => (
          <path key={y} d={`M${764 + index * 8} ${y}H${960 - index * 12}`} />
        ))}
      </g>
      <Placed transform={castleTransform("lake")} tone="var(--art-hill-3)">
        {castle}
      </Placed>
      <Island />

      <MoonPath x={1010} top={412} bottom={584} seed={9} />
      <g
        fill="none"
        stroke="var(--art-river)"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.55}
      >
        <path d="M120 470H210M300 500H420M160 540H250M420 452H500M1240 450H1340M1300 500H1400M600 520H660M640 470H700" />
      </g>

      {/* The near shore and the camp */}
      <path d={LAKE_SHORE} fill="var(--art-ground)" {...OUTLINE} />
      <FireLight clip={shore} x={960} y={622} />
      <Tufts
        points={[
          [780, 640],
          [700, 668],
          [1200, 600],
          [1330, 612],
          [1260, 660],
          [1080, 680],
        ]}
      />
      <Rowboat />
      <Reeds x={590} y={668} />
      <Placed transform={campTransform("lake")}>{camp}</Placed>
      <Pine x={1418} y={640} h={380} outline />
      <Pine x={1380} y={690} h={250} outline />
      <path d={LAKE_GRASS} fill="var(--art-ground-dark)" />
    </>
  );
}

function Island() {
  return (
    <g>
      <path
        d="M750 432C760 414 786 406 820 404C860 400 900 406 930 410C950 414 962 424 968 432Z"
        fill="var(--art-hill-4)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <Pine x={768} y={420} h={30} fill="var(--art-ground-dark)" />
      <Pine x={938} y={422} h={26} fill="var(--art-ground-dark)" />
      <Pine x={952} y={428} h={18} fill="var(--art-ground-dark)" />
    </g>
  );
}

function Rowboat() {
  return (
    <g transform="translate(720 630) rotate(-6)">
      <path
        d="M-56 -8H58C50 8 30 14 0 14C-30 14 -50 8 -56 -8Z"
        fill="var(--art-log)"
        {...OUTLINE}
      />
      <path d="M-50 -8H52" stroke="var(--art-log-end)" strokeWidth={3} />
      <path d="M-20 -6L-64 -30" stroke="var(--art-log-end)" strokeWidth={4} />
    </g>
  );
}

function Reeds({ x, y }: { x: number; y: number }) {
  return (
    <g strokeLinecap="round">
      <g stroke="var(--art-ground-dark)" strokeWidth={3} fill="none">
        <path
          d={`M${x} ${y}q-2 -40 -10 -70M${x + 10} ${y}q2 -50 -2 -88M${x + 22} ${y}q4 -36 14 -60M${x + 30} ${y}q0 -30 -6 -46M${x - 12} ${y}q-6 -26 -20 -40`}
        />
      </g>
      <g fill="var(--art-log)" stroke="var(--art-outline)" strokeWidth={1.5}>
        <rect x={x - 14} y={y - 82} width={7} height={18} rx={3.5} />
        <rect x={x + 4} y={y - 102} width={7} height={20} rx={3.5} />
        <rect x={x + 32} y={y - 70} width={7} height={16} rx={3.5} />
      </g>
    </g>
  );
}

/* ---------- Clifftop by the sea ---------- */

const HEADLAND =
  "M752 700C740 650 744 604 766 576C840 548 960 520 1050 506C1180 486 1300 470 1440 464V700Z";
const COAST_GRASS = makeGrass(700, 1440, 700, 2213, { min: 14, max: 50 });

function CoastBackdrop({ id, camp, castle }: BackdropProps) {
  const land = `${id}-headland`;
  return (
    <>
      <defs>
        <Defs id={id} />
        <clipPath id={land}>
          <path d={HEADLAND} />
        </clipPath>
      </defs>
      <Moon id={id} x={1020} y={190} r={46} full />
      <Cloud
        variant="puffy"
        transform="translate(1240 150) scale(0.6)"
        className="sl-drift sl-drift--slow"
      />
      <Cloud
        variant="wispy"
        transform="translate(640 120) scale(0.8)"
        className="sl-drift"
      />

      {/* The sea, all the way to the horizon */}
      <rect
        x={0}
        y={372}
        width={1440}
        height={328}
        fill={`url(#${id}-water)`}
      />
      <path d="M0 372H1440" stroke="var(--art-sky-horizon)" strokeWidth={2} />
      <MoonPath x={1020} top={378} bottom={520} seed={31} spread={0.8} />
      <g
        fill="none"
        stroke="var(--art-river)"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.6}
      >
        <path d="M40 420q20 -6 40 0t40 0M220 460q20 -6 40 0t40 0M420 410q16 -5 32 0t32 0M120 540q24 -7 48 0t48 0M380 600q24 -7 48 0t48 0M540 480q20 -6 40 0t40 0M1180 410q16 -5 32 0t32 0M1300 430q16 -5 32 0t32 0" />
      </g>

      {/* The far cliffs and their castle */}
      <path
        d="M620 372C640 352 660 340 700 336C760 330 840 332 900 334C930 336 944 348 950 372Z"
        fill="var(--art-hill-2)"
      />
      <path
        d="M900 334C930 336 944 348 950 372H916Z"
        fill="var(--art-hill-3)"
      />
      <Placed transform={castleTransform("coast")} tone="var(--art-hill-2)">
        {castle}
      </Placed>
      <path
        d="M600 372q12 -4 24 0M940 372q14 -4 28 0"
        stroke="var(--art-star)"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.5}
        fill="none"
      />

      {/* Sea stacks off the point */}
      <SeaStack x={600} y={640} h={120} w={56} />
      <SeaStack x={690} y={660} h={70} w={40} />

      {/* The headland and the camp */}
      <path
        d="M752 700C740 650 744 604 766 576L800 600C790 640 790 670 800 700Z"
        fill="var(--art-stone-shade)"
      />
      <path d={HEADLAND} fill="var(--art-ground)" {...OUTLINE} />
      <path
        d="M752 700C740 650 744 604 766 576C776 600 788 640 792 700Z"
        fill="var(--art-stone)"
        {...OUTLINE}
      />
      <path
        d="M756 640H780M760 610H778M762 670H786"
        stroke="var(--art-stone-shade)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Foam x={748} y={690} />
      <FireLight clip={land} x={1000} y={560} />
      <Tufts
        points={[
          [820, 590],
          [880, 640],
          [1180, 540],
          [1290, 520],
          [1340, 600],
          [1100, 660],
        ]}
      />
      <Placed transform={campTransform("coast")}>{camp}</Placed>
      <Pine x={1416} y={640} h={400} outline />
      <Pine x={1370} y={690} h={220} outline />
      <path d={COAST_GRASS} fill="var(--art-ground-dark)" />
      <rect
        x={0}
        y={694}
        width={1440}
        height={6}
        fill="var(--art-ground-dark)"
      />
    </>
  );
}

function SeaStack({
  x,
  y,
  h,
  w,
}: {
  x: number;
  y: number;
  h: number;
  w: number;
}) {
  return (
    <g>
      <path
        d={`M${x - w / 2} ${y}L${x - w * 0.42} ${y - h * 0.7}L${x - w * 0.2} ${y - h}L${x + w * 0.25} ${y - h * 0.94}L${x + w * 0.5} ${y - h * 0.5}L${x + w / 2} ${y}Z`}
        fill="var(--art-stone-shade)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <path
        d={`M${x - w * 0.2} ${y - h}L${x - w * 0.05} ${y}`}
        stroke="var(--art-stone)"
        strokeWidth={3}
      />
      <Foam x={x} y={y} />
    </g>
  );
}

function Foam({ x, y }: { x: number; y: number }) {
  return (
    <path
      className="sl-twinkle"
      d={`M${x - 40} ${y}q10 -6 20 0t20 0t20 0t20 0`}
      fill="none"
      stroke="var(--art-star)"
      strokeWidth={2.5}
      strokeLinecap="round"
      opacity={0.7}
    />
  );
}

/* ---------- Standing stones in a forest clearing ---------- */

const CLEARING =
  "M0 700V560C200 540 420 520 640 512C840 504 1040 500 1240 506C1340 510 1400 516 1440 520V700Z";
const FOREST_GRASS = makeGrass(0, 1440, 700, 991, { min: 16, max: 52 });
/** The stones of the ring: x, foot y, height, width, lean. */
const STONES = [
  [790, 520, 70, 30, -4],
  [1170, 508, 92, 34, 3],
  [1250, 514, 64, 28, 6],
  [1360, 524, 104, 40, -3],
] as const;

function ForestBackdrop({ id, camp, castle }: BackdropProps) {
  const ground = `${id}-clearing`;
  return (
    <>
      <defs>
        <Defs id={id} />
        <clipPath id={ground}>
          <path d={CLEARING} />
        </clipPath>
      </defs>
      <Moon id={id} x={1170} y={110} r={32} />

      {/* A far hill with the castle, seen through a gap in the trees */}
      <path
        d="M700 420C760 380 820 368 880 370C930 372 960 390 1000 420Z"
        fill="var(--art-hill-1)"
      />
      <Placed transform={castleTransform("forest")} tone="var(--art-hill-1)">
        {castle}
      </Placed>

      {/* Three walls of forest, far to near, open in the middle */}
      <TreeLine
        from={0}
        to={760}
        y={430}
        seed={12}
        min={90}
        max={150}
        fill="var(--art-hill-2)"
        step={0.3}
      />
      <TreeLine
        from={980}
        to={1440}
        y={430}
        seed={13}
        min={100}
        max={170}
        fill="var(--art-hill-2)"
        step={0.3}
      />
      <TreeLine
        from={0}
        to={720}
        y={480}
        seed={14}
        min={120}
        max={200}
        fill="var(--art-hill-3)"
        step={0.34}
      />
      <TreeLine
        from={1040}
        to={1440}
        y={480}
        seed={15}
        min={130}
        max={220}
        fill="var(--art-hill-3)"
        step={0.34}
      />
      <TreeLine
        from={0}
        to={1440}
        y={514}
        seed={16}
        min={40}
        max={80}
        fill="var(--art-hill-4)"
        step={0.5}
      />

      {/* The clearing and the ring of stones */}
      <path d={CLEARING} fill="var(--art-ground)" {...OUTLINE} />
      <FireLight clip={ground} x={910} y={590} scale={1.15} />
      {STONES.map(([x, y, h, w, lean]) => (
        <Standing key={x} x={x} y={y} h={h} w={w} lean={lean} />
      ))}
      <Trilithon x={1000} y={512} />
      <Tufts
        points={[
          [700, 600],
          [620, 650],
          [1120, 640],
          [1300, 620],
          [1200, 680],
          [800, 676],
        ]}
      />
      <Placed transform={campTransform("forest")}>{camp}</Placed>
      <Fireflies seed={5} count={26} box={[760, 320, 660, 300]} />

      {/* Big firs framing the right edge */}
      <Pine x={1420} y={700} h={560} outline />
      <path d={FOREST_GRASS} fill="var(--art-ground-dark)" />
    </>
  );
}

function Standing({
  x,
  y,
  h,
  w,
  lean,
}: {
  x: number;
  y: number;
  h: number;
  w: number;
  lean: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${lean})`}>
      <path
        d={`M${-w / 2} 0L${-w * 0.46} ${-h * 0.8}Q${-w * 0.3} ${-h} 0 ${-h}Q${w * 0.36} ${-h} ${w * 0.48} ${-h * 0.78}L${w / 2} 0Z`}
        fill="var(--art-stone)"
        {...OUTLINE}
      />
      <path
        d={`M${w * 0.12} ${-h * 0.96}Q${w * 0.36} ${-h * 0.9} ${w * 0.42} ${-h * 0.74}L${w * 0.44} 0H${w * 0.12}Z`}
        fill="var(--art-stone-shade)"
      />
      <path
        d={`M${-w / 2} 0L${-w * 0.46} ${-h * 0.8}Q${-w * 0.3} ${-h} 0 ${-h}Q${w * 0.36} ${-h} ${w * 0.48} ${-h * 0.78}L${w / 2} 0Z`}
        fill="none"
        {...OUTLINE}
      />
      <path
        d={`M${-w * 0.2} ${-h * 0.62}l${w * 0.12} ${h * 0.08}l${-w * 0.06} ${h * 0.1}`}
        stroke="var(--art-ground-lit-3)"
        strokeWidth={2}
        fill="none"
        opacity={0.8}
      />
    </g>
  );
}

/** Two uprights and a lintel, a glowing rune on the stone. */
function Trilithon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <Standing x={-38} y={0} h={120} w={34} lean={0} />
      <Standing x={38} y={0} h={120} w={34} lean={0} />
      <rect
        x={-66}
        y={-138}
        width={132}
        height={24}
        rx={5}
        fill="var(--art-stone)"
        {...OUTLINE}
      />
      <rect
        x={10}
        y={-134}
        width={52}
        height={16}
        rx={3}
        fill="var(--art-stone-shade)"
      />
      <path
        className="sl-twinkle"
        d={sparklePath(7)}
        transform="translate(-30 -126)"
        fill="var(--art-window)"
      />
    </g>
  );
}

/* ---------- Mountain pass ---------- */

const LEDGE =
  "M560 700C600 640 680 610 780 596C900 580 1000 560 1120 552C1260 542 1360 540 1440 536V700Z";
const PEAKS_GRASS = makeGrass(520, 1440, 700, 3331, { min: 12, max: 40 });

function PeaksBackdrop({ id, camp, castle }: BackdropProps) {
  const ledge = `${id}-ledge`;
  return (
    <>
      <defs>
        <Defs id={id} />
        <clipPath id={ledge}>
          <path d={LEDGE} />
        </clipPath>
      </defs>
      <Moon id={id} x={1260} y={96} r={30} />

      {/* Back range, snow on every peak */}
      <path
        d="M0 330L90 250L160 300L250 170L340 280L420 220L520 310L620 150L700 230L780 190L860 260L960 120L1060 240L1140 180L1240 280L1330 160L1440 260V460H0Z"
        fill="var(--art-hill-0)"
      />
      <g fill="var(--art-steel)" opacity={0.85}>
        <path d="M250 170L278 204L262 198L250 212L236 196L224 204Z" />
        <path d="M620 150L652 190L634 184L620 200L604 186L588 196Z" />
        <path d="M960 120L996 166L976 158L962 176L946 160L926 170Z" />
        <path d="M1330 160L1362 200L1346 194L1332 208L1316 194L1300 202Z" />
        <path d="M1140 180L1160 206L1146 202L1136 212L1124 200Z" />
        <path d="M780 190L798 214L786 210L776 220L764 208Z" />
      </g>
      <Cloud
        variant="wispy"
        transform="translate(980 250) scale(0.9)"
        className="sl-drift sl-drift--slow"
      />
      {/* Front range */}
      <path
        d="M0 400L120 320L220 380L330 300L440 390L540 330L640 400L720 360L760 400H1000L1080 330L1180 380L1300 310L1440 380V520H0Z"
        fill="var(--art-hill-2)"
      />

      {/* The crag, its castle, the bridge and the falls */}
      <path
        d="M760 520L770 380L800 300L840 270L900 268L936 300L950 380L966 520Z"
        fill="var(--art-hill-3)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <path
        d="M900 268L936 300L950 380L966 520H930L924 380L908 300Z"
        fill="var(--art-hill-4)"
      />
      <Placed transform={castleTransform("peaks")} tone="var(--art-hill-3)">
        {castle}
      </Placed>
      <path
        d="M934 294H1050V312H1034A42 26 0 0 0 950 312H934Z"
        fill="var(--art-hill-3)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <path
        d="M944 294V288M960 294V288M976 294V288M992 294V288M1008 294V288M1024 294V288M1040 294V288"
        stroke="var(--art-hill-3)"
        strokeWidth={6}
      />
      <path
        d="M1040 300L1060 290L1080 330L1060 520H1020Z"
        fill="var(--art-hill-3)"
      />
      <path
        d="M944 352C948 420 944 476 938 536H972C966 476 962 420 958 352Z"
        fill="var(--art-river)"
      />
      <path
        className="sl-twinkle"
        d="M948 372C950 410 949 450 946 500M954 392C956 430 955 470 954 520M951 360V384"
        stroke="var(--art-star)"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        opacity={0.75}
      />
      <path
        d="M920 544q12 -16 26 -6q12 -14 26 -2q12 -10 24 4Z"
        fill="var(--art-steel)"
        opacity={0.5}
      />

      {/* A valley of firs below the pass */}
      <TreeLine
        from={0}
        to={1440}
        y={548}
        seed={41}
        min={30}
        max={70}
        fill="var(--art-hill-4)"
        step={0.38}
      />

      {/* The ledge and the camp */}
      <path d={LEDGE} fill="var(--art-ground)" {...OUTLINE} />
      <FireLight clip={ledge} x={970} y={600} />
      <Boulder x={1300} y={560} r={40} />
      <Boulder x={700} y={640} r={30} />
      <Tufts
        points={[
          [820, 620],
          [760, 670],
          [1160, 600],
          [1280, 640],
          [1360, 600],
          [1060, 680],
        ]}
      />
      <Placed transform={campTransform("peaks")}>{camp}</Placed>
      <Pine x={1410} y={700} h={300} outline />
      <Pine x={1372} y={690} h={180} outline />
      <path d={PEAKS_GRASS} fill="var(--art-ground-dark)" />
    </>
  );
}

function Boulder({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M${-r} 0Q${-r} ${-r * 0.9} ${-r * 0.2} ${-r}Q${r * 0.8} ${-r} ${r} 0Z`}
        fill="var(--art-stone)"
        {...OUTLINE}
      />
      <path
        d={`M${r * 0.2} ${-r * 0.9}Q${r * 0.8} ${-r * 0.8} ${r * 0.9} 0H${r * 0.3}Z`}
        fill="var(--art-stone-shade)"
      />
    </g>
  );
}
