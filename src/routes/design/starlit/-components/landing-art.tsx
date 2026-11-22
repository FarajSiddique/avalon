import { useRef } from "react";
import { useStage, useStageSlot } from "./stage/stage-context";

/** The landing band's soft top edge. */
const FADE = 0.16;

/**
 * The landing's hero: the Star Table on the shared stage, so it can fly on
 * to the lobby. This only marks its place. Without WebGL the band stays
 * empty and the form still works.
 */
export function LandingArt({ className }: { className?: string }) {
  const { status } = useStage();
  const place = useRef<HTMLDivElement>(null);
  const onStage = status !== "failed";

  useStageSlot(
    onStage ? { mode: "hero", reveal: "focus", fade: FADE } : null,
    place,
  );

  return (
    <div
      ref={place}
      className={className}
      data-stage-slot={onStage ? "hero" : undefined}
    />
  );
}
