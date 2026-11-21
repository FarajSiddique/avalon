import { useId } from "react";
import { SceneArtContext, useSceneArt } from "./scene-context";
import type { CastleStyle, SceneOptions, TentStyle } from "./scene-options";
import { Fire, GlowGradient } from "./campfire";
import { Cloud } from "./cloud";
import { makeGrass, makeValleyLights } from "./lights";
import { sparklePath } from "./seeded";

const GROUND =
  "M0 640C180 610 400 600 600 566C760 540 880 512 1040 488C1180 468 1320 470 1440 456V700H0Z";

const VALLEY_LIGHTS = makeValleyLights(
  [
    [150, 474, 8],
    [300, 496, 7],
    [470, 466, 6],
    [610, 478, 9],
    [760, 462, 8],
    [880, 474, 6],
    [90, 512, 5],
    [690, 500, 5],
  ],
  907,
);

const FRONT_GRASS = makeGrass(0, 1440, 700, 311, { min: 18, max: 58 });
const TUFTS = [
  [120, 652],
  [250, 634],
  [372, 660],
  [486, 618],
  [566, 648],
  [1122, 548],
  [1190, 606],
  [1276, 536],
  [1304, 620],
  [1090, 640],
  [1168, 668],
  [1016, 664],
] as const;

const CANOPY = [
  [1240, 236, 72],
  [1300, 160, 90],
  [1390, 110, 104],
  [1440, 240, 96],
  [1330, 280, 66],
  [1420, 330, 60],
  [1262, 326, 50],
] as const;

const OUTLINE = {
  stroke: "var(--art-outline)",
  strokeWidth: 2.5,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

function Castle({ style }: { style: CastleStyle }) {
  switch (style) {
    case "spires":
      return <SpiresCastle />;
    case "ruin":
      return <RuinCastle />;
    case "fortress":
      return <FortressCastle />;
    case "none":
      return null;
    default:
      return <KeepCastle />;
  }
}

/** Three tall pointed towers, a pennant on the highest. */
function SpiresCastle() {
  return (
    <g transform="translate(742 353)" fill="var(--art-hill-2)">
      <path d="M-14 0V-30H-8V-50L-2 -78L4 -50V-30H14V-22H18V-26H22V-22H26V-26H30V-22H33V-42H32L40 -96L48 -42H47V-22H54V-44L60 -66L66 -44V-28H72V0Z" />
      <path d="M40 -96V-108L53 -103L40 -99Z" fill="var(--art-cloud-edge-dim)" />
      <g fill="var(--art-window)">
        <rect x={38.5} y={-62} width={3} height={5} />
        <rect x={-3.5} y={-42} width={3} height={5} />
        <rect x={58.5} y={-38} width={3} height={5} />
        <rect x={20} y={-12} width={3} height={5} />
      </g>
    </g>
  );
}

/** Broken walls and one lit arch. */
function RuinCastle() {
  return (
    <g transform="translate(742 353)" fill="var(--art-hill-2)">
      <path d="M-12 0V-34L-8 -38L-6 -30L-2 -42L2 -36V-22H10V-16L14 -20L18 -14V-22H24V-50L28 -54L30 -46L34 -58L38 -52V-26H44L48 -30L52 -24L58 -28V0Z" />
      <path
        d="M29.5 -34V-40A2.5 2.5 0 0 1 34.5 -40V-34Z"
        fill="var(--art-window)"
      />
      <rect
        x={-5}
        y={-24}
        width={3}
        height={4}
        fill="var(--art-window)"
        opacity={0.5}
      />
    </g>
  );
}

/** Curtain walls, two round towers, a keep and a lit gate. */
function FortressCastle() {
  return (
    <g transform="translate(742 353)" fill="var(--art-hill-2)">
      <path d="M-40 0V-30H-36V-34H-32V-30H-28V-48L-22 -58L-16 -48V-24H-10V-28H-6V-24H-2V-28H2V-24H6V-28H10V-24H14V-56H18V-60H22V-56H26V-60H30V-56H34V-60H38V-56H42V-24H46V-28H50V-24H54V-28H58V-24H62V-28H66V-24H72V-48L78 -58L84 -48V-30H88V-34H92V-30H96V0Z" />
      <path d="M28 -60V-74L41 -69L28 -65Z" fill="var(--art-cloud-edge-dim)" />
      <path d="M24 0V-9A4 4 0 0 1 32 -9V0Z" fill="var(--art-window)" />
      <g fill="var(--art-window)">
        <rect x={-23.5} y={-42} width={3} height={5} />
        <rect x={20} y={-46} width={3} height={5} />
        <rect x={33} y={-38} width={3} height={5} />
        <rect x={76.5} y={-40} width={3} height={5} />
        <rect x={-8} y={-16} width={3} height={4} />
        <rect x={58} y={-16} width={3} height={4} />
      </g>
    </g>
  );
}

/** The original: a modest keep with one flag. */
function KeepCastle() {
  return (
    <g transform="translate(742 353)" fill="var(--art-hill-2)">
      <path d="M-10 0V-26L-4 -40L2 -26V-18H22V-44L27 -60L32 -44V-20H36V-24H41V-20H46V-24H51V-20H56V-30L61 -42L66 -30V0Z" />
      <path d="M27 -60V-70L38 -66L27 -62Z" fill="var(--art-cloud-edge-dim)" />
      <g fill="var(--art-window)">
        <rect x={-6} y={-20} width={3} height={5} />
        <rect x={25.5} y={-36} width={3} height={5} />
        <rect x={10} y={-10} width={3} height={5} />
        <rect x={59.5} y={-22} width={3} height={5} />
      </g>
    </g>
  );
}

function Moon({ glowId }: { glowId: string }) {
  return (
    <g transform="translate(905 112)">
      <circle r={88} fill={`url(#${glowId})`} />
      <path
        d="M0 -34A34 34 0 1 0 0 34A23 34 0 1 1 0 -34Z"
        transform="rotate(-28)"
        fill="var(--art-moon)"
      />
    </g>
  );
}

function Tent({ style, clipId }: { style: TentStyle; clipId: string }) {
  switch (style) {
    case "bell":
      return <BellTent />;
    case "ridge":
      return <RidgeTent />;
    case "none":
      return null;
    default:
      return <PavilionTent clipId={clipId} />;
  }
}

const PENNANT =
  "M1101 297C1119 293 1131 303 1151 297L1141 306L1151 315C1131 319 1119 309 1101 313Z";

/** A pole topped with a gold ball and a waving pennant, at x, from y up. */
function Pole({ x, top, base }: { x: number; top: number; base: number }) {
  return (
    <g>
      <path d={`M${x} ${base}V${top}`} {...OUTLINE} strokeWidth={3.5} />
      <path
        className="sl-pennant"
        d={PENNANT}
        transform={`translate(${x - 1100} ${top + 3 - 294})`}
        fill="var(--art-cloud-edge)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <circle
        cx={x}
        cy={top - 2}
        r={3.5}
        fill="var(--art-gold)"
        {...OUTLINE}
        strokeWidth={1.5}
      />
    </g>
  );
}

/** A round bell tent: one centre pole, a low bell of canvas, guy ropes. */
function BellTent() {
  return (
    <g>
      <g {...OUTLINE} strokeWidth={1.5} fill="none">
        <path d="M1034 462L996 508M1166 462L1204 506" />
        <path d="M992 508h9M1199 506h9" strokeWidth={3} />
      </g>
      <Pole x={1100} top={334} base={376} />
      <path
        d="M1018 504L1024 466C1040 440 1078 404 1100 372C1122 404 1160 440 1176 466L1182 504Q1100 514 1018 504Z"
        fill="var(--art-tent)"
        {...OUTLINE}
      />
      <path
        d="M1023 474Q1100 484 1177 474L1178 486Q1100 496 1022 486Z"
        fill="var(--art-tent-stripe)"
      />
      <path
        d="M1100 372C1112 392 1126 410 1144 428"
        fill="none"
        stroke="var(--art-tent-shade)"
        strokeWidth={2}
      />
      <path
        d="M1100 372C1088 392 1074 410 1056 428"
        fill="none"
        stroke="var(--art-tent-shade)"
        strokeWidth={2}
      />
      {/* The side away from the fire falls into shade. */}
      <path
        d="M1100 372C1122 404 1160 440 1176 466L1182 504Q1144 510 1120 509Q1114 430 1100 372Z"
        fill="var(--art-sky-mid)"
        opacity={0.34}
      />
      <path
        d="M1018 504L1024 466C1030 458 1038 450 1046 442L1042 508Q1030 506 1018 504Z"
        fill="var(--art-fire-glow)"
        opacity={0.28}
      />
      <path
        d="M1024 466Q1100 476 1176 466"
        fill="none"
        {...OUTLINE}
        strokeWidth={2}
      />
      {/* Doorway, one flap tied back */}
      <path
        d="M1084 508L1100 430L1116 508Z"
        fill="var(--art-tent-dark)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <path
        d="M1091 508L1100 458L1109 508Z"
        fill="var(--art-fire-outer)"
        opacity={0.55}
      />
      <path
        d="M1100 430L1084 508L1070 506Q1086 470 1100 430Z"
        fill="var(--art-tent-shade)"
        {...OUTLINE}
        strokeWidth={2}
      />
    </g>
  );
}

/** A knight's campaign tent: an A-frame gable with the ridge running back. */
function RidgeTent() {
  return (
    <g>
      <g {...OUTLINE} strokeWidth={1.5} fill="none">
        <path d="M1046 490L1006 510M1206 476L1230 500" />
        <path d="M1002 510h9M1226 500h9" strokeWidth={3} />
      </g>
      <Pole x={1176} top={352} base={374} />
      {/* The long side, running back from the gable */}
      <path
        d="M1092 382L1176 372L1214 488L1150 500Z"
        fill="var(--art-tent-shade)"
        {...OUTLINE}
      />
      <path
        d="M1112 380L1124 378.6L1180 496L1168 497.5Z"
        fill="var(--art-tent-stripe)"
      />
      <path
        d="M1146 376L1158 374.6L1204 490L1192 492Z"
        fill="var(--art-tent-stripe)"
      />
      <path
        d="M1092 382L1176 372L1214 488L1150 500Z"
        fill="var(--art-sky-mid)"
        opacity={0.3}
      />
      <Pole x={1092} top={340} base={384} />
      {/* The gable, facing the fire */}
      <path
        d="M1034 504L1092 382L1150 500Q1092 510 1034 504Z"
        fill="var(--art-tent)"
        {...OUTLINE}
      />
      <path
        d="M1034 504L1060 448L1064 506Z"
        fill="var(--art-fire-glow)"
        opacity={0.28}
      />
      {/* Doorway, both flaps tied back */}
      <path
        d="M1076 506L1092 440L1108 504Z"
        fill="var(--art-tent-dark)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <path
        d="M1084 506L1092 466L1100 505Z"
        fill="var(--art-fire-outer)"
        opacity={0.55}
      />
      <path
        d="M1092 440L1076 506L1066 505Q1080 470 1092 440Z"
        fill="var(--art-tent-shade)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <path
        d="M1092 440L1108 504L1118 503Q1104 470 1092 440Z"
        fill="var(--art-tent-shade)"
        {...OUTLINE}
        strokeWidth={2}
      />
      {/* Valance along the gable's eaves */}
      <path
        d="M1092 382L1034 504"
        fill="none"
        stroke="var(--art-tent-stripe)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M1092 382L1150 500"
        fill="none"
        stroke="var(--art-tent-stripe)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M1034 504L1092 382L1150 500"
        fill="none"
        {...OUTLINE}
        strokeWidth={2}
      />
    </g>
  );
}

/** The original: a round tournament pavilion with a scalloped valance. */
function PavilionTent({ clipId }: { clipId: string }) {
  return (
    <g>
      <clipPath id={clipId}>
        <path d="M1026 426H1174L1180 500Q1100 510 1020 500Z" />
        <path d="M1100 338C1094 380 1056 410 1012 428H1188C1144 410 1106 380 1100 338Z" />
      </clipPath>
      {/* Pole and pennant */}
      <path d="M1100 340V294" {...OUTLINE} strokeWidth={3.5} />
      <path
        className="sl-pennant"
        d="M1101 297C1119 293 1131 303 1151 297L1141 306L1151 315C1131 319 1119 309 1101 313Z"
        fill="var(--art-cloud-edge)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <circle
        cx={1100}
        cy={292}
        r={3.5}
        fill="var(--art-gold)"
        {...OUTLINE}
        strokeWidth={1.5}
      />

      {/* Wall */}
      <path
        d="M1026 426H1174L1180 500Q1100 510 1020 500Z"
        fill="var(--art-tent)"
        {...OUTLINE}
      />
      <g clipPath={`url(#${clipId})`}>
        <path d="M1047 426H1068L1066 510H1043Z" fill="var(--art-tent-stripe)" />
        <path d="M1132 426H1153L1157 510H1134Z" fill="var(--art-tent-stripe)" />
        {/* The side away from the fire falls into shade. */}
        <path
          d="M1118 420H1190V512H1124Z"
          fill="var(--art-sky-mid)"
          opacity={0.34}
        />
        <path
          d="M1010 420H1046L1040 512H1010Z"
          fill="var(--art-fire-glow)"
          opacity={0.28}
        />
      </g>
      {/* Doorway with a warm light inside */}
      <path
        d="M1082 504L1100 440L1118 503Z"
        fill="var(--art-tent-dark)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <path
        d="M1090 504L1100 462L1110 503Z"
        fill="var(--art-fire-outer)"
        opacity={0.55}
      />
      <path
        d="M1100 440L1118 503L1129 501Q1114 468 1100 440Z"
        fill="var(--art-tent-shade)"
        {...OUTLINE}
        strokeWidth={2}
      />

      {/* Roof */}
      <path
        d="M1100 338C1094 380 1056 410 1012 428H1188C1144 410 1106 380 1100 338Z"
        fill="var(--art-tent)"
        {...OUTLINE}
      />
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M1100 338C1090 384 1066 412 1038 428H1064C1082 410 1094 384 1100 338Z"
          fill="var(--art-tent-stripe)"
        />
        <path
          d="M1100 338C1110 384 1134 412 1162 428H1136C1118 410 1106 384 1100 338Z"
          fill="var(--art-tent-stripe)"
        />
        <path
          d="M1100 338C1108 384 1118 410 1122 430H1192V338Z"
          fill="var(--art-sky-mid)"
          opacity={0.34}
        />
      </g>
      {/* Scalloped valance */}
      <path
        d="M1012 428a11 10 0 0 0 22 0a11 10 0 0 0 22 0a11 10 0 0 0 22 0a11 10 0 0 0 22 0a11 10 0 0 0 22 0a11 10 0 0 0 22 0a11 10 0 0 0 22 0a11 10 0 0 0 22 0Z"
        fill="var(--art-tent-stripe)"
        {...OUTLINE}
        strokeWidth={2}
      />
    </g>
  );
}

function Banner() {
  return (
    <g>
      <path d="M990 508V372" {...OUTLINE} strokeWidth={3.5} />
      <path d="M972 380H1008" {...OUTLINE} strokeWidth={3.5} />
      <path
        d="M975 382H1005V440L990 428L975 440Z"
        fill="var(--art-banner)"
        {...OUTLINE}
        strokeWidth={2}
      />
      <path
        d={sparklePath(9)}
        transform="translate(990 405)"
        fill="var(--art-gold)"
      />
      <circle
        cx={990}
        cy={370}
        r={3.5}
        fill="var(--art-gold)"
        {...OUTLINE}
        strokeWidth={1.5}
      />
    </g>
  );
}

function Shields() {
  const shield = "M-14 -20Q0 -26 14 -20Q16 4 0 24Q-16 4 -14 -20Z";
  return (
    <g>
      {/* Two spears, crossed, with a shield leaning on each side */}
      <path
        d="M1206 508L1246 418M1250 508L1210 418"
        {...OUTLINE}
        strokeWidth={3}
      />
      <path
        d="M1246 418L1244 404L1253 413ZM1210 418L1212 404L1203 413Z"
        fill="var(--art-steel)"
        {...OUTLINE}
        strokeWidth={1.5}
      />
      <g transform="translate(1208 484) rotate(-12)">
        <path d={shield} fill="var(--good)" {...OUTLINE} strokeWidth={2} />
        <path
          d="M-9 -6L0 4L9 -6"
          fill="none"
          stroke="var(--art-star)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g transform="translate(1248 486) rotate(10)">
        <path
          d={shield}
          fill="var(--art-tent-stripe)"
          {...OUTLINE}
          strokeWidth={2}
        />
        <path
          d={sparklePath(8)}
          transform="translate(0 -3)"
          fill="var(--art-star)"
        />
      </g>
    </g>
  );
}

function SwordInStone() {
  return (
    <g transform="translate(744 586)">
      <g transform="rotate(7 0 -10)">
        <rect
          x={-3}
          y={-66}
          width={6}
          height={56}
          rx={1}
          fill="var(--art-steel)"
          {...OUTLINE}
          strokeWidth={1.5}
        />
        <rect
          x={-13}
          y={-71}
          width={26}
          height={5.5}
          rx={2.5}
          fill="var(--art-gold)"
          {...OUTLINE}
          strokeWidth={1.5}
        />
        <rect
          x={-2.5}
          y={-85}
          width={5}
          height={14}
          fill="var(--art-tent-dark)"
          {...OUTLINE}
          strokeWidth={1.5}
        />
        <circle
          cx={0}
          cy={-88}
          r={4}
          fill="var(--art-gold)"
          {...OUTLINE}
          strokeWidth={1.5}
        />
      </g>
      <path
        d="M-36 14L-27 -8L-6 -19L18 -15L35 1L31 14Z"
        fill="var(--art-stone)"
        {...OUTLINE}
      />
      <path d="M18 -15L35 1L31 14H10L6 -4Z" fill="var(--art-stone-shade)" />
      <path
        d="M-36 14L-27 -8L-6 -19L18 -15L35 1L31 14Z"
        fill="none"
        {...OUTLINE}
      />
      <path
        className="sl-twinkle"
        d={sparklePath(8)}
        transform="translate(15 -84)"
        fill="var(--art-star)"
      />
    </g>
  );
}

function Tree() {
  return (
    <g>
      <path
        d="M1352 700C1356 620 1340 540 1352 470C1358 430 1376 400 1372 360L1420 350C1412 420 1424 470 1420 540C1416 610 1432 660 1440 700Z"
        fill="var(--art-trunk)"
        {...OUTLINE}
      />
      <path
        d="M1356 470C1330 440 1306 420 1284 384L1296 378C1314 408 1338 424 1362 444Z"
        fill="var(--art-trunk)"
        {...OUTLINE}
      />
      <path
        d="M1376 520C1380 570 1372 620 1380 690"
        fill="none"
        stroke="var(--art-outline)"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.6}
      />
      {/* Canopy: outlined copies first, plain ones on top, so only the outer edge is inked. */}
      {CANOPY.map(([cx, cy, r]) => (
        <circle
          key={`o${cx}`}
          cx={cx}
          cy={cy}
          r={r}
          fill="var(--art-tree)"
          stroke="var(--art-outline)"
          strokeWidth={5}
        />
      ))}
      {CANOPY.map(([cx, cy, r]) => (
        <circle key={`f${cx}`} cx={cx} cy={cy} r={r} fill="var(--art-tree)" />
      ))}
      {CANOPY.map(([cx, cy, r]) => (
        <path
          key={`l${cx}`}
          d={`M${cx - r * 0.78} ${cy - r * 0.28}A${r * 0.86} ${r * 0.86} 0 0 1 ${cx - r * 0.08} ${cy - r * 0.84}`}
          fill="none"
          stroke="var(--art-tree-light)"
          strokeWidth={5}
          strokeLinecap="round"
        />
      ))}
      {CANOPY.slice(0, 5).map(([cx, cy, r]) => (
        <path
          key={`m${cx}`}
          d={`M${cx - r * 0.3} ${cy + r * 0.1}A${r * 0.5} ${r * 0.5} 0 0 1 ${cx + r * 0.2} ${cy - r * 0.3}`}
          fill="none"
          stroke="var(--art-tree-light)"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.7}
        />
      ))}
    </g>
  );
}

function LogSeat({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={17}
        rx={8.5}
        fill="var(--art-log)"
        {...OUTLINE}
      />
      <ellipse
        cx={x + width - 7}
        cy={y + 8.5}
        rx={6}
        ry={8}
        fill="var(--art-log-end)"
        {...OUTLINE}
        strokeWidth={2}
      />
    </g>
  );
}

/**
 * The hero illustration: a camp on a hill above a sleeping valley. The sky is
 * left open so the page's star field shows through. Everything that matters
 * sits in the right-hand 60% of the drawing, which is what a phone sees.
 */
export function CampScene({
  className,
  scene: override,
  viewBox = "0 0 1440 700",
  preserveAspectRatio = "xMaxYMax slice",
}: {
  className?: string;
  /** Draw these artwork versions instead of the chosen ones. */
  scene?: Partial<SceneOptions>;
  /** Crop to part of the drawing (the artwork contact sheet uses this). */
  viewBox?: string;
  preserveAspectRatio?: string;
}) {
  const id = useId();
  const chosen = useSceneArt();
  const scene = override ? { ...chosen, ...override } : chosen;
  return (
    <SceneArtContext.Provider value={scene}>
      <CampSceneSvg
        id={id}
        scene={scene}
        className={className}
        viewBox={viewBox}
        preserveAspectRatio={preserveAspectRatio}
      />
    </SceneArtContext.Provider>
  );
}

function CampSceneSvg({
  id,
  scene,
  className,
  viewBox,
  preserveAspectRatio,
}: {
  id: string;
  scene: SceneOptions;
  className: string | undefined;
  viewBox: string;
  preserveAspectRatio: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <GlowGradient id={`${id}-fire`} color="var(--art-fire-glow)" />
        <GlowGradient id={`${id}-moon`} color="var(--art-moon)" />
        <clipPath id={`${id}-ground`}>
          <path d={GROUND} />
        </clipPath>
      </defs>

      <Moon glowId={`${id}-moon`} />
      <Cloud
        variant="puffy"
        transform="translate(770 178) scale(0.9)"
        className="sl-drift"
      />
      <Cloud
        variant="wispy"
        transform="translate(1010 122) scale(0.8)"
        className="sl-drift sl-drift--slow"
      />
      <Cloud
        variant="puffy"
        transform="translate(1040 232) scale(0.5)"
        className="sl-drift sl-drift--slow"
      />

      {/* Hills, far to near */}
      <path
        d="M0 336C80 328 140 296 200 292C260 288 300 314 380 310C460 306 520 268 600 264C680 260 720 304 800 306C880 308 960 276 1040 274C1120 272 1180 304 1260 300C1340 296 1400 304 1440 300V700H0Z"
        fill="var(--art-hill-0)"
      />
      <path
        d="M0 380C60 372 110 344 170 336C230 328 270 354 330 358C400 362 440 322 510 312C570 304 610 340 690 352C760 362 800 334 860 324C930 312 990 340 1060 348C1140 358 1200 326 1270 322C1340 318 1390 338 1440 342V700H0Z"
        fill="var(--art-hill-1)"
      />
      <Castle style={scene.castle} />
      <path
        d="M0 408C120 388 240 400 360 396C500 392 600 372 740 384C880 396 960 380 1100 376C1240 372 1340 390 1440 384V700H0Z"
        fill="var(--art-hill-2)"
      />
      <path
        d="M0 446C200 430 380 440 560 434C760 428 900 440 1100 432C1260 426 1360 436 1440 432V700H0Z"
        fill="var(--art-hill-3)"
      />
      <path
        d="M318 440C420 450 392 470 500 482C610 494 590 518 720 538L688 542C580 524 600 502 480 490C380 480 404 456 318 440Z"
        fill="var(--art-river)"
        opacity={0.75}
      />
      {VALLEY_LIGHTS.map((light, index) => (
        <circle
          key={index}
          cx={light.x}
          cy={light.y}
          r={light.r + 0.4}
          fill={light.warm ? "var(--art-window)" : "var(--art-star)"}
        />
      ))}
      <path
        d="M0 540C140 500 300 508 440 530C560 548 660 560 760 566V700H0Z"
        fill="var(--art-hill-4)"
      />
      {[70, 118, 150, 290, 330, 470].map((x, index) => (
        <ellipse
          key={x}
          cx={x}
          cy={516 + (index % 3) * 6}
          rx={13 + (index % 2) * 5}
          ry={22 + (index % 3) * 5}
          fill="var(--art-ground-dark)"
        />
      ))}

      {/* The hill the camp sits on */}
      <path d={GROUND} fill="var(--art-ground)" {...OUTLINE} />
      <g clipPath={`url(#${id}-ground)`}>
        <ellipse
          cx={850}
          cy={560}
          rx={250}
          ry={50}
          fill="var(--art-ground-lit-1)"
        />
        <ellipse
          cx={850}
          cy={558}
          rx={160}
          ry={31}
          fill="var(--art-ground-lit-2)"
        />
        <ellipse
          cx={850}
          cy={556}
          rx={84}
          ry={16}
          fill="var(--art-ground-lit-3)"
        />
      </g>
      {/* Tufts on the dark part of the slope */}
      <g
        fill="none"
        stroke="var(--art-ground-lit-1)"
        strokeWidth={2.5}
        strokeLinecap="round"
      >
        {TUFTS.map(([x, y]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x - 3} ${y}q-1 -8 -7 -12M${x} ${y}q-1 -9 2 -17M${x + 3} ${y}q2 -7 8 -10M${x + 7} ${y}q3 -4 9 -5`}
          />
        ))}
      </g>

      <Banner />
      <Tent style={scene.tent} clipId={`${id}-tent`} />
      <Shields />

      <LogSeat x={752} y={552} width={62} />
      <LogSeat x={902} y={540} width={64} />
      <circle
        className="sl-fire-glow"
        cx={850}
        cy={520}
        r={170}
        fill={`url(#${id}-fire)`}
      />
      <g transform="translate(850 548) scale(1.15)">
        <Fire />
      </g>
      <SwordInStone />

      <Tree />

      {/* Wildflowers and the grass nearest the viewer */}
      {[
        [80, 660],
        [130, 640],
        [220, 668],
        [300, 646],
        [420, 662],
        [520, 640],
        [610, 664],
        [1010, 640],
        [1120, 664],
        [1250, 650],
      ].map(([x, y], index) => (
        <circle
          key={x}
          cx={x}
          cy={y}
          r={3}
          fill={index % 3 === 0 ? "var(--art-cloud-edge)" : "var(--art-star)"}
          opacity={0.85}
        />
      ))}
      <path d={FRONT_GRASS} fill="var(--art-ground-dark)" />
    </svg>
  );
}
