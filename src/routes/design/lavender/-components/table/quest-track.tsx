import { playerNames } from "@/design/mock";
import type { GameView, QuestView } from "@/shared/views";
import { PixelIcon } from "../pixel/pixel-sprite";

const STATUS_WORD: Record<QuestView["status"], string> = {
  success: "Success",
  fail: "Fail",
  current: "Now",
  upcoming: "",
};

const TILE_CLASS: Record<QuestView["status"], string> = {
  success: "bg-success text-on-accent [--frame-color:var(--track-success)]",
  fail: "bg-fail text-on-accent [--frame-color:var(--track-fail)]",
  current: "bg-well text-accent-strong [--frame-color:var(--track-current)]",
  upcoming:
    "text-ink-muted bg-[var(--track-upcoming)] [--frame-color:var(--line-strong)]",
};

const WORD_CLASS: Record<QuestView["status"], string> = {
  success: "text-success",
  fail: "text-fail",
  current: "text-accent-strong",
  upcoming: "text-ink-muted",
};

function QuestTile({ quest, number }: { quest: QuestView; number: number }) {
  return (
    <span
      className={`lv-frame font-display flex size-12 shrink-0 items-center justify-center text-[16px] leading-none lg:size-14 ${TILE_CLASS[quest.status]}`}
    >
      {quest.status === "success" ? (
        <PixelIcon name="grail" />
      ) : quest.status === "fail" ? (
        <PixelIcon name="skull" />
      ) : (
        <span aria-hidden>{number}</span>
      )}
    </span>
  );
}

/**
 * The five quests. A row of tiles on a phone; a detailed list in the side
 * panel of a wide screen. Each quest says its team size, its result in a
 * word and an icon, and whether it needs two Fails.
 */
export function QuestTrack({ view }: { view: GameView }) {
  return (
    <ol className="grid grid-cols-5 gap-x-2 lg:grid-cols-1">
      {view.quests.map((quest, index) => {
        const number = index + 1;
        const twoFails = quest.failsRequired === 2;
        const team = quest.team ? playerNames(view, quest.team) : [];
        return (
          <li
            key={number}
            aria-current={quest.status === "current" ? "step" : undefined}
            className="border-line flex flex-col items-center gap-[calc(var(--px)*2)] lg:flex-row lg:items-start lg:gap-5 lg:border-b-[length:var(--px)] lg:px-5 lg:py-4 lg:last:border-b-0"
          >
            <span className="flex h-[calc(var(--px)*4)] items-end lg:hidden">
              {quest.status === "current" ? (
                <PixelIcon name="arrowDown" className="lv-bob text-accent" />
              ) : null}
            </span>
            <QuestTile quest={quest} number={number} />

            {/* Phone: short captions under the tile. */}
            <span className="lv-small flex flex-col items-center text-center leading-none lg:hidden">
              <span className="sr-only">Quest {number}.</span>
              <span>Team {quest.teamSize}</span>
              {STATUS_WORD[quest.status] ? (
                <span className={WORD_CLASS[quest.status]}>
                  {STATUS_WORD[quest.status]}
                </span>
              ) : null}
              {twoFails ? <span className="text-warning">2 Fails</span> : null}
            </span>

            {/* Wide screen: the full story of each quest. */}
            <span className="hidden min-w-0 flex-1 flex-col gap-1 lg:flex">
              <span className="flex items-center justify-between gap-2">
                <span className="lv-label">Quest {number}</span>
                {STATUS_WORD[quest.status] ? (
                  <span
                    className={`flex items-center gap-2 ${WORD_CLASS[quest.status]}`}
                  >
                    {quest.status === "current" ? (
                      <PixelIcon name="arrowRight" className="lv-blink" />
                    ) : null}
                    {STATUS_WORD[quest.status]}
                  </span>
                ) : null}
              </span>
              <span className="lv-small text-ink-muted">
                Team of {quest.teamSize}
                {quest.failCount !== undefined
                  ? ` · ${quest.failCount} ${quest.failCount === 1 ? "Fail" : "Fails"}`
                  : ""}
              </span>
              {twoFails ? (
                <span className="lv-small text-warning">2 Fails needed</span>
              ) : null}
              {team.length > 0 ? (
                <span className="lv-small">{team.join(", ")}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
