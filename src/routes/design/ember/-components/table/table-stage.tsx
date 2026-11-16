import type { TableStep } from "@/design/directions";
import { tableViews } from "@/design/mock";
import { ProposeStep } from "./steps/propose-step";
import { QuestStep } from "./steps/quest-step";
import { ResultStep } from "./steps/result-step";
import { RevealStep } from "./steps/reveal-step";
import { VoteStep } from "./steps/vote-step";

/**
 * The live part of the table: the seats and the action area for one step.
 * It renders two siblings (the ring and the dock) that the page grid places.
 */
export function TableStage({ step }: { step: TableStep }) {
  const view = tableViews[step];
  switch (step) {
    case "propose":
      return <ProposeStep view={view} />;
    case "vote":
      return <VoteStep view={view} />;
    case "reveal":
      return <RevealStep view={view} />;
    case "quest":
      return <QuestStep view={view} />;
    case "result":
      return <ResultStep view={view} />;
  }
}
