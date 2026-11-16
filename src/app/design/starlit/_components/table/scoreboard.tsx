import { MAX_REJECTIONS, QUESTS_TO_WIN } from "@/shared/constants";
import type { GameView } from "@/shared/views";
import { IconDagger, IconShield } from "../icons";

/** Quests won by each side, and how many teams in a row have been rejected. */
export function Scoreboard({ view }: { view: GameView }) {
  const pips = Array.from({ length: MAX_REJECTIONS }, (_, index) => index);
  return (
    <section
      aria-label="Score"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:flex-col lg:items-stretch"
    >
      <div className="flex items-center gap-4">
        <p className="text-good flex items-center gap-1.5 text-base font-extrabold">
          <IconShield size={20} />
          Good
          <span className="font-display text-ink text-2xl leading-none font-semibold">
            {view.score.good}
          </span>
        </p>
        <p className="text-evil flex items-center gap-1.5 text-base font-extrabold">
          <IconDagger size={20} />
          Evil
          <span className="font-display text-ink text-2xl leading-none font-semibold">
            {view.score.evil}
          </span>
        </p>
        <p className="text-ink-muted hidden text-base lg:ml-auto lg:block">
          First to {QUESTS_TO_WIN}
        </p>
      </div>
      <div className="lg:border-line flex items-center gap-2.5 lg:justify-between lg:border-t lg:border-dashed lg:pt-3">
        <p className="text-base font-bold">
          <span className="lg:hidden">Rejected</span>
          <span className="hidden lg:inline">Rejected teams</span>{" "}
          <span className="whitespace-nowrap">
            {view.rejections} of {MAX_REJECTIONS}
          </span>
        </p>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {pips.map((pip) => (
            <span
              key={pip}
              className="sl-pip"
              data-on={pip < view.rejections}
            />
          ))}
        </span>
      </div>
      <p className="text-ink-muted hidden text-base leading-snug lg:block">
        Five rejected teams in a row and Evil wins.
      </p>
    </section>
  );
}
