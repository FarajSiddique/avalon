"use client";

import { useSoundToggle } from "@/client/sound";
import { IconSound, IconSoundOff } from "./icons";

/**
 * The sound switch on every Starlit screen. Sound is off until the player
 * turns it on, and the choice is remembered on this device.
 *
 * It sits just under the prototype bar on a phone (beside the eyebrow, where
 * every screen leaves room) and inside the empty right end of the bar on
 * wider screens. It comes after the page in the DOM so the page's own
 * controls come first, by keyboard and in tests.
 */
export function SoundToggle() {
  const { enabled, toggle } = useSoundToggle();
  const Icon = enabled ? IconSound : IconSoundOff;
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={toggle}
      className="sl-soundtoggle"
    >
      <Icon size={17} />
      <span>Sound</span>
      <span className="sl-soundtoggle__state" aria-hidden="true">
        {enabled ? "On" : "Off"}
      </span>
    </button>
  );
}
