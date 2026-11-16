import { designPaths } from "@/design/directions";
import { voteReveal } from "@/design/mock";
import type { GameView } from "@/shared/views";
import { CheckIcon, CrossIcon } from "../../art/icons";
import { WaxSeal } from "../../art/wax-seal";
import { listNames, namesOf, questNumeral } from "../../lib/names";
import { ButtonLink } from "../../ui/button";
import { Dock } from "../dock";
import { SeatRing, type SeatModel } from "../seat-ring";
import { tallyVotes } from "../tally";

const paths = designPaths("ember");

/** Every vote turns over at the same moment, on every seat. */
export function RevealStep({ view }: { view: GameView }) {
  const record = voteReveal;
  const tally = tallyVotes(record);

  const seats: SeatModel[] = view.players.map((player) => ({
    player,
    isYou: player.id === view.you.id,
    isLeader: player.id === record.leaderId,
    onTeam: record.team.includes(player.id),
    seal: record.votes[player.id] === "approve" ? "approve" : "reject",
  }));

  return (
    <>
      <SeatRing
        seats={seats}
        youId={view.you.id}
        centre={
          <p
            className={`ember-arrive flex flex-col items-center leading-none ${
              record.approved ? "text-success" : "text-fail"
            }`}
            aria-hidden="true"
          >
            <span className="font-display text-[1.375rem] font-bold lg:text-4xl">
              {record.approved
                ? `${tally.approve} to ${tally.reject}`
                : `${tally.reject} to ${tally.approve}`}
            </span>
            <span className="ember-label mt-1 text-[0.6875rem] tracking-[0.08em] lg:mt-2 lg:text-sm">
              {record.approved ? "Approved" : "Rejected"}
            </span>
          </p>
        }
      />
      <Dock
        label="The vote"
        kicker={`Quest ${questNumeral(record.questIndex)} · Votes revealed`}
        actions={<ButtonLink href={paths.table("quest")}>Continue</ButtonLink>}
      >
        <p
          role="status"
          className={`ember-carved flex items-center gap-2.5 text-[1.375rem] ${
            record.approved ? "text-success" : "text-fail"
          }`}
        >
          <WaxSeal tone={record.approved ? "laurel" : "wax"} size={30}>
            {record.approved ? (
              <CheckIcon size={18} />
            ) : (
              <CrossIcon size={18} />
            )}
          </WaxSeal>
          {tally.label}
        </p>
        <p className="mt-1">
          {record.approved
            ? `${listNames(namesOf(view, record.team))} go on the quest.`
            : "The crown passes to the next leader."}
        </p>
      </Dock>
    </>
  );
}
