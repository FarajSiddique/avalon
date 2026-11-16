import type { ProposalRecord } from "@/shared/views";

/** "Approved 5 to 2" or "Rejected 4 to 3": the winning side's count first. */
export function tallyVotes(record: ProposalRecord): {
  approve: number;
  reject: number;
  label: string;
} {
  const votes = Object.values(record.votes);
  const approve = votes.filter((vote) => vote === "approve").length;
  const reject = votes.length - approve;
  return {
    approve,
    reject,
    label: record.approved
      ? `Approved ${approve} to ${reject}`
      : `Rejected ${reject} to ${approve}`,
  };
}
