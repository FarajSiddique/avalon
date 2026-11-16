import { TABLE_STEP_LABELS, type TableStep } from "@/design/directions";
import { tableViews } from "@/design/mock";
import { questNumeral } from "../lib/names";
import { Frame } from "../ui/frame";
import { FreshOnVisit } from "../ui/fresh-on-visit";
import { QuestTrack } from "./quest-track";
import { RejectionTrack } from "./rejection-track";
import { ScoreTally } from "./score-tally";
import { TableStage } from "./table-stage";
import { VoteHistory } from "./vote-history";

/**
 * The table at one step of a round.
 *
 * Phone: one column (progress, table, vote history) with the action area
 * fixed at the bottom. Wide screen: the table in the middle as a shared
 * view, the quests on the left, the vote history on the right.
 */
export function TableScreen({ step }: { step: TableStep }) {
  const view = tableViews[step];

  return (
    <main className="flex flex-1 flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-[100rem] lg:grid-cols-[20rem_minmax(0,1fr)_22rem] lg:grid-rows-[auto_auto] lg:content-start lg:items-start lg:gap-x-7 lg:gap-y-4 lg:px-7 lg:py-6">
      <Frame
        wideOnly
        aria-label="Quest progress"
        className="order-1 flex flex-col gap-2.5 px-4 pt-3 pb-1 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:gap-4 lg:px-6 lg:pt-6 lg:pb-5"
      >
        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch">
          <h1 className="min-w-0 leading-tight">
            <span className="ember-carved text-accent-strong block text-xl lg:text-2xl">
              Quest {questNumeral(view.questIndex)}
            </span>
            <span className="ember-label text-ink-muted block tracking-[0.1em] whitespace-nowrap lg:tracking-[0.16em]">
              {TABLE_STEP_LABELS[step]}
            </span>
          </h1>
          <ScoreTally score={view.score} className="shrink-0" />
        </div>
        <QuestTrack view={view} />
        <RejectionTrack rejections={view.rejections} />
      </Frame>

      <FreshOnVisit>
        <TableStage step={step} />
      </FreshOnVisit>

      <VoteHistory
        view={view}
        className="order-3 lg:col-start-3 lg:row-span-2 lg:row-start-1"
      />
    </main>
  );
}
