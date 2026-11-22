import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { play, type CueHandle, type CueName } from "@/client/sound";
import { designPaths, type TableStep } from "@/design/directions";
import type { TeamDraft } from "@/design/use-team-draft";
import type { PlayerId, QuestCard } from "@/shared/views";
import {
  IconArrowRight,
  IconCrackedMoon,
  IconLock,
  IconStar,
  IconSun,
} from "../icons";
import { SoundLink } from "../sound-link";
import { ms } from "./result-timeline";

const paths = designPaths();

/**
 * Play cues as a step opens, on the audio clock. They stop if the step is
 * left (Next hides the old page, which runs this clean-up) or skipped.
 */
export function useOpeningCues(
  cues: readonly { cue: CueName; at: number }[],
): React.RefObject<CueHandle[]> {
  const handles = useRef<CueHandle[]>([]);
  useEffect(() => {
    handles.current = cues.map(({ cue, at }) =>
      play(cue, { delay: at / 1000 }),
    );
    return () => handles.current.forEach((handle) => handle.stop());
    // The cues are fixed for each step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return handles;
}

export function ContinueLink({
  to,
  children,
  cue = "tap",
  wake = false,
}: {
  to: TableStep;
  children: ReactNode;
  cue?: CueName;
  /** Bloom once as it appears: "you can go on now". */
  wake?: boolean;
}) {
  return (
    <SoundLink
      href={paths.table(to)}
      cue={cue}
      className={`sl-btn sl-btn--primary w-full ${wake ? "sl-wake sl-seq" : ""}`}
    >
      {children}
      <IconArrowRight size={18} />
    </SoundLink>
  );
}

export function Count({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-center text-base font-bold"
    >
      {children}
    </p>
  );
}

/** "Your vote is locked" and "Your card is played": the lock closes as it rises. */
export function LockedNote({
  children,
  at = 0,
}: {
  children: ReactNode;
  at?: number;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="bg-well border-line sl-rise sl-lock sl-seq flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-[1.0625rem] font-bold"
      style={{ "--at": ms(at) } as CSSProperties}
    >
      <IconLock size={20} className="text-accent" />
      {children}
    </p>
  );
}

export const CARD = {
  success: { label: "Success", icon: IconSun, className: "sl-card--success" },
  fail: { label: "Fail", icon: IconCrackedMoon, className: "sl-card--fail" },
} as const satisfies Record<QuestCard, unknown>;

/**
 * Toggle a pick with its sound: each pick is one note higher, and the last
 * one resolves into a chord.
 */
export function pickWithSound(
  draft: TeamDraft,
  teamSize: number,
): (id: PlayerId) => void {
  return (id) => {
    const count = draft.draftIds.length;
    if (draft.isPicked(id)) {
      play("unpick");
    } else if (count < teamSize) {
      play("pick", { index: count });
      if (count + 1 === teamSize) {
        play("team-complete", { delay: 0.2 });
      }
    }
    draft.toggle(id);
  };
}

/**
 * The moment after playing: both cards turn face down together, slide into
 * one, and that one card goes up to the fire. Both cards do the same thing,
 * so the motion does not say which was played. Decorative only.
 */
export function PlayedCards() {
  return (
    <span className="sl-cardfly" aria-hidden="true">
      <span className="sl-cardfly__card sl-cardfly__card--left sl-seq">
        <IconStar size={30} />
      </span>
      <span className="sl-cardfly__card sl-cardfly__card--right sl-seq">
        <IconStar size={30} />
      </span>
    </span>
  );
}
