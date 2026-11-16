import type { GameView, QuestView } from "@/shared/views";
import { BrokenBladeIcon, GrailIcon, PersonIcon } from "../art/icons";
import { WaxSeal } from "../art/wax-seal";
import { listNames, namesOf, questNumeral } from "../lib/names";

const STATUS_WORD: Record<QuestView["status"], string> = {
  upcoming: "",
  current: "Now",
  success: "Success",
  fail: "Failed",
};

const STATUS_COLOR: Record<QuestView["status"], string> = {
  upcoming: "text-ink-muted",
  current: "text-accent-strong",
  success: "text-success",
  fail: "text-fail",
};

function describe(quest: QuestView, index: number): string {
  const parts = [`Quest ${index + 1}`, `team of ${quest.teamSize}`];
  if (quest.failsRequired === 2) parts.push("2 Fails needed to fail");
  if (quest.status === "current") parts.push("current quest");
  if (quest.status === "success") parts.push("succeeded");
  if (quest.status === "fail") parts.push("failed");
  return parts.join(", ");
}

function QuestItem({
  view,
  quest,
  index,
}: {
  view: GameView;
  quest: QuestView;
  index: number;
}) {
  const current = quest.status === "current";
  const word = STATUS_WORD[quest.status];
  const color = STATUS_COLOR[quest.status];

  return (
    <li
      aria-current={current ? "step" : undefined}
      className="relative flex flex-col items-center gap-1 text-center lg:flex-row lg:gap-4 lg:py-2.5 lg:text-left"
    >
      <span className="sr-only">{describe(quest, index)}</span>

      {/* The token: the number inside is the team size. */}
      <span
        className={`ember-quest ember-quest--${quest.status} ${current ? "ember-pulse" : ""}`}
        aria-hidden="true"
      >
        <span className="flex items-center gap-px">
          {quest.teamSize}
          <PersonIcon size={12} />
        </span>
        {quest.status === "success" ? (
          <WaxSeal
            tone="laurel"
            size={20}
            className="absolute -right-1.5 -bottom-1"
          >
            <GrailIcon size={12} />
          </WaxSeal>
        ) : null}
        {quest.status === "fail" ? (
          <WaxSeal size={20} className="absolute -right-1.5 -bottom-1">
            <BrokenBladeIcon size={12} />
          </WaxSeal>
        ) : null}
      </span>

      <div className="min-w-0 lg:flex-1" aria-hidden="true">
        <p
          className={`ember-label ${current ? "text-accent-strong" : "text-ink"}`}
        >
          <span className="hidden lg:inline">Quest </span>
          {questNumeral(index)}
        </p>
        {/* Phone: one or two short words under the token. */}
        <p className={`ember-label text-[0.6875rem] lg:hidden ${color}`}>
          {word}
        </p>
        {quest.failsRequired === 2 ? (
          <p className="ember-label text-warning text-[0.6875rem] tracking-[0.08em] lg:hidden">
            2 Fails needed
          </p>
        ) : null}
        {/* Wide screen: the full line. */}
        <p className="text-ink-muted hidden text-[1.0625rem] leading-snug lg:block">
          Team of {quest.teamSize}
          {quest.team ? `: ${listNames(namesOf(view, quest.team))}` : ""}
          {quest.failsRequired === 2 ? (
            <span className="text-warning block">2 Fails needed to fail</span>
          ) : null}
          {quest.failCount !== undefined ? (
            <span className={`block ${color}`}>
              {quest.failCount === 0
                ? "No Fail cards"
                : `${quest.failCount} Fail ${quest.failCount === 1 ? "card" : "cards"}`}
            </span>
          ) : null}
        </p>
      </div>

      {word ? (
        <span
          className={`ember-label hidden shrink-0 lg:inline ${color}`}
          aria-hidden="true"
        >
          {word}
        </span>
      ) : null}
    </li>
  );
}

/**
 * The five quests. On a phone: a row of five tokens joined by an engraved
 * line. On a wide screen: a ledger, one line per quest with the team.
 */
export function QuestTrack({ view }: { view: GameView }) {
  return (
    <ol
      aria-label="Quests"
      className="ember-quest-line grid grid-cols-5 items-start lg:flex lg:flex-col lg:items-stretch lg:divide-y lg:divide-(--frame-outer)"
    >
      {view.quests.map((quest, index) => (
        <QuestItem key={index} view={view} quest={quest} index={index} />
      ))}
    </ol>
  );
}
