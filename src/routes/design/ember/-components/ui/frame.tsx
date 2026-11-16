import type { ElementType, ReactNode } from "react";

/** A small engraved bracket for each corner of a frame. */
function Corner({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      className={`pointer-events-none absolute ${className}`}
      fill="none"
      stroke="var(--frame-gilt)"
      strokeWidth={1.2}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 9V1h8M4 4l4 4" />
      <path d="M8 6.2 9.8 8 8 9.8 6.2 8Z" fill="var(--frame-gilt)" />
    </svg>
  );
}

/**
 * A carved oak panel with a double-line frame and engraved corner brackets.
 * The standard container for anything that is not parchment. With
 * `wideOnly` the frame is drawn only on a wide screen.
 */
export function Frame({
  as: Tag = "section",
  wideOnly = false,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  /** Draw the frame only on a wide screen; on a phone show bare content. */
  wideOnly?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const corner = wideOnly ? "hidden lg:block" : "";
  return (
    <Tag
      className={`${wideOnly ? "ember-frame-lg" : "ember-frame"} ${className ?? ""}`}
      {...rest}
    >
      <Corner className={`top-2 left-2 ${corner}`} />
      <Corner className={`top-2 right-2 rotate-90 ${corner}`} />
      <Corner className={`right-2 bottom-2 rotate-180 ${corner}`} />
      <Corner className={`bottom-2 left-2 -rotate-90 ${corner}`} />
      {children}
    </Tag>
  );
}

/** The heading plate at the top of a frame. */
export function FrameTitle({
  id,
  children,
  aside,
}: {
  id?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="ember-carved text-accent-strong text-base">
        {children}
      </h2>
      {aside ? (
        <span className="ember-label text-ink-muted shrink-0">{aside}</span>
      ) : null}
    </div>
  );
}
