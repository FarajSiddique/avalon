"use client";

import { useId, type ReactNode } from "react";
import { play } from "@/client/sound";
import { IconStar } from "./icons";

/**
 * A full-row switch: the whole row is the button, so the touch target is the
 * width of the panel. State is carried by `aria-checked`, the thumb's
 * position, the star inside it and the word On or Off.
 */
export function Switch({
  checked,
  onToggle,
  label,
  tag,
  description,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  tag?: ReactNode;
  description: string;
}) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-description`}
      onClick={() => {
        play(checked ? "toggle-off" : "toggle-on");
        onToggle();
      }}
      className="sl-switch"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            id={`${id}-label`}
            className="text-ink text-[1.0625rem] font-bold"
          >
            {label}
          </span>
          {tag}
        </span>
        <span
          id={`${id}-description`}
          className="text-ink-muted mt-0.5 block text-base leading-snug"
        >
          {description}
        </span>
      </span>
      <span className="flex flex-none flex-col items-center gap-0.5">
        <span className="sl-switch__track">
          <span className="sl-switch__thumb">
            <IconStar size={13} />
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`text-[0.8125rem] font-extrabold ${checked ? "text-accent" : "text-ink-muted"}`}
        >
          {checked ? "On" : "Off"}
        </span>
      </span>
    </button>
  );
}
