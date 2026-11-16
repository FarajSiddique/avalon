import type { TableStep } from "@/design/directions";
import {
  playerName,
  playerNames,
  questReveal,
  voteReveal,
} from "@/design/mock";
import type { GameView, PlayerId } from "@/shared/views";
import { Helm, PixelIcon } from "../pixel/pixel-sprite";
import { DialogBox } from "../ui/panel";
import { QuestCardFace } from "./quest-card";
import { tallyLine } from "./vote-history";

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function TeamChips({ view, ids }: { view: GameView; ids: PlayerId[] }) {
  return (
    <span className="flex flex-wrap gap-x-5 gap-y-2">
      {ids.map((id) => (
        <span key={id} className="flex items-center gap-2">
          <Helm seatIndex={view.players.findIndex((p) => p.id === id)} />
          <span className="text-[24px] leading-none">
            {playerName(view, id)}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * The game's voice: one speech box that says what is happening now. Live
 * counts (voted, played) sit with the buttons in the action bar.
 */
export function Stage({
  step,
  view,
  questNumber,
  draftCount,
}: {
  step: TableStep;
  view: GameView;
  questNumber: number;
  draftCount: number;
}) {
  const you = playerName(view, view.you.id);

  switch (step) {
    case "propose": {
      const size =
        view.phase.name === "team_building" ? view.phase.teamSize : 0;
      return (
        <DialogBox speaker="Your turn" className="p-4 pt-6">
          <p>
            You lead, {you}. Tap {size} knights to send on Quest {questNumber}.
          </p>
          <p className="lv-small text-ink-muted mt-2" aria-live="polite">
            {draftCount === size
              ? "The team is full. Tap a knight to stand them down."
              : `${size - draftCount} more to choose.`}
          </p>
        </DialogBox>
      );
    }
    case "vote": {
      const teamIds = view.phase.name === "team_vote" ? view.phase.teamIds : [];
      return (
        <DialogBox
          speaker="The proposal"
          className="flex flex-col gap-3 p-4 pt-6"
        >
          <p>
            {playerName(view, view.leaderId)} would send these knights on Quest{" "}
            {questNumber}:
          </p>
          <TeamChips view={view} ids={teamIds} />
          <p className="lv-small text-ink-muted">
            Votes stay sealed until everyone has chosen.
          </p>
        </DialogBox>
      );
    }
    case "reveal":
      return (
        <DialogBox speaker="The vote" className="flex flex-col gap-3 p-4 pt-6">
          <p
            className={`lv-heading flex items-center gap-3 ${voteReveal.approved ? "text-success" : "text-fail"}`}
          >
            <PixelIcon name={voteReveal.approved ? "check" : "cross"} />
            {tallyLine(voteReveal)}
          </p>
          <p>
            {joinNames(playerNames(view, voteReveal.team))} set out on Quest{" "}
            {questNumber}.
          </p>
        </DialogBox>
      );
    case "quest":
      return (
        <DialogBox speaker="The quest" className="flex flex-col gap-2 p-4 pt-6">
          <p>You are on this quest. Play one card.</p>
          <p className="lv-small text-ink-muted">
            Cards are shuffled, so nobody learns which was yours.
          </p>
        </DialogBox>
      );
    case "result": {
      const failed = questReveal.outcome === "fail";
      const next = view.quests[view.questIndex];
      return (
        <>
          <DialogBox
            speaker="The cards"
            className="flex flex-col gap-4 p-4 pt-7 lg:row-span-2"
          >
            <p
              className={`lv-heading flex items-center justify-center gap-3 ${failed ? "text-fail" : "text-success"}`}
            >
              <PixelIcon name={failed ? "skull" : "grail"} />
              Quest {failed ? "failed" : "succeeded"}
            </p>
            <ul className="flex justify-center gap-[calc(var(--px)*4)]">
              {questReveal.cards.map((card, index) => (
                <li
                  key={index}
                  className="lv-frame lv-pop bg-well flex w-[calc(var(--px)*32)] justify-center py-4 [--frame-color:var(--line-strong)]"
                  style={{ animationDelay: `${index * 160}ms` }}
                >
                  <QuestCardFace card={card} />
                </li>
              ))}
            </ul>
          </DialogBox>
          <div className="flex flex-col gap-3">
            <p>
              {questReveal.failCount} Fail{" "}
              {questReveal.failCount === 1 ? "card" : "cards"} out of{" "}
              {questReveal.cards.length}. The cards were shuffled, so nobody
              knows who played it.
            </p>
            {next ? (
              <p className="lv-small text-ink-muted">
                {playerName(view, view.leaderId)} leads next. Quest{" "}
                {view.questIndex + 1} needs {next.teamSize} players and{" "}
                {next.failsRequired}{" "}
                {next.failsRequired === 1 ? "Fail" : "Fails"}.
              </p>
            ) : null}
          </div>
        </>
      );
    }
  }
}
