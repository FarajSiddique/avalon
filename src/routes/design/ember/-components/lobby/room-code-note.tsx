import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "../art/icons";
import { WaxSeal } from "../art/wax-seal";

/**
 * The room code, inked on a note that lies on the table. The copy button
 * confirms with a visible and announced "Copied".
 */
export function RoomCodeNote({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard can be blocked (no permission, insecure origin). The code
      // is on screen in large letters, so there is nothing else to do.
    }
    setCopied(true);
  };

  return (
    <section
      aria-label="Room code"
      className={`ember-parchment -rotate-1 px-6 pt-5 pb-6 ${className ?? ""}`}
    >
      <WaxSeal size={44} className="absolute -top-3 right-5 rotate-12">
        <span className="font-display text-lg font-bold">A</span>
      </WaxSeal>
      <p className="ember-label ember-paper-muted">Room code</p>
      <p
        className="font-display mt-1 text-[3.5rem] leading-none font-bold tracking-[0.18em]"
        aria-label={code.split("").join(" ")}
      >
        {code}
      </p>
      <div className="ember-paper-rule my-3" />
      <p className="ember-paper-muted text-[1.0625rem] leading-snug">
        Read it aloud. Anyone in the room can join with these four letters.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="ember-btn ember-btn--secondary min-h-12 px-4 text-[0.8125rem]"
        >
          {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
          Copy code
        </button>
        <span
          role="status"
          aria-live="polite"
          className="ember-label min-h-5 text-(--paper-success)"
        >
          {copied ? "Copied" : ""}
        </span>
      </div>
    </section>
  );
}
