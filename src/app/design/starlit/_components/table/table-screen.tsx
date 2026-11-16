import { TABLE_STEP_LABELS, type TableStep } from "@/design/directions";
import {
  playerName,
  playerNames,
  questReveal,
  tableViews,
} from "@/design/mock";
import type { GameView } from "@/shared/views";
import { FreshOnReturn } from "../fresh-on-return";
import { joinNames, numberWord } from "../names";
import { QuestTrack } from "./quest-track";
import { Scoreboard } from "./scoreboard";
import { TableStage } from "./stages";
import { VoteHistory } from "./vote-history";

interface Heading {
  quest: number;
  title: string;
  line: string;
}

function headingFor(step: TableStep, view: GameView): Heading {
  const quest = view.questIndex + 1;
  const { phase } = view;
  const leader = playerName(view, view.leaderId);
  const youLead = view.leaderId === view.you.id;

  switch (step) {
    case "propose": {
      const size = phase.name === "team_building" ? phase.teamSize : 0;
      return {
        quest,
        title: youLead ? "Choose your team" : `${leader} is choosing a team`,
        line: `${youLead ? "You lead" : `${leader} leads`} quest ${quest}. It needs ${numberWord(size)} players.`,
      };
    }
    case "vote": {
      const team = phase.name === "team_vote" ? phase.teamIds : [];
      return {
        quest,
        title: "Vote on the team",
        line: `${youLead ? "You propose" : `${leader} proposes`} ${joinNames(playerNames(view, team))} for quest ${quest}.`,
      };
    }
    case "reveal":
      return {
        quest,
        title: "The votes are in",
        line: "Every vote is shown at the same moment.",
      };
    case "quest": {
      const onTeam = phase.name === "quest" && phase.onTeam;
      return {
        quest,
        title: "The quest is under way",
        line: onTeam
          ? "You are on the team. Play one card."
          : "Wait while the team plays its cards.",
      };
    }
    case "result":
      return {
        quest: questReveal.questIndex + 1,
        title: `Quest ${questReveal.questIndex + 1} is over`,
        line: "The cards were shuffled, then turned over together.",
      };
  }
}

/** The table at one step of the round, seen by Wren. */
export function TableScreen({ step }: { step: TableStep }) {
  const view = tableViews[step];
  const heading = headingFor(step, view);

  return (
    <main className="sl-table">
      <header className="sl-table__head lg:text-center">
        <p className="sl-eyebrow">
          Quest {heading.quest} · {TABLE_STEP_LABELS[step]}
        </p>
        <h1 className="font-display mt-1 text-[1.875rem] leading-tight font-medium lg:text-[2.5rem]">
          {heading.title}
        </h1>
        <p className="text-ink-muted mt-1 text-[1.0625rem] leading-snug">
          {heading.line}
        </p>
      </header>

      <aside className="sl-table__side sl-panel flex flex-col gap-4 p-4 lg:gap-5 lg:p-5">
        <Scoreboard view={view} />
        <div className="border-line border-t border-dashed" />
        <QuestTrack view={view} />
      </aside>

      <FreshOnReturn>
        <TableStage step={step} view={view} />
      </FreshOnReturn>

      <aside className="sl-table__history">
        <VoteHistory view={view} />
      </aside>
    </main>
  );
}
