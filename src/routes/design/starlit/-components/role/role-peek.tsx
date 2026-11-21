import type { GameView } from "@/shared/views";

/**
 * CONTRACT STUB (the role task builds it out): "Your role", a press-and-hold
 * button on every table step that opens your role card over the scene while
 * held and closes it on release (`useHoldToReveal`). At least 44px.
 */
export function RolePeek({ view }: { view: GameView }) {
  return (
    <button type="button" className="sl-btn" data-role-peek={view.you.role}>
      Your role
    </button>
  );
}
