import type { ReactNode } from "react";

/** A plain framed box: the standard container for a group of content. */
export function Panel({
  title,
  aside,
  children,
  className,
}: {
  title?: string;
  /** Shown on the right of the title row, for a count or a state. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`lv-frame lv-panel ${className ?? ""}`}>
      {title ? (
        <header className="border-line flex items-center justify-between gap-3 border-b-[length:var(--px)] px-4 py-3">
          <h2 className="lv-label text-ink-muted">{title}</h2>
          {aside}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/**
 * The speech box of a role-playing game. The game talks to the table through
 * these: a name plate, a line or two of text, sometimes a blinking prompt.
 */
export function DialogBox({
  speaker,
  children,
  className,
}: {
  speaker?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`lv-frame lv-dialog relative ${className ?? ""}`}>
      {speaker ? (
        <span className="lv-nameplate absolute -top-[calc(var(--px)*4)] left-[calc(var(--px)*3)]">
          {speaker}
        </span>
      ) : null}
      {children}
    </div>
  );
}
