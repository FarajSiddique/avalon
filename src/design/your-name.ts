import { useSyncExternalStore } from "react";

/**
 * The name you typed on the landing, kept for the rest of the visit so the
 * role card and the table can seat you under it (the prototype's game is a
 * fixed seven, and you take Wren's seat). Null: none typed, you are Wren.
 */
const KEY = "avalon:starlit-name:v1";
const listeners = new Set<() => void>();
let memory: string | null = null;

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function setYourName(name: string | null | undefined): void {
  const value = name?.trim() ? name.trim() : null;

  memory = value;

  try {
    if (value) {
      sessionStorage.setItem(KEY, value);
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch {
    // Storage blocked: the name lasts until the page closes.
  }

  for (const listener of listeners) {
    listener();
  }
}

/** Your typed name, or null. The server render uses null. */
export function useYourName(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
