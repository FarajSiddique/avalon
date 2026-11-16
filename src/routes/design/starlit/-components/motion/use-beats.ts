import { useEffect, useState } from "react";
import { play, type CueName } from "@/client/sound";
import { useReducedMotion } from "./use-reduced-motion";

/** One step of a scene: at `at` ms, the scene moves on and a cue may play. */
export interface Beat {
  at: number;
  cue?: CueName;
  index?: number;
}

export interface SceneProps {
  /** 0 until Play is pressed; each Play is a new run. */
  run: number;
  /** At rest (never played, or skipped): show the end state. */
  still: boolean;
}

/**
 * Drives a scene: returns how many beats have happened so far. Cues are
 * scheduled on the audio clock when the run starts and cancelled if the run
 * is skipped or the page is hidden. With reduced motion the scene goes
 * straight to its end (the sound still plays).
 */
export function useBeats(
  { run, still }: SceneProps,
  beats: readonly Beat[],
): number {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState({ run: 0, count: 0 });

  useEffect(() => {
    if (run === 0 || still) return;
    const handles = beats.flatMap((beat) =>
      beat.cue
        ? [play(beat.cue, { delay: beat.at / 1000, index: beat.index })]
        : [],
    );
    const timers = beats.map((beat, index) =>
      window.setTimeout(
        () => setProgress({ run, count: index + 1 }),
        Math.max(0, beat.at),
      ),
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      handles.forEach((handle) => handle.stop());
    };
    // A scene's beats are fixed; only a new run or a skip restarts them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, still]);

  if (run === 0 || still || reduced) return beats.length;
  return progress.run === run ? progress.count : 0;
}
