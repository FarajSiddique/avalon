"use client";

import { useEffect, useState } from "react";
import { PixelIcon } from "../pixel/pixel-sprite";
import { PixelButton } from "../ui/pixel-button";

/** The room code, one letter per tile, with a copy button. */
export function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Clipboard access can be refused. The code is on screen either way.
    }
    setCopied(true);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="lv-label text-ink-muted">Room code</p>
      <p
        className="flex gap-[calc(var(--px)*4)]"
        aria-label={`Room code ${code.split("").join(" ")}`}
      >
        {code.split("").map((letter, index) => (
          <span
            key={index}
            aria-hidden
            className="lv-frame bg-well font-display text-accent-strong flex size-14 items-center justify-center text-[32px] leading-none [--frame-color:var(--accent)] lg:size-16"
          >
            {letter}
          </span>
        ))}
      </p>
      <div className="flex min-h-12 items-center gap-4">
        <PixelButton onClick={copy}>
          <PixelIcon name={copied ? "check" : "copy"} />
          {copied ? "Copied" : "Copy code"}
        </PixelButton>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? "Room code copied." : ""}
      </p>
    </div>
  );
}
