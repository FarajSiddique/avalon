import { useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";

/**
 * The name you typed on the landing, kept for the rest of the visit so the
 * role card and the table can seat you under it (the prototype's game is a
 * fixed seven, and you take Wren's seat). Null: none typed, you are Wren.
 */
const KEY = "avalon:starlit-name:v1";

function load(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const store = createStore<string | null>()(() =>
  typeof window === "undefined" ? null : load(),
);

export function setYourName(name: string | null | undefined): void {
  const value = name?.trim() ? name.trim() : null;

  try {
    if (value) {
      sessionStorage.setItem(KEY, value);
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch {
    // Storage blocked: the name lasts until the page closes.
  }

  store.setState(value, true);
}

const serverSnapshot = (): null => null;

/** Your typed name, or null. The server render (and first paint) uses null. */
export function useYourName(): string | null {
  return useSyncExternalStore(store.subscribe, store.getState, serverSnapshot);
}
