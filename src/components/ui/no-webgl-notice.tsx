/**
 * What the game screens show when the 3D stage cannot run (no WebGL, or
 * the GPU dropped it). The game is played at the 3D table, so there is no
 * flat version to fall back to. `bare` leaves out the page frame, for a
 * notice inside another screen's panel. `onReload` adds a Reload button,
 * for a context lost after the page had it.
 */
export function NoWebGLNotice({
  bare = false,
  onReload,
}: {
  bare?: boolean;
  onReload?: () => void;
}) {
  const Heading = bare ? "h2" : "h1";
  const notice = (
    <section
      role="alert"
      data-no-webgl=""
      className={`text-center ${bare ? "" : "sl-panel w-full max-w-[28rem] p-5 lg:p-6"}`}
    >
      <Heading className="font-display text-[1.625rem] leading-tight font-medium">
        This game needs 3D graphics
      </Heading>
      <p className="text-ink-muted mt-2 text-[1.0625rem] leading-relaxed">
        {onReload
          ? "The 3D table stopped drawing. Reload to bring it back; your seat is kept."
          : "Try another browser, or turn on hardware acceleration in this one."}
      </p>
      {onReload ? (
        <button
          type="button"
          className="sl-btn sl-btn--primary mt-4 w-full"
          onClick={onReload}
        >
          Reload
        </button>
      ) : null}
    </section>
  );

  if (bare) {
    return notice;
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      {notice}
    </main>
  );
}
