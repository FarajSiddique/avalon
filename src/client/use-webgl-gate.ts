import { useSyncExternalStore } from "react";
import { noSubscription } from "./no-subscription";
import { hasWebGL2 } from "./webgl";

/**
 * "checking" on the server and while hydrating, then "ok" or "none". The
 * game is played at the 3D table, so "none" means the browser cannot play.
 */
export type WebGLGate = "checking" | "ok" | "none";

/** Asked once per page: the answer does not change while it is open. */
let answer: "ok" | "none" | null = null;

function snapshot(): WebGLGate {
  answer ??= hasWebGL2() ? "ok" : "none";

  return answer;
}

const serverSnapshot = (): WebGLGate => "checking";

/**
 * Can this browser draw the Star Table? A screen also treats a failed stage
 * (the GPU dropped the context) as "none"; this hook only answers for the
 * browser.
 */
export function useWebGLGate(): WebGLGate {
  return useSyncExternalStore(noSubscription, snapshot, serverSnapshot);
}
