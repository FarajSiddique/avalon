import { MAX_REJECTIONS } from "@/shared/constants";
import type { GameView } from "@/shared/views";
import { PixelIcon } from "../pixel/pixel-sprite";

/** Quests won by each side. */
export function Score({ score }: { score: GameView["score"] }) {
  return (
    <p
      className="flex shrink-0 items-center gap-2 lg:gap-3"
      aria-label={`Score: Good ${score.good}, Evil ${score.evil}`}
    >
      <span className="text-good flex items-center gap-2" aria-hidden>
        <PixelIcon name="shield" />
        <span>Good</span>
        <span className="lv-heading">{score.good}</span>
      </span>
      <span className="text-ink-muted" aria-hidden>
        :
      </span>
      <span className="text-evil flex items-center gap-2" aria-hidden>
        <span className="lv-heading">{score.evil}</span>
        <span>Evil</span>
        <PixelIcon name="horns" />
      </span>
    </p>
  );
}

/** Rejected teams in a row. Five hands the game to Evil. */
export function RejectionTrack({ rejections }: { rejections: number }) {
  return (
    <p
      className="flex flex-wrap items-center gap-x-3 gap-y-1"
      aria-label={`Rejected teams: ${rejections} of ${MAX_REJECTIONS}`}
    >
      <span aria-hidden>Rejected</span>
      <span aria-hidden className="flex gap-[var(--px)]">
        {Array.from({ length: MAX_REJECTIONS }, (_, index) => (
          <span
            key={index}
            className={`lv-dither flex size-[calc(var(--px)*9)] items-center justify-center ${
              index < rejections
                ? "text-fail [--dither-a:var(--well)] [--dither-b:var(--well)]"
                : "[--dither-a:var(--line)] [--dither-b:var(--surface)]"
            }`}
          >
            {index < rejections ? <PixelIcon name="cross" /> : null}
          </span>
        ))}
      </span>
      <span className="lv-label text-ink" aria-hidden>
        {rejections} of {MAX_REJECTIONS}
      </span>
    </p>
  );
}
