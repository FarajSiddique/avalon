import { useId } from "react";
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

function Castle() {
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

function Tent({ clipId }: { clipId: string }) {
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
export function CampScene({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 1440 700"
      preserveAspectRatio="xMaxYMax slice"
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
      <Castle />
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
      <Tent clipId={`${id}-tent`} />
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
