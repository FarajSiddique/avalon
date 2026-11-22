import { devtools } from "zustand/middleware";
import { createStore, type StateCreator, type StoreApi } from "zustand/vanilla";

/**
 * Every Zustand store in the app is made here, so each one can be inspected.
 *
 * - With the Redux DevTools extension installed, each store shows up there
 *   under its name (development builds only; the middleware does nothing
 *   without the extension).
 * - In development builds each store is also listed on
 *   `window.__AVALON_STORES__`, with its recent states, so a Playwright or
 *   browser-automation check can read state without the extension:
 *
 *   ```ts
 *   await page.evaluate(() => window.__AVALON_STORES__?.["room:ABCD"]?.getState());
 *   ```
 *
 * Production builds compile the registry away and leave devtools off.
 */
/** Anything a store holds. Every store state in the app is plain data. */
export type DevState = object | string | number | boolean | null;

export interface DevStoreEntry {
  getState: () => DevState;
  /** Oldest first, at most HISTORY_LIMIT entries. */
  history: Array<{ at: number; state: DevState }>;
}

declare global {
  interface Window {
    __AVALON_STORES__?: Record<string, DevStoreEntry>;
  }
}

const HISTORY_LIMIT = 100;

export function createDevStore<T extends DevState>(
  name: string,
  initializer: StateCreator<T, [["zustand/devtools", never]]>,
): StoreApi<T> {
  const store = createStore<T>()(
    devtools(initializer, { name, enabled: import.meta.env.DEV }),
  );

  if (import.meta.env.DEV && typeof window !== "undefined") {
    register(name, store);
  }

  return store;
}

/**
 * Lists the store once something first subscribes to it or writes to it.
 * React may build a component's state twice in development and throw one
 * copy away (a `useState` initializer runs twice); that copy is never used,
 * so the registry always shows the store the page is really using.
 */
function register<T extends DevState>(name: string, store: StoreApi<T>): void {
  const entry: DevStoreEntry = {
    getState: store.getState,
    history: [{ at: Date.now(), state: store.getState() }],
  };
  const { subscribe } = store;
  let listed = false;

  const list = () => {
    if (listed) {
      return;
    }

    listed = true;
    // A store made again under the same name (a remounted screen, a second
    // room) replaces the old entry.
    window.__AVALON_STORES__ ??= {};
    window.__AVALON_STORES__[name] = entry;
  };

  // Every write reaches this listener first, so a written store is listed.
  subscribe((state) => {
    list();
    entry.history.push({ at: Date.now(), state });

    if (entry.history.length > HISTORY_LIMIT) {
      entry.history.shift();
    }
  });

  store.subscribe = (listener) => {
    list();

    return subscribe(listener);
  };
}
