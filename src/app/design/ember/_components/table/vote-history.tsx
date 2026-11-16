import type { GameView, ProposalRecord } from "@/shared/views";
import { ArrowIcon, CheckIcon, CrossIcon } from "../art/icons";
import { listNames, nameOf, namesOf, questNumeral } from "../lib/names";
import { Frame, FrameTitle } from "../ui/frame";
import { tallyVotes } from "./tally";

function HistoryEntry({
  view,
  record,
}: {
  view: GameView;
  record: ProposalRecord;
}) {
  const tally = tallyVotes(record);
  return (
    <li className="py-3">
      <p className="flex items-baseline justify-between gap-2">
        <span className="ember-label text-ink">
          Quest {questNumeral(record.questIndex)}
        </span>
        <span
          className={`ember-label flex items-center gap-1 ${
            record.approved ? "text-success" : "text-fail"
          }`}
        >
          {record.approved ? <CheckIcon size={14} /> : <CrossIcon size={14} />}
          {tally.label}
        </span>
      </p>
      <p className="text-ink-muted text-[1.0625rem] leading-snug">
        {nameOf(view, record.leaderId)} proposed{" "}
        {listNames(namesOf(view, record.team))}
      </p>
      <ul className="mt-1.5 flex justify-between gap-1">
        {view.players.map((player) => {
          const approve = record.votes[player.id] === "approve";
          return (
            <li
              key={player.id}
              className={`ember-well flex min-w-8 flex-1 flex-col items-center py-1 ${
                approve ? "text-success" : "text-fail"
              }`}
            >
              <span className="sr-only">
                {player.name} {approve ? "approved" : "rejected"}
              </span>
              <span
                className="font-display text-ink text-sm leading-tight font-bold"
                aria-hidden="true"
              >
                {player.name.charAt(0)}
              </span>
              {approve ? <CheckIcon size={15} /> : <CrossIcon size={15} />}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function HistoryList({ view }: { view: GameView }) {
  if (view.proposals.length === 0) {
    return <p className="text-ink-muted">No team has been voted on yet.</p>;
  }
  return (
    <ol className="divide-y divide-(--frame-outer)">
      {[...view.proposals].reverse().map((record, index) => (
        <HistoryEntry key={index} view={view} record={record} />
      ))}
    </ol>
  );
}

/**
 * Every finished vote, newest first. A side panel on a wide screen; a
 * fold-out under the table on a phone.
 */
export function VoteHistory({
  view,
  className,
}: {
  view: GameView;
  className?: string;
}) {
  return (
    <div className={className}>
      <details className="group mx-4 mb-4 lg:hidden">
        <summary className="ember-well ember-label text-accent-strong flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 [&::-webkit-details-marker]:hidden">
          <span>Vote history ({view.proposals.length})</span>
          <ArrowIcon
            size={16}
            className="transition-transform duration-200 group-open:rotate-90"
          />
        </summary>
        <div className="px-1 pt-1">
          <HistoryList view={view} />
        </div>
      </details>

      <Frame
        aria-label="Vote history"
        className="hidden px-6 pt-6 pb-3 lg:block"
      >
        <FrameTitle aside={`${view.proposals.length} votes`}>
          Vote history
        </FrameTitle>
        <HistoryList view={view} />
      </Frame>
    </div>
  );
}
