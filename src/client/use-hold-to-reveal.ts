"use client";

import { useCallback, useEffect, useState } from "react";

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

export function useHoldToReveal(): HoldToReveal {
  const [revealed, setRevealed] = useState(false);
  const hide = useCallback(() => setRevealed(false), []);

  useEffect(() => {
    if (!revealed) return;
    const onVisibility = () => {
      if (document.hidden) hide();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", hide);
    };
  }, [revealed, hide]);

  return {
    revealed,
    holdProps: {
      onPointerDown: (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setRevealed(true);
      },
      onPointerUp: hide,
      onPointerCancel: hide,
      onPointerLeave: hide,
      onKeyDown: (event) => {
        if (HOLD_KEYS.has(event.key)) {
          event.preventDefault();
          setRevealed(true);
        }
      },
      onKeyUp: (event) => {
        if (HOLD_KEYS.has(event.key)) hide();
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
