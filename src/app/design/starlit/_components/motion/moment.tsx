"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import type { SceneProps } from "./use-beats";

export interface MomentNotes {
  /** What moves. */
  moves: ReactNode;
  /** How long, and the curve. */
  timing: ReactNode;
  /** Which cue plays (or none). */
  sound: ReactNode;
  /** Why it helps the player. */
  why: ReactNode;
}

/**
 * One replayable moment in the gallery: a live scene, a Play button and a
 * short caption. The scene is remounted on every Play, so its CSS entrances
 * run again. Before the first Play, and after a skip, it shows its end state.
 * A long moment can be skipped by tapping the scene or the Skip button.
 */
export function Moment({
  title,
  notes,
  length,
  stageClassName = "min-h-[15rem]",
  children,
}: {
  title: string;
  notes: MomentNotes;
  /** Milliseconds until the scene has settled. */
  length: number;
  stageClassName?: string;
  children: (scene: SceneProps) => ReactNode;
}) {
  const id = useId();
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [doneRun, setDoneRun] = useState(0);
  const playing = run > 0 && doneRun !== run && !skipped;
  const skippable = length > 1200;

  useEffect(() => {
    if (run === 0) return;
    const timer = window.setTimeout(() => setDoneRun(run), length);
    return () => window.clearTimeout(timer);
  }, [run, length]);

  const start = () => {
    setSkipped(false);
    setRun((count) => count + 1);
  };
  const skip = () => setSkipped(true);
  const still = run === 0 || skipped;

  return (
    <article
      className="sl-panel sl-moment gap-3 p-4 lg:p-5"
      aria-labelledby={`${id}-title`}
      data-length={length}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id={`${id}-title`}
          className="font-display text-[1.375rem] leading-tight font-medium"
        >
          {title}
        </h3>
        <button
          type="button"
          className="sl-btn sl-btn--ghost min-h-11 flex-none px-4 text-base"
          onClick={playing && skippable ? skip : start}
          data-moment-button={playing && skippable ? "skip" : "play"}
        >
          {playing && skippable ? "Skip" : run === 0 ? "Play" : "Replay"}
          <span className="sr-only">: {title}</span>
        </button>
      </div>
      <div
        className={`sl-stage ${stageClassName}`}
        data-still={still}
        data-playing={playing}
        data-skippable={skippable}
        onPointerDown={playing && skippable ? skip : undefined}
      >
        <div key={run} className="sl-stage__scene">
          {children({ run, still })}
        </div>
      </div>
      <dl className="sl-notes">
        <dt>Moves</dt>
        <dd>{notes.moves}</dd>
        <dt>Timing</dt>
        <dd>{notes.timing}</dd>
        <dt>Sound</dt>
        <dd>{notes.sound}</dd>
        <dt>Why</dt>
        <dd>{notes.why}</dd>
      </dl>
    </article>
  );
}

/** A cue name, set in code style in a caption. */
export function Cue({ children }: { children: ReactNode }) {
  return <code className="sl-cue">{children}</code>;
}
