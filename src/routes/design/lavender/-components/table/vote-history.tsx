import { playerName, playerNames } from "@/design/mock";
import type { GameView, ProposalRecord } from "@/shared/views";
import { PixelIcon } from "../pixel/pixel-sprite";

function tally(proposal: ProposalRecord): { approve: number; reject: number } {
  const votes = Object.values(proposal.votes);
  const approve = votes.filter((vote) => vote === "approve").length;
  return { approve, reject: votes.length - approve };
}

export function tallyLine(proposal: ProposalRecord): string {
  const { approve, reject } = tally(proposal);
  return proposal.approved
    ? `Approved ${approve} to ${reject}`
    : `Rejected ${reject} to ${approve}`;
}

/** Every finished team vote, newest first, with each player's vote. */
export function VoteHistory({ view }: { view: GameView }) {
  if (view.proposals.length === 0) {
    return <p className="text-ink-muted px-5 py-4">No votes yet.</p>;
  }
  const newestFirst = [...view.proposals].reverse();
  return (
    <ol>
      {newestFirst.map((proposal, index) => (
        <li
          key={view.proposals.length - index}
          className="border-line flex flex-col gap-2 border-b-[length:var(--px)] px-4 py-4 last:border-b-0 lg:px-5"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="lv-label">Quest {proposal.questIndex + 1}</span>
            <span
              className={`flex items-center gap-2 ${proposal.approved ? "text-success" : "text-fail"}`}
            >
              <PixelIcon name={proposal.approved ? "check" : "cross"} />
              {tallyLine(proposal)}
            </span>
          </span>
          <span className="lv-small text-ink-muted">
            {playerName(view, proposal.leaderId)} chose{" "}
            <span className="text-ink">
              {playerNames(view, proposal.team).join(", ")}
            </span>
          </span>
          <span className="grid grid-cols-7 gap-1">
            {view.players.map((player) => {
              const vote = proposal.votes[player.id];
              return (
                <span
                  key={player.id}
                  className={`flex flex-col items-center gap-1 ${vote === "approve" ? "text-success" : "text-fail"}`}
                >
                  <PixelIcon name={vote === "approve" ? "check" : "cross"} />
                  <span aria-hidden className="lv-small text-ink-muted">
                    {player.name.slice(0, 2)}
                  </span>
                  <span className="sr-only">
                    {player.name}: {vote === "approve" ? "approve" : "reject"}.
                  </span>
                </span>
              );
            })}
          </span>
        </li>
      ))}
    </ol>
  );
}
