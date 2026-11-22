import { useId, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useHoldToReveal } from "@/client/use-hold-to-reveal";
import type { GameView } from "@/shared/views";
import { IconHold } from "../icons";
import { RoleFace } from "./role-face";
import { useCardSound } from "./sky-card";

/**
 * "Your role" on every table step: a small button you press and hold to see
 * your role card over the scene; let go and it closes. The same hold as the
 * role card (`useHoldToReveal`, Space or Enter on a keyboard) and the same
 * words. At rest the page holds nothing secret: the card is drawn only while
 * the button is held, and the button carries no role or alignment.
 */
export function RolePeek({ view }: { view: GameView }) {
  const hold = useHoldToReveal();
  const { revealed } = hold;

  useCardSound(revealed);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  // The card opens over the whole scene, inside the theme (for its tokens)
  // but outside any header or panel that could clip or move it.
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(button.current?.closest<HTMLElement>(".theme-starlit") ?? null);
  }, []);

  return (
    <>
      <button
        ref={button}
        type="button"
        {...hold.holdProps}
        data-role-peek=""
        aria-controls={revealed ? id : undefined}
        aria-label={
          revealed ? undefined : "Your role. Press and hold to see it."
        }
        className="sl-btn sl-btn--ghost min-h-11 shrink-0 gap-1.5 px-3"
      >
        <IconHold size={18} className="text-accent" />
        Your role
      </button>
      {revealed && host
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
              data-role-peek-card=""
            >
              <div
                id={id}
                className="sl-panel sl-rise border-accent-strong bg-well flex max-h-full w-full max-w-[22rem] flex-col items-center overflow-hidden px-4 pt-3.5 pb-4 text-center"
                style={{ boxShadow: "var(--glow-star)" }}
              >
                <RoleFace view={view} compact />
                <span className="text-ink-muted mt-3 block text-base leading-snug">
                  Let go to hide it again.
                </span>
              </div>
            </div>,
            host,
          )
        : null}
    </>
  );
}
