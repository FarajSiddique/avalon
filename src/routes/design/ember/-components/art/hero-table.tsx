import { Candle } from "./candle";
import { RuneCircle } from "./rune-circle";

/** A scrap of parchment with a few scribbled rune lines. */
function Scrap({ className }: { className: string }) {
  return (
    <div
      className={`ember-parchment absolute h-[19%] w-[15%] ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 40 50"
        className="h-full w-full"
        fill="none"
        stroke="var(--paper-ink-muted)"
        strokeWidth={1.6}
        strokeLinecap="round"
        focusable="false"
      >
        <path d="M8 10h6m3 0h9m3 0h3M8 17h11m3 0h6M8 24h4m3 0h12" />
        <path d="M20 31v12M15 34l5-3 5 3M16 40h8" strokeWidth={1.8} />
      </svg>
    </div>
  );
}

/**
 * The landing illustration: the table as the conspirators see it. A rune
 * circle burning on the planks, four candles, two scraps of parchment.
 * Composed from the same pieces the game screens use, tilted in CSS.
 */
export function HeroTable({ className }: { className?: string }) {
  return (
    <div
      className={`relative aspect-[16/10] w-full ${className ?? ""}`}
      aria-hidden="true"
    >
      {/* candles at the back */}
      <div className="absolute bottom-[76%] left-[15%]">
        <Candle height={50} className="origin-bottom lg:scale-[1.7]" />
      </div>
      <div className="absolute right-[19%] bottom-[79%]">
        <Candle height={44} className="origin-bottom lg:scale-[1.7]" />
      </div>

      {/* the circle, lying flat on the table */}
      <div className="absolute top-1/2 left-1/2 w-[76%] -translate-x-1/2 -translate-y-1/2">
        <div className="[transform:perspective(900px)_rotateX(60deg)]">
          <RuneCircle bare />
        </div>
      </div>

      <Scrap className="top-[60%] left-[2%] -rotate-12" />
      <Scrap className="top-[14%] right-[3%] rotate-[9deg]" />

      {/* candles at the front */}
      <div className="absolute bottom-[1%] left-[19%]">
        <Candle height={74} className="origin-bottom lg:scale-[1.7]" />
      </div>
      <div className="absolute right-[9%] bottom-[9%]">
        <Candle height={66} className="origin-bottom lg:scale-[1.7]" />
      </div>
    </div>
  );
}
