import type { TableStep } from "@/design/directions";
import { playerName, playerNames, questReveal } from "@/design/mock";
import { MAX_REJECTIONS } from "@/shared/constants";
import type { GameView, ProposalRecord } from "@/shared/views";
import { joinNames, numberWord } from "../names";
import { tallyOf } from "./vote-history";

/** The step's heading: which quest, what is happening, and one line more. */
export interface Heading {
  quest: number;
  title: string;
  line: string;
}

export function headingFor(step: TableStep, view: GameView): Heading {
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
        line: "The cards were shuffled, then turned over one at a time.",
      };
  }
}

/*
 * Each table section, closed, says its state in a few words, so the news
 * is there in text while the panel is shut and the table shows.
 */

/** "Good 1, Evil 1 · Quest 3 needs 3 · 1 of 5 rejected". */
export function questsSummary(
  view: Pick<GameView, "score" | "questIndex" | "quests" | "rejections">,
): string {
  const quest = view.quests[view.questIndex];
  const parts = [`Good ${view.score.good}, Evil ${view.score.evil}`];
  if (quest) {
    const fails =
      quest.failsRequired > 1 ? `, ${quest.failsRequired} Fails to fail` : "";
    parts.push(`Quest ${view.questIndex + 1} needs ${quest.teamSize}${fails}`);
  }
  parts.push(`${view.rejections} of ${MAX_REJECTIONS} rejected`);
  return parts.join(" · ");
}

/** "Last: rejected 4 to 3", or "No team votes yet". */
export function historySummary(proposals: readonly ProposalRecord[]): string {
  const last = proposals.at(-1);
  if (!last) return "No team votes yet";
  const text = tallyOf(last).text;
  return `Last: ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}
