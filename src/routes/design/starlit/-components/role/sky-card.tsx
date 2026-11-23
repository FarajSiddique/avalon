import { useSyncExternalStore, type ReactNode } from "react";
import { noSnapshot, noSubscription } from "@/client/no-subscription";
import { play, type CueHandle } from "@/client/sound";
import { useHoldToReveal } from "@/client/use-hold-to-reveal";
import { Billow, type Lobe } from "@/components/art/cloud";
import { makeStars, round, seededRandom } from "@/components/art/seeded";
import { StarField } from "@/components/art/star-field";
import { IconHold } from "@/components/ui/icons";

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
function bank(
  x: number,
  radius: number,
  step: number,
  seed: number,
): Array<Lobe> {
  const random = seededRandom(seed);
  const lobes: Array<Lobe> = [];

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
 *
 * The clouds are one-shots, played from the hold's own handlers
 * (`onReveal` and `onHide`), so each opening and closing sounds once.
 */
export function openClouds(): void {
  play("clouds-part");
}

export function closeClouds(): void {
  play("clouds-close");
}

/**
 * The constellation rings for as long as the card is open. Holding it is a
 * subscription: it starts after the commit that opens the card and stops
 * when the card closes or goes (unmounting while held stays quiet, with no
 * clouds closing).
 */
export function useCardStars(open: boolean): void {
  useSyncExternalStore(
    open ? holdStars : noSubscription,
    noSnapshot,
    noSnapshot,
  );
}

function holdStars(): () => void {
  const stars: CueHandle = play("constellation");

  return () => stars.stop();
}

/**
 * The private card: a patch of sky under cloud. Press and hold and the
 * clouds part; let go and they close again. The secret content is not in
 * the page at all until the card is held.
 *
 * `onHold` is told each time a hold opens the card.
 */
export function SkyCard({
  children,
  onHold,
}: {
  children: ReactNode;
  onHold?: () => void;
}) {
  // Told from the press itself, each time it opens or closes the card.
  const hold = useHoldToReveal({
    onReveal: () => {
      openClouds();
      onHold?.();
    },
    onHide: closeClouds,
  });
  const revealed = hold.revealed;

  useCardStars(revealed);

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
