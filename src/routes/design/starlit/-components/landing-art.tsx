import { useRef } from "react";
import { CampScene } from "./art/camp-scene";
import { useSceneArt } from "./art/scene-context";
import { useStage, useStageSlot } from "./stage/stage-context";
import { Hero3D } from "./three/hero-3d";

/** The landing band's soft top edge, as on the other 3D heroes. */
const FADE = 0.16;

/**
 * The landing's hero: the drawn camp scene, or one of the 3D concepts (with
 * the drawing as its fallback when WebGL is unavailable). The Star Table is
 * the shared stage, so it can fly on to the lobby: this only marks its place.
 */
export function LandingArt({ className }: { className?: string }) {
  const { hero } = useSceneArt();
  const { status } = useStage();
  const place = useRef<HTMLDivElement>(null);
  const onStage = hero === "table" && status !== "failed";
  useStageSlot(
    onStage ? { mode: "hero", reveal: "focus", fade: FADE } : null,
    place,
  );
  const drawn = <CampScene className={className} />;
  if (onStage)
    return <div ref={place} className={className} data-stage-slot="hero" />;
  if (hero === "drawn" || hero === "table") return drawn;
  return <Hero3D concept={hero} className={className} fallback={drawn} />;
}
