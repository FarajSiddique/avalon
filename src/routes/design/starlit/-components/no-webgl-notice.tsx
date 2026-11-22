/**
 * What the game screens show when the 3D stage cannot run (no WebGL, or
 * the GPU dropped it). The game is played at the 3D table, so there is no
 * flat version to fall back to.
 */
export function NoWebGLNotice() {
  return (
    <main
      data-no-webgl=""
      className="flex flex-1 items-center justify-center px-4 py-10"
    >
      <section
        role="alert"
        className="sl-panel w-full max-w-[28rem] p-5 text-center lg:p-6"
      >
        <h1 className="font-display text-[1.625rem] leading-tight font-medium">
          This game needs 3D graphics
        </h1>
        <p className="text-ink-muted mt-2 text-[1.0625rem] leading-relaxed">
          Try another browser, or turn on hardware acceleration in this one.
        </p>
      </section>
    </main>
  );
}
