import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => {};

/**
 * False in server-rendered HTML and until React has taken over the page.
 * Use it to keep a submit button disabled until its handler is attached, so
 * an early tap cannot trigger the browser's own form submission.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
