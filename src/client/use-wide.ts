import { useSyncExternalStore } from "react";

const WIDE = "(min-width: 1024px)";

function subscribe(change: () => void): () => void {
  const query = window.matchMedia(WIDE);

  query.addEventListener("change", change);

  return () => query.removeEventListener("change", change);
}

/** A wide screen (1024px and up), read after hydration (the server renders the phone's). */
export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}
