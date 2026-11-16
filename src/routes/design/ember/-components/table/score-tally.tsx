import type { GameView } from "@/shared/views";
import { DaggerIcon, ShieldIcon } from "../art/icons";

/** Quests won by each side. Shape, word and colour for both. */
export function ScoreTally({
  score,
  className,
}: {
  score: GameView["score"];
  className?: string;
}) {
  return (
    <dl className={`flex items-center gap-1.5 lg:gap-2 ${className ?? ""}`}>
      <div className="ember-well text-good flex min-h-10 items-center justify-center gap-1 px-2 lg:flex-1 lg:gap-2">
        <ShieldIcon size={16} />
        <dt className="ember-label tracking-[0.06em]">Good</dt>
        <dd className="font-display text-xl leading-none font-bold">
          {score.good}
        </dd>
      </div>
      <div className="ember-well text-evil flex min-h-10 items-center justify-center gap-1 px-2 lg:flex-1 lg:gap-2">
        <DaggerIcon size={16} />
        <dt className="ember-label tracking-[0.06em]">Evil</dt>
        <dd className="font-display text-xl leading-none font-bold">
          {score.evil}
        </dd>
      </div>
    </dl>
  );
}
