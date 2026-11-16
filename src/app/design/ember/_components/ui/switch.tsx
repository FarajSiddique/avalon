"use client";

import type { ReactNode } from "react";

/**
 * A labelled on/off setting. The whole row is the button, so the touch
 * target is the full width of the panel.
 */
export function SwitchRow({
  checked,
  onToggle,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  description: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors duration-200 hover:bg-(--surface-raised)/60"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="ember-carved text-ink block text-[0.9375rem]">
          {label}
        </span>
        <span className="text-ink-muted block text-[1.0625rem] leading-snug">
          {description}
        </span>
      </span>
      <span
        className="ember-label text-ink-muted w-7 text-right"
        aria-hidden="true"
      >
        {checked ? "On" : "Off"}
      </span>
      <span className="ember-switch" aria-hidden="true" />
    </button>
  );
}
