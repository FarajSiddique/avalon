import { useState } from "react";
import { TABLE_STEP_LABELS, type TableStep } from "@/design/directions";
import { questReveal, tableViews, voteReveal } from "@/design/mock";
import { useTeamDraft } from "@/design/use-team-draft";
import type { PlayerId, QuestCard, Vote } from "@/shared/views";
import { Panel } from "../ui/panel";
import {
  ProposeActions,
  QuestActions,
  ResultActions,
  RevealActions,
  VoteActions,
} from "./actions";
import { QuestTrack } from "./quest-track";
import { RejectionTrack, Score } from "./score-board";
import type { SeatStatus } from "./seat";
import { SeatRing } from "./seat-ring";
import { Stage } from "./stage";
import { VoteHistory } from "./vote-history";

/** Room to scroll past the fixed action bar on a phone, per step. */
const BOTTOM_ROOM: Record<TableStep, string> = {
  propose: "pb-[170px]",
  vote: "pb-[240px]",
  reveal: "pb-[120px]",
  quest: "pb-[300px]",
  result: "pb-[120px]",
};

const proposePhase = tableViews.propose.phase;
const DRAFT_SIZE =
  proposePhase.name === "team_building" ? proposePhase.teamSize : 3;
const DRAFT_START =
  proposePhase.name === "team_building" ? proposePhase.draftIds : [];

export function TableScreen({ step }: { step: TableStep }) {
  const view = tableViews[step];
  const { phase } = view;
  const youId = view.you.id;

  // Local stand-ins for what the server will hold: your picks, vote and card.
  const draft = useTeamDraft(DRAFT_SIZE, DRAFT_START);
  const [vote, setVote] = useState<Vote | null>(null);
  const [card, setCard] = useState<QuestCard | null>(null);

  const votedIds =
    phase.name === "team_vote"
      ? [...phase.votedIds, ...(vote ? [youId] : [])]
      : [];
  const playedIds =
    phase.name === "quest"
      ? [...phase.playedIds, ...(card ? [youId] : [])]
      : [];

  let teamIds: readonly PlayerId[] = [];
  let statusOf: (id: PlayerId) => SeatStatus = () => "none";
  switch (step) {
    case "propose":
      teamIds = draft.draftIds;
      statusOf = (id) => (draft.isPicked(id) ? "picked" : "none");
      break;
    case "vote":
      teamIds = phase.name === "team_vote" ? phase.teamIds : [];
      statusOf = (id) => (votedIds.includes(id) ? "voted" : "voting");
      break;
    case "reveal":
      teamIds = voteReveal.team;
      statusOf = (id) => voteReveal.votes[id] ?? "none";
      break;
    case "quest": {
      const team = phase.name === "quest" ? phase.teamIds : [];
      teamIds = team;
      statusOf = (id) => {
        if (!team.includes(id)) return "none";
        return playedIds.includes(id) ? "played" : "choosing";
      };
      break;
    }
    case "result":
      teamIds = questReveal.team;
      break;
  }

  const questNumber =
    (step === "result" ? questReveal.questIndex : view.questIndex) + 1;

  return (
    <main
      className={`mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-4 px-4 pt-3 ${BOTTOM_ROOM[step]} lg:grid lg:max-w-[1440px] lg:grid-cols-[288px_minmax(0,1fr)_328px] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-4 lg:px-8 lg:pt-6 lg:pb-8`}
    >
      <header className="flex items-end justify-between gap-3 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-col-reverse lg:flex-row-reverse lg:items-baseline lg:justify-end lg:gap-6">
          <p className="lv-small text-ink-muted lg:text-[24px]">
            {TABLE_STEP_LABELS[step]}
          </p>
          <h1 className="lv-heading lg:text-[24px]">Quest {questNumber}</h1>
        </div>
        <Score score={view.score} />
      </header>

      <div className="lg:col-start-1 lg:row-span-3 lg:row-start-1">
        <Panel>
          <h2 className="lv-label border-line text-ink-muted hidden border-b-[length:var(--px)] px-5 py-3 lg:block">
            The five quests
          </h2>
          <h2 className="sr-only lg:hidden">The five quests</h2>
          <div className="px-2 pt-1 pb-2 lg:p-0">
            <QuestTrack view={view} />
          </div>
          <div className="border-line border-t-[length:var(--px)] px-4 py-2 lg:px-5 lg:py-4">
            <RejectionTrack rejections={view.rejections} />
          </div>
        </Panel>
      </div>

      <div className="lg:col-start-2 lg:row-start-2">
        <SeatRing
          view={view}
          teamIds={teamIds}
          statusOf={statusOf}
          onToggle={step === "propose" ? draft.toggle : undefined}
        />
      </div>

      <div
        className={`mt-1 flex flex-col gap-6 lg:col-start-2 lg:row-start-3 lg:mt-0 ${
          step === "result"
            ? "lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-x-8 lg:gap-y-5"
            : "lg:grid lg:grid-cols-2 lg:items-start lg:gap-8"
        }`}
      >
        <Stage
          step={step}
          view={view}
          questNumber={questNumber}
          draftCount={draft.draftIds.length}
        />
        {step === "propose" ? (
          <ProposeActions
            chosen={draft.draftIds.length}
            teamSize={DRAFT_SIZE}
          />
        ) : step === "vote" ? (
          <VoteActions
            vote={vote}
            votedCount={votedIds.length}
            playerCount={view.players.length}
            onVote={setVote}
            onUndo={() => setVote(null)}
          />
        ) : step === "reveal" ? (
          <RevealActions />
        ) : step === "quest" ? (
          <QuestActions
            card={card}
            alignment={view.you.alignment}
            playedCount={playedIds.length}
            teamSize={teamIds.length}
            onPlay={setCard}
            onUndo={() => setCard(null)}
          />
        ) : (
          <ResultActions />
        )}
      </div>

      <div className="lg:col-start-3 lg:row-span-3 lg:row-start-1">
        <Panel
          title="Vote history"
          aside={
            <span className="lv-label text-ink">{view.proposals.length}</span>
          }
        >
          <VoteHistory view={view} />
        </Panel>
      </div>
    </main>
  );
}
