import { Cloud } from "./cloud";
import { makeValleyLights } from "./lights";
import { makeStars } from "./seeded";
import { StarField } from "./star-field";

const STARS = makeStars({ count: 430, seed: 1136, width: 1000, height: 880 });

const LIGHTS = makeValleyLights(
  [
    [150, 168, 6],
    [420, 174, 8],
    [610, 166, 9],
    [790, 172, 10],
    [900, 160, 5],
    [1120, 170, 8],
    [1320, 176, 6],
  ],
  52,
);

/**
 * The backdrop behind every Starlit screen: a fixed star field, one shooting
 * star now and then, and the sleeping valley along the bottom edge. Nothing
 * in it is brighter than a few pixels, so text can sit on it safely; anything
 * that needs a guarantee sits on a panel.
 */
export function NightSky() {
  return (
    <div className="sl-sky" aria-hidden="true">
      <svg
        className="sl-sky__stars"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <StarField stars={STARS} />
      </svg>
      <span className="sl-shooting-star" />
      <svg
        className="sl-sky__horizon"
        viewBox="0 0 1440 240"
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
      >
        <g opacity={0.9}>
          <Cloud
            variant="wispy"
            transform="translate(180 62) scale(1.1)"
            className="sl-drift"
          />
          <Cloud
            variant="wispy"
            transform="translate(596 48) scale(0.95)"
            className="sl-drift sl-drift--slow"
          />
          <Cloud
            variant="wispy"
            transform="translate(1010 70) scale(1.2)"
            className="sl-drift"
          />
        </g>
        <path
          d="M0 150C120 122 260 130 380 140C520 152 620 114 760 120C900 126 1000 148 1140 138C1260 130 1360 142 1440 134V240H0Z"
          fill="var(--art-hill-3)"
        />
        <path
          d="M0 186C160 160 320 172 520 180C700 188 820 160 1000 166C1180 172 1300 188 1440 176V240H0Z"
          fill="var(--art-hill-4)"
        />
        {LIGHTS.map((light, index) => (
          <circle
            key={index}
            cx={light.x}
            cy={light.y}
            r={light.r}
            fill={light.warm ? "var(--art-window)" : "var(--art-star)"}
          />
        ))}
        <path
          d="M0 216C200 198 420 212 640 218C860 224 1060 202 1440 210V240H0Z"
          fill="var(--art-ground)"
        />
        {[96, 132, 318, 520, 548, 930, 1180, 1214, 1368].map((x, index) => (
          <ellipse
            key={x}
            cx={x}
            cy={206 - (index % 3) * 3}
            rx={9 + (index % 2) * 4}
            ry={13 + (index % 3) * 3}
            fill="var(--art-ground-dark)"
          />
        ))}
      </svg>
    </div>
  );
}
