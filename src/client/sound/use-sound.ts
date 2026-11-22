import { useCallback, useSyncExternalStore } from "react";
import {
  isEnabled,
  setEnabled,
  startAmbienceLoop,
  stopAmbienceLoop,
  subscribe,
} from "./engine";

const serverSnapshot = () => false;

export interface SoundToggle {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  toggle: () => void;
}

/** The sound preference, for a toggle. False on the server and first paint. */
export function useSoundToggle(): SoundToggle {
  const enabled = useSyncExternalStore(subscribe, isEnabled, serverSnapshot);
  const toggle = useCallback(() => setEnabled(!isEnabled()), []);

  return { enabled, setEnabled, toggle };
}

/**
 * Keep the campfire ambience playing while `on` is true and this component
 * is showing. Stops when hidden (Next keeps hidden pages mounted, but runs
 * effect clean-ups) and when sound is switched off.
 */
export function useAmbience(on: boolean): void {
  // Subscribing holds the loop and unsubscribing lets it go. The loop is
  // reference counted, so StrictMode's extra subscribe is harmless. A new
  // subscribe function when `on` changes makes React swap them.
  useSyncExternalStore(
    on ? holdAmbience : noSubscription,
    ambienceSnapshot,
    ambienceSnapshot,
  );
}

function holdAmbience(): () => void {
  startAmbienceLoop();

  return stopAmbienceLoop;
}

function noSubscription(): () => void {
  return noop;
}

function noop(): void {}

function ambienceSnapshot(): null {
  return null;
}
