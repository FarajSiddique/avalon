import { CampScene } from "./art/camp-scene";
import { useSceneArt } from "./art/scene-context";
import { Hero3D } from "./three/hero-3d";

/**
 * The landing's hero: the drawn camp scene, or one of the 3D concepts (with
 * the drawing as its fallback when WebGL is unavailable).
 */
export function LandingArt({ className }: { className?: string }) {
  const { hero } = useSceneArt();
  const drawn = <CampScene className={className} />;
  if (hero === "drawn") return drawn;
  return <Hero3D concept={hero} className={className} fallback={drawn} />;
}
