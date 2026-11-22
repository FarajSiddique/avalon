import { useSyncExternalStore } from "react";
import { DEFAULT_AVATAR, sanitizeAvatar, type Avatar } from "./avatar";

/** Your look, saved in this browser (the prototype has no account). */
const KEY = "avalon:starlit-avatar:v1";
const listeners = new Set<() => void>();
let cached: { raw: string | null; value: Avatar } | null = null;

function read(): Avatar {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: keep the default.
  }
  if (cached && cached.raw === raw) return cached.value;
  let value = DEFAULT_AVATAR;
  if (raw) {
    try {
      value = sanitizeAvatar(JSON.parse(raw));
    } catch {
      value = DEFAULT_AVATAR;
    }
  }
  cached = { raw, value };
  return value;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setAvatar(next: Partial<Avatar>): void {
  const value = sanitizeAvatar({ ...read(), ...next });
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: the change lasts until the page closes.
    cached = { raw: JSON.stringify(value), value };
  }
  for (const listener of listeners) listener();
}

/** Your saved look. The server render (and first paint) uses the default. */
export function useAvatar(): Avatar {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_AVATAR);
}
