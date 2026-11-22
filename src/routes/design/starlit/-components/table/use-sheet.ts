import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
  type RefObject,
} from "react";
import { cssVars } from "@/design/css-vars";

/**
 * The phone's bottom sheet at the table: open (the whole round) or
 * collapsed to a peek (one line and the main action), so the table gets the
 * screen. Dragged by its handle, or toggled by the handle's button.
 */

/** Kept between the table's steps (one module, one page load). */
let remembered = false;

/** A press that moved less than this is a tap on the handle, not a drag. */
const DRAG_SLOP_PX = 6;
/** A flick faster than this (px per ms) goes its way whatever the distance. */
const FLICK_PX_PER_MS = 0.4;

interface Drag {
  id: number;
  startY: number;
  startP: number;
  travel: number;
  p: number;
  lastY: number;
  lastT: number;
  vy: number;
  moved: boolean;
}

export interface SheetHandle {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
}

export interface Sheet {
  collapsed: boolean;
  dragging: boolean;
  /** True when it toggled (not the click that ends a drag). */
  toggle: () => boolean;
  handle: SheetHandle;
  /**
   * For the scope's style prop: `--sheet-p` at rest. A drag sets it on the
   * element directly; React only writes it again when the resting place
   * changes, and the drag has set that same value by then.
   */
  scopeStyle: CSSProperties;
}

/** The element a press landed on, if it is one (not text or the window). */
function isElement(target: EventTarget): target is Element {
  return "closest" in target && typeof target.closest === "function";
}

export function useSheet({
  enabled,
  scope,
  sheet,
  peek,
}: {
  /** False on a wide screen: the rail is always open. */
  enabled: boolean;
  /** Carries `--sheet-p` (0 open, 1 collapsed) for the CSS. */
  scope: RefObject<HTMLElement | null>;
  sheet: RefObject<HTMLElement | null>;
  peek: RefObject<HTMLElement | null>;
}): Sheet {
  const [chosen, setChosen] = useState(() => remembered);
  const [dragging, setDragging] = useState(false);
  const collapsed = enabled && chosen;
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);

  const settle = (next: boolean) => {
    remembered = next;
    setChosen(next);
    scope.current?.style.setProperty("--sheet-p", next && enabled ? "1" : "0");
  };

  /** True when it toggled (not the click that ends a drag). */
  const toggle = (): boolean => {
    // The click that ends a drag is not a toggle: the drag already settled.
    if (dragged.current) {
      dragged.current = false;

      return false;
    }

    settle(!chosen);

    return true;
  };

  const end = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current;

    if (!d || d.id !== e.pointerId) {
      return;
    }

    drag.current = null;

    if (!d.moved) {
      return;
    }

    dragged.current = true;
    // A click may not follow (the pointer left the button): forget it soon.
    window.setTimeout(() => {
      dragged.current = false;
    }, 0);
    setDragging(false);
    const start = d.startP >= 0.5;
    // Held still before letting go: no flick.
    const vy = e.timeStamp - d.lastT > 100 ? 0 : d.vy;
    const next = cancelled
      ? start
      : Math.abs(vy) > FLICK_PX_PER_MS
        ? vy > 0
        : d.p > 0.5;

    settle(next);
  };

  const handle: SheetHandle = {
    onPointerDown: (e) => {
      // The result step skips its timeline on any press; not this one.
      e.stopPropagation();

      if (!enabled || e.button !== 0) {
        return;
      }

      const travel =
        (sheet.current?.offsetHeight ?? 0) - (peek.current?.offsetHeight ?? 0);

      if (travel <= 0) {
        return;
      }

      const startP = collapsed ? 1 : 0;

      drag.current = {
        id: e.pointerId,
        startY: e.clientY,
        startP,
        travel,
        p: startP,
        lastY: e.clientY,
        lastT: e.timeStamp,
        vy: 0,
        moved: false,
      };
      // Hold the pointer from the start: a fast flick leaves the handle
      // before it has moved far enough to count as a drag. A tap still
      // clicks: the button pressed holds it, so the release lands there too.
      const held = isElement(e.target)
        ? (e.target.closest("button") ?? e.currentTarget)
        : e.currentTarget;

      held.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const d = drag.current;

      if (!d || d.id !== e.pointerId) {
        return;
      }

      const dy = e.clientY - d.startY;

      if (!d.moved) {
        if (Math.abs(dy) < DRAG_SLOP_PX) {
          return;
        }

        d.moved = true;
        setDragging(true);
      }

      d.p = Math.min(1, Math.max(0, d.startP + dy / d.travel));
      const dt = e.timeStamp - d.lastT;

      if (dt > 0) {
        d.vy = 0.7 * ((e.clientY - d.lastY) / dt) + 0.3 * d.vy;
        d.lastY = e.clientY;
        d.lastT = e.timeStamp;
      }

      scope.current?.style.setProperty("--sheet-p", d.p.toFixed(4));
    },
    onPointerUp: (e) => end(e, false),
    onPointerCancel: (e) => end(e, true),
  };

  return {
    collapsed,
    dragging,
    toggle,
    handle,
    // The resting place follows the state (a step mounting, a wide screen).
    scopeStyle: cssVars({ "--sheet-p": collapsed ? "1" : "0" }),
  };
}
