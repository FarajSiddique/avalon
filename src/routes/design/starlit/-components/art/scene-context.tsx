import { createContext, useContext } from "react";
import { DEFAULT_SCENE, type SceneOptions } from "./scene-options";

/**
 * The artwork versions to draw. Every drawing of the camp reads this, so one
 * choice changes the landing scene, the seat ring and the motion gallery.
 */
export const SceneArtContext = createContext<SceneOptions>(DEFAULT_SCENE);

export function useSceneArt(): SceneOptions {
  return useContext(SceneArtContext);
}
