import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  isEnabled,
  setEnabled,
  startAmbienceLoop,
  stopAmbienceLoop,
  subscribe,
} from "./engine";

const serverSnapshot = () => false;

/** The sound preference, for a toggle. False on the server and first paint. */
export function useSoundToggle(): {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  toggle: () => void;
} {
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
  useEffect(() => {
    if (!on) {
      return;
    }

    startAmbienceLoop();

    return () => stopAmbienceLoop();
  }, [on]);
}
