/**
 * Whether this browser can draw the Star Table: a WebGL2 context on a fresh
 * canvas. The context is released straight away, since browsers allow only
 * a few at a time.
 */
export function hasWebGL2(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");

    if (!gl) {
      return false;
    }

    gl.getExtension("WEBGL_lose_context")?.loseContext();

    return true;
  } catch {
    return false;
  }
}
