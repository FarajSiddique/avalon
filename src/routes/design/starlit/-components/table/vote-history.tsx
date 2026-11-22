import { playerName, playerNames } from "@/design/mock";
import type { GameView, ProposalRecord } from "@/shared/views";
import { IconApprove, IconReject } from "../icons";
import { initialOf, joinNames } from "../names";

export function tallyOf(record: ProposalRecord): {
  approvals: number;
  rejections: number;
  text: string;
} {
  const votes = Object.values(record.votes);
  const approvals = votes.filter((vote) => vote === "approve").length;
  const rejections = votes.length - approvals;

  return {
    approvals,
    rejections,
    text: record.approved
      ? `Approved ${approvals} to ${rejections}`
      : `Rejected ${rejections} to ${approvals}`,
  };
}

/** Approved or Rejected with the count: a word, an icon and a colour. */
function TallyChip({ record }: { record: ProposalRecord }) {
  const Shape = record.approved ? IconApprove : IconReject;

  return (
    <span
      className={`sl-chip ${record.approved ? "text-success" : "text-fail"}`}
    >
      <Shape size={14} />
      {tallyOf(record).text}
    </span>
  );
}

/**
 * Every finished team vote, newest first, with how each player voted.
 * Sits inside a disclosure, which carries the heading.
 */
export function VoteHistory({ view }: { view: GameView }) {
  const attempts = new Map<number, number>();
  const records = view.proposals.map((record) => {
    const attempt = (attempts.get(record.questIndex) ?? 0) + 1;

    attempts.set(record.questIndex, attempt);

    return { record, attempt };
  });

  return (
    <section aria-label="Vote history">
      {records.length === 0 ? (
        <p className="text-ink-muted text-base">No team votes yet.</p>
      ) : (
        <ol className="mt-1" reversed>
          {[...records].reverse().map(({ record, attempt }) => (
            <li
              key={`${record.questIndex}-${attempt}`}
              className="border-line border-t border-dashed py-3 first:border-t-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <p className="text-base font-extrabold">
                  Quest {record.questIndex + 1}, vote {attempt}
                </p>
                <TallyChip record={record} />
              </div>
              <p className="text-ink-muted mt-1 text-base leading-snug">
                {playerName(view, record.leaderId)} proposed{" "}
                {joinNames(playerNames(view, record.team))}.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {view.players.map((player) => {
                  const approved = record.votes[player.id] === "approve";
                  const Shape = approved ? IconApprove : IconReject;

                  return (
                    <li
                      key={player.id}
                      className={`bg-well flex w-9 flex-col items-center gap-0.5 rounded-sm py-1 ${approved ? "text-success" : "text-fail"}`}
                    >
                      <span
                        aria-hidden="true"
                        className="text-ink text-[0.8125rem] leading-none font-extrabold"
                      >
                        {initialOf(player.name)}
                      </span>
                      <Shape size={16} />
                      <span className="sr-only">
                        {player.name} {approved ? "approved" : "rejected"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
