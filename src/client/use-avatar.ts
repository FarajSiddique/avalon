import { useSyncExternalStore } from "react";
import { createDevStore } from "@/client/dev-store";
import { DEFAULT_AVATAR, sanitizeAvatar, type Avatar } from "@/shared/avatar";

/** Your look, saved in this browser (the prototype has no account). */
const KEY = "avalon:starlit-avatar:v1";

function load(): Avatar {
  try {
    const raw = localStorage.getItem(KEY);

    return raw ? sanitizeAvatar(JSON.parse(raw)) : DEFAULT_AVATAR;
  } catch {
    // Storage blocked or a bad value: keep the default.
    return DEFAULT_AVATAR;
  }
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

export function setAvatar(next: Partial<Avatar>): void {
  const value = sanitizeAvatar({ ...store.getState(), ...next });

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
