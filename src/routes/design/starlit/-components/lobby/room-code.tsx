import { useCallback, useState, useSyncExternalStore } from "react";
import { noSnapshot, noSubscription } from "@/client/no-subscription";
import { play } from "@/client/sound";
import { cssVars } from "@/design/css-vars";
import { IconCheck, IconCopy } from "../icons";

/**
 * The room code with a copy button: a small badge for the lobby's header,
 * over the 3D table.
 */
export function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  // Each copy replays the little wave through the letters.
  const [copies, setCopies] = useState(0);
  // "Copied" lasts 2.4s from the copy that showed it (copying again while it
  // shows does not extend it). The timer lives as long as `copied` is true,
  // set up after that commit and cleared on unmount.
  const clearLater = useCallback(() => {
    const timer = window.setTimeout(() => setCopied(false), 2400);

    return () => window.clearTimeout(timer);
  }, []);

  useSyncExternalStore(
    copied ? clearLater : noSubscription,
    noSnapshot,
    noSnapshot,
  );

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

  return (
    <section
      aria-label="Room code"
      className="sl-panel flex flex-none items-center gap-3 py-1.5 pr-1.5 pl-4"
    >
      <div className="flex flex-col">
        <p className="sl-eyebrow whitespace-nowrap">Room code</p>
        <p
          key={copies}
          className="sl-code sl-code--compact font-display"
          aria-label={spoken}
          data-wave={copies > 0}
        >
          {code.split("").map((letter, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="sl-code__letter sl-seq"
              style={cssVars({ "--i": index })}
            >
              {letter}
            </span>
          ))}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="sl-btn sl-btn--ghost min-w-11 px-3"
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? (
          <IconCheck size={18} className="sl-pop sl-seq" />
        ) : (
          <IconCopy size={18} />
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `Copied room code ${spoken}` : ""}
      </span>
    </section>
  );
}
