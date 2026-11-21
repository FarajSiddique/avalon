import { useEffect, useRef, type ReactNode } from "react";
import { play, type CueHandle } from "@/client/sound";
import { useHoldToReveal } from "@/client/use-hold-to-reveal";
import { Billow, type Lobe } from "../art/cloud";
import { makeStars, round, seededRandom } from "../art/seeded";
import { StarField } from "../art/star-field";
import { IconHold } from "../icons";

const STARS = makeStars({
  count: 110,
  seed: 4021,
  width: 400,
  height: 560,
  topBias: 1,
  twinkleEvery: 4,
});

/**
 * One bank of cloud, drawn for the left side: three layers that each billow
 * a little less far toward the middle, like stage curtains. The right bank
 * is the same drawing mirrored.
 */
function bank(x: number, radius: number, step: number, seed: number): Lobe[] {
  const random = seededRandom(seed);
  const lobes: Lobe[] = [];
  for (let y = -24, index = 0; y < 640; y += step, index += 1) {
    const small = index % 2 === 1;
    lobes.push([
      round(x + (small ? 16 : -6) + random() * 8),
      round(y + random() * 10),
      round(radius * (small ? 0.78 : 1) + random() * 6),
    ]);
  }
  return lobes;
}

const BACK = bank(150, 58, 78, 3);
const MIDDLE = bank(88, 54, 73, 9);
const FRONT = bank(28, 48, 69, 17);

function CloudBank({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 400 560"
      preserveAspectRatio="xMidYMid slice"
      className={`sl-skycard__bank sl-skycard__bank--${side}`}
      aria-hidden="true"
      focusable="false"
    >
      <g
        transform={
          side === "right" ? "translate(400 -52) scale(-1 1)" : undefined
        }
      >
        <g className="sl-skycard__layer sl-skycard__layer--back">
          <Billow
            lobes={BACK}
            body="var(--art-cloud-deep)"
            rim="var(--art-cloud-edge-dim)"
            rimShift={[3, -3]}
            edgeShift={[4, 3]}
            fillTo={140}
            marks={false}
          />
        </g>
        <g className="sl-skycard__layer sl-skycard__layer--middle">
          <Billow
            lobes={MIDDLE}
            rimShift={[2.5, -3]}
            edge="var(--art-cloud-light)"
            edgeShift={[3, 1]}
            fillTo={80}
            marks={false}
          />
        </g>
        <g className="sl-skycard__layer sl-skycard__layer--front">
          <Billow
            lobes={FRONT}
            body="var(--art-cloud-light)"
            rim="var(--art-cloud-bright)"
            rimShift={[2.5, -3]}
            edge="var(--art-cloud-bright)"
            edgeShift={[3, 1]}
            fillTo={20}
            marks={false}
          />
        </g>
      </g>
    </svg>
  );
}

/**
 * Sound for the card. Opening plays the clouds and the constellation (the
 * same for every role, so a neighbour learns nothing); letting go stops the
 * constellation and plays the clouds closing.
 */
export function useCardSound(open: boolean): void {
  // Start from the first value, so mounting already open makes no sound.
  const wasOpen = useRef(open);
  const stars = useRef<CueHandle | null>(null);
  useEffect(() => {
    if (open === wasOpen.current) return;
    wasOpen.current = open;
    if (open) {
      play("clouds-part");
      stars.current = play("constellation");
    } else {
      stars.current?.stop();
      stars.current = null;
      play("clouds-close");
    }
  }, [open]);
  useEffect(
    () => () => {
      // Hidden or gone: never leave the stars ringing.
      stars.current?.stop();
    },
    [],
  );
}

/**
 * The private card: a patch of sky under cloud. Press and hold and the
 * clouds part; let go and they close again. The secret content is not in
 * the page at all until the card is held.
 *
 * `forceOpen` is for the motion gallery, which plays a hold on its own.
 * `onHold` is told each time a real hold opens the card (not `forceOpen`).
 */
export function SkyCard({
  children,
  forceOpen = false,
  onHold,
}: {
  children: ReactNode;
  forceOpen?: boolean;
  onHold?: () => void;
}) {
  const hold = useHoldToReveal();
  const revealed = hold.revealed || forceOpen;
  useCardSound(revealed);
  const held = hold.revealed;
  useEffect(() => {
    if (held) onHold?.();
  }, [held, onHold]);

  return (
    <button
      type="button"
      {...hold.holdProps}
      aria-pressed={revealed}
      className="sl-skycard"
      aria-label={
        revealed ? undefined : "Your role. Press and hold to part the clouds."
      }
    >
      <svg
        viewBox="0 0 400 560"
        preserveAspectRatio="xMidYMid slice"
        className="sl-skycard__stars"
        aria-hidden="true"
        focusable="false"
      >
        <StarField stars={STARS} />
      </svg>

      {revealed && <span className="sl-skycard__face">{children}</span>}

      <CloudBank side="left" />
      <CloudBank side="right" />

      {!revealed && (
        <span className="sl-skycard__hint">
          <IconHold size={34} className="text-accent" />
          <span className="font-display text-ink text-[1.375rem] leading-tight font-medium">
            Press and hold to part the clouds
          </span>
          <span className="text-ink-muted text-base leading-snug">
            Let go and they close again.
          </span>
        </span>
      )}
    </button>
  );
}
