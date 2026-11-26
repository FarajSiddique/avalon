import { useCallback } from "react";
import type { Avatar } from "@/shared/avatar";
import { IconCheck } from "@/components/ui/icons";
import { AvatarMaker } from "./avatar-maker";

/**
 * The look picker, over the lobby while the camera is close on your
 * figure: a bottom sheet on a phone (at most half the screen, so the figure
 * stays in view), a side panel on a wide screen. Done, Escape and a tap
 * outside all close it; the lobby saves the look when it closes.
 */
export function LookPicker({
  value,
  onChange,
  onClose,
}: {
  value: Avatar;
  onChange: (next: Avatar) => void;
  onClose: () => void;
}) {
  // Focus moves into the picker when it opens, so Escape reaches it.
  const sheet = useCallback((el: HTMLElement | null) => {
    el?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      {/* Tapping outside the picker closes it. The table shows through. */}
      <button
        type="button"
        aria-label="Close your look"
        tabIndex={-1}
        className="fixed inset-0 z-20 cursor-default"
        onClick={onClose}
      />
      <section
        ref={sheet}
        role="dialog"
        aria-label="Your look"
        tabIndex={-1}
        data-picker=""
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        className="sl-panel sl-rise sl-seq fixed inset-x-0 bottom-0 z-30 flex max-h-[50dvh] flex-col rounded-b-none border-b-0 outline-none lg:inset-x-auto lg:top-20 lg:right-6 lg:bottom-6 lg:max-h-none lg:w-[26rem] lg:rounded-b-[var(--corner-lg)] lg:border-b"
      >
        <div className="flex items-center gap-3 px-4 pt-3 lg:px-5 lg:pt-4">
          <h2 className="font-display flex-1 text-xl leading-tight font-medium">
            Your look
          </h2>
          <button
            type="button"
            className="sl-btn sl-btn--primary px-5"
            onClick={onClose}
          >
            <IconCheck size={18} />
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:px-5">
          <AvatarMaker value={value} onChange={onChange} />
        </div>
      </section>
    </>
  );
}
