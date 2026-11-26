import { useSyncExternalStore } from "react";
import { createDevStore } from "@/client/dev-store";
import { DEFAULT_AVATAR, sanitizeAvatar, type Avatar } from "@/shared/avatar";

/**
 * Your look, saved in this browser (there are no accounts). The prototype
 * and the real lobby share the key, so a look picked in one carries over.
 */
const KEY = "avalon:starlit-avatar:v1";

/** The look saved in this browser, or null when none has been. */
export function loadSavedAvatar(): Avatar | null {
  try {
    const raw = localStorage.getItem(KEY);

    return raw ? sanitizeAvatar(JSON.parse(raw)) : null;
  } catch {
    // Storage blocked or a bad value: as if none was saved.
    return null;
  }
}

function load(): Avatar {
  return loadSavedAvatar() ?? DEFAULT_AVATAR;
}

const store = createDevStore<Avatar>("avatar", () =>
  typeof window === "undefined" ? DEFAULT_AVATAR : load(),
);

/**
 * Another tab changed the look. Listening only while something is
 * subscribed keeps the listener off the server and out of idle pages.
 */
function subscribe(listener: () => void): () => void {
  const unsubscribe = store.subscribe(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      store.setState(load(), true);
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    unsubscribe();
    window.removeEventListener("storage", onStorage);
  };
}

/** Change part of the saved look (the prototype's picker). */
export function setAvatar(next: Partial<Avatar>): void {
  saveAvatar({ ...store.getState(), ...next });
}

/** Save a whole look in this browser, for the next room joined. */
export function saveAvatar(next: Avatar): void {
  const value = sanitizeAvatar(next);

  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: the change lasts until the page closes.
  }

  store.setState(value, true);
}

const serverSnapshot = (): Avatar => DEFAULT_AVATAR;

/** Your saved look. The server render (and first paint) uses the default. */
export function useAvatar(): Avatar {
  return useSyncExternalStore(subscribe, store.getState, serverSnapshot);
}
