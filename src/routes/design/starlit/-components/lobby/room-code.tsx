import { useEffect, useState, type CSSProperties } from "react";
import { play } from "@/client/sound";
import { IconCheck, IconCopy } from "../icons";

/**
 * The room code, large enough to read across a table, with a copy button.
 * `compact`: a small badge for the lobby's header, over the 3D table.
 */
export function RoomCode({
  code,
  compact = false,
}: {
  code: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  // Each copy replays the little wave through the letters.
  const [copies, setCopies] = useState(0);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard access can be refused; the code is on screen either way.
    }
    setCopied(true);
    setCopies((count) => count + 1);
    play("copy");
  };

  const spoken = code.split("").join(" ");
  const letters = (
    <p
      key={copies}
      className={`sl-code font-display ${compact ? "sl-code--compact" : ""}`}
      aria-label={spoken}
      data-wave={copies > 0}
    >
      {code.split("").map((letter, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="sl-code__letter sl-seq"
          style={{ "--i": index } as CSSProperties}
        >
          {letter}
        </span>
      ))}
    </p>
  );
  const icon = copied ? (
    <IconCheck size={18} className="sl-pop sl-seq" />
  ) : (
    <IconCopy size={18} />
  );
  const status = (
    <span className="sr-only" role="status" aria-live="polite">
      {copied ? `Copied room code ${spoken}` : ""}
    </span>
  );

  if (compact)
    return (
      <section
        aria-label="Room code"
        className="sl-panel flex flex-none items-center gap-3 py-1.5 pr-1.5 pl-4"
      >
        <div className="flex flex-col">
          <p className="sl-eyebrow whitespace-nowrap">Room code</p>
          {letters}
        </div>
        <button
          type="button"
          onClick={copy}
          className="sl-btn sl-btn--ghost min-w-11 px-3"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {icon}
        </button>
        {status}
      </section>
    );

  return (
    <section
      aria-label="Room code"
      className="sl-panel flex flex-col items-center gap-3 px-5 pt-4 pb-5 text-center"
    >
      <p className="sl-eyebrow">Room code</p>
      {letters}
      <p className="text-ink-muted text-base leading-snug">
        Friends type this on their own phone to join.
      </p>
      <button
        type="button"
        onClick={copy}
        className="sl-btn sl-btn--ghost w-full max-w-[16rem]"
      >
        {icon}
        {copied ? "Copied" : "Copy code"}
      </button>
      {status}
    </section>
  );
}
