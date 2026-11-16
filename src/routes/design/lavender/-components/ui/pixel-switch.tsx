import type { ReactNode } from "react";

/**
 * A whole-row switch. The row is the button, so the touch target is the
 * full width. State is shown by the knob's position and the words On / Off.
 */
export function PixelSwitch({
  checked,
  onChange,
  label,
  description,
  badge,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  /** For example the role's alignment. */
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="border-line flex min-h-16 w-full cursor-pointer items-center gap-4 border-b-[length:var(--px)] px-4 py-3 text-left"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[24px] leading-none">{label}</span>
          {badge}
        </span>
        <span className="lv-small text-ink-muted">{description}</span>
      </span>
      <span className="flex shrink-0 flex-col items-center gap-2">
        <span className="lv-frame lv-switch" aria-hidden />
        <span
          aria-hidden
          className={`lv-label ${checked ? "text-accent-strong" : "text-ink-muted"}`}
        >
          {checked ? "On" : "Off"}
        </span>
      </span>
    </button>
  );
}
