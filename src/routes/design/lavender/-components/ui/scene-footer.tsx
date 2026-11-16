import { DuskScene, SCENE_STRIP } from "../pixel/dusk-scene";

/**
 * A band of dusk hills and lavender along the foot of a wide screen. It
 * keeps the camp in view on screens that are mostly panels. Decorative, and
 * left out on phones, where the action bar owns the bottom edge.
 */
export function SceneFooter() {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative hidden h-[calc(var(--px)*48)] shrink-0 overflow-hidden lg:block"
    >
      <DuskScene
        layout={SCENE_STRIP}
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
      />
    </div>
  );
}
