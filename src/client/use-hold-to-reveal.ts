import { useCallback, useRef, useState } from "react";

/**
 * Press and hold to show secret information; let go to hide it again.
 *
 * Players sit next to each other, so anything secret (a role, a quest card)
 * is hidden by default and only visible while a finger is down. It also hides
 * when the tab loses focus or the phone locks. Keyboard users hold Space or
 * Enter. Spread `holdProps` on a <button>.
 */
export interface HoldToReveal {
  revealed: boolean;
  holdProps: {
    /** Callers with their own ref must call this one too. */
    ref: (node: HTMLElement | null) => (() => void) | undefined;
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onPointerLeave: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    onKeyUp: (event: React.KeyboardEvent<HTMLElement>) => void;
    onBlur: () => void;
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
    "aria-pressed": boolean;
    style: React.CSSProperties;
  };
}

const HOLD_KEYS = new Set([" ", "Enter"]);

export interface HoldToRevealOptions {
  /** Runs once each time the secret is shown, from the press itself. */
  onReveal?: () => void;
  /**
   * Runs once each time the shown secret hides again: let go, a cancelled
   * or lost pointer, focus gone, the tab hidden. Not on unmount. Pass a
   * stable function: the hiding listeners re-attach when it changes.
   */
  onHide?: () => void;
}

export function useHoldToReveal({
  onReveal,
  onHide,
}: HoldToRevealOptions = {}): HoldToReveal {
  const [revealed, setRevealed] = useState(false);
  // What the handlers last did. One release can fire several events before
  // React renders (pointer up then leave, blur then window blur), so each
  // transition is decided here, synchronously, and told exactly once.
  const shown = useRef(false);
  const hide = useCallback(() => {
    if (!shown.current) {
      return;
    }

    shown.current = false;
    onHide?.();
    setRevealed(false);
  }, [onHide]);

  const reveal = () => {
    if (shown.current) {
      return;
    }

    shown.current = true;
    onReveal?.();
    setRevealed(true);
  };

  // Hide when the tab loses focus or the phone locks. The listeners live as
  // long as the button: React 19 runs the returned clean-up on unmount.
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node) {
        return;
      }

      const onVisibility = () => {
        if (document.hidden) {
          hide();
        }
      };

      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", hide);

      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("blur", hide);
      };
    },
    [hide],
  );

  return {
    revealed,
    holdProps: {
      ref,
      onPointerDown: (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        reveal();
      },
      onPointerUp: hide,
      onPointerCancel: hide,
      onPointerLeave: hide,
      onKeyDown: (event) => {
        if (HOLD_KEYS.has(event.key)) {
          event.preventDefault();
          reveal();
        }
      },
      onKeyUp: (event) => {
        if (HOLD_KEYS.has(event.key)) {
          hide();
        }
      },
      onBlur: hide,
      // A long press must not open the browser's context menu or select text.
      onContextMenu: (event) => event.preventDefault(),
      "aria-pressed": revealed,
      style: {
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      },
    },
  };
}
