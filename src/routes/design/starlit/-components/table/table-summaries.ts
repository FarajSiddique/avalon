import { MAX_REJECTIONS } from "@/shared/constants";
import type { GameView, ProposalRecord } from "@/shared/views";
import { tallyOf } from "./vote-history";

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
