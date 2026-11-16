import { playerNames } from "@/design/mock";
import type { GameView, QuestView } from "@/shared/views";
import { IconCheck, IconCross } from "../icons";
import { joinNames } from "../names";

const STATUS_LABEL: Record<QuestView["status"], string> = {
  upcoming: "To come",
  current: "Now",
  success: "Success",
  fail: "Failed",
};

const STATUS_TONE: Record<QuestView["status"], string> = {
  upcoming: "text-ink-muted",
  current: "text-accent",
  success: "text-success",
  fail: "text-fail",
};

function failsText(count: number): string {
  return count === 1 ? "1 Fail card" : `${count} Fail cards`;
}

/**
 * The five quests as five moons joined by a fine line. The number in each
 * moon is the team size. A finished quest gets a tick or a cross on its rim
 * and the word Success or Failed; the current one glows.
 */
export function QuestTrack({ view }: { view: GameView }) {
  return (
    <section aria-label="Quest track">
      <ol className="sl-track">
        {view.quests.map((quest, index) => (
          <li
            key={index}
            className="sl-track__quest"
            aria-current={quest.status === "current" ? "step" : undefined}
          >
            <span className="sl-moon" data-status={quest.status}>
              <span aria-hidden="true">{quest.teamSize}</span>
              {quest.status === "success" && (
                <span className="sl-moon__badge">
                  <IconCheck size={12} />
                </span>
              )}
              {quest.status === "fail" && (
                <span className="sl-moon__badge">
                  <IconCross size={12} />
                </span>
              )}
            </span>
            <span className="min-w-0 lg:pt-0.5">
              <span className="text-ink block text-[0.8125rem] leading-tight font-bold lg:text-base">
                Quest {index + 1}
                <span className="sr-only">, {quest.teamSize} players.</span>
              </span>
              <span
                className={`text-[0.8125rem] leading-tight font-extrabold lg:block lg:text-[0.9375rem] ${quest.status === "upcoming" ? "hidden" : "block"} ${STATUS_TONE[quest.status]}`}
              >
                {STATUS_LABEL[quest.status]}
              </span>
              {quest.failsRequired === 2 && (
                <span className="text-warning mt-0.5 block text-[0.8125rem] leading-tight font-bold lg:text-[0.9375rem]">
                  2 fails needed
                </span>
              )}
              <span className="sl-track__detail text-ink-muted mt-0.5 text-base leading-snug">
                {quest.teamSize} players
                {quest.team
                  ? `: ${joinNames(playerNames(view, quest.team))}.`
                  : "."}
                {quest.failCount !== undefined &&
                  ` ${quest.failCount === 0 ? "No Fail cards" : failsText(quest.failCount)}.`}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-ink-muted mt-2 text-center text-base leading-snug lg:hidden">
        Each moon shows its team size.
      </p>
    </section>
  );
}
