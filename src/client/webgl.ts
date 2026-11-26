/**
 * Whether this browser can draw the Star Table: a WebGL2 context on a fresh
 * canvas. The canvas is dropped at once, so the context goes with it.
 */
export function hasWebGL2(): boolean {
  try {
    return document.createElement("canvas").getContext("webgl2") !== null;
  } catch {
    return false;
  }
}
