import type { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { Palette } from "./palette";

export interface Pointer {
  /** -1 (left) to 1 (right), smoothed. */
  x: number;
  /** -1 (bottom) to 1 (top), smoothed. */
  y: number;
}

export interface Frame {
  /** Seconds since the scene started (scaled by the ambient tempo). */
  time: number;
  /** Seconds since the last frame, clamped. */
  dt: number;
  pointer: Pointer;
}

export interface Layout {
  width: number;
  height: number;
  aspect: number;
  /**
   * True when the canvas is a wide backdrop with the title and form on its
   * left: the subject should sit in the right-hand part of the frame.
   */
  wide: boolean;
}

export interface SceneContext {
  renderer: WebGLRenderer;
  palette: Palette;
  /** Fewer particles and cheaper effects on small screens. */
  lite: boolean;
}

export interface ConceptScene {
  scene: Scene;
  camera: PerspectiveCamera;
  update(frame: Frame): void;
  resize(layout: Layout): void;
  dispose(): void;
  /** Bloom tuned per scene. */
  bloom: { strength: number; radius: number; threshold: number };
  /** The moment shown as a still frame when motion is reduced. */
  posterTime: number;
}

export type CreateConcept = (ctx: SceneContext) => ConceptScene;
