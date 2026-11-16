import { useState } from "react";
import { designPaths } from "@/design/directions";
import type { GameView, Vote } from "@/shared/views";
import { CheckIcon, CrossIcon, LockIcon } from "../../art/icons";
import { WaxSeal } from "../../art/wax-seal";
import { listNames, nameOf, namesOf, questNumeral } from "../../lib/names";
import { ButtonLink } from "../../ui/button";
import { Dock } from "../dock";
import { CentreCount, SeatRing, type SeatModel } from "../seat-ring";

const paths = designPaths("ember");

/**
 * Everyone votes on the proposed team. Who has voted is public; how they
 * voted is not, until every vote is in. Your own choice is not shown back
 * to you once it is locked, so a neighbour cannot read it off your screen.
 */
export function VoteStep({ view }: { view: GameView }) {
  const [yourVote, setYourVote] = useState<Vote | null>(null);
  const phase = view.phase.name === "team_vote" ? view.phase : null;
  const teamIds = phase?.teamIds ?? [];
  const votedIds = phase?.votedIds ?? [];
  const locked = yourVote !== null;
  const votedCount = votedIds.length + (locked ? 1 : 0);

  const seats: SeatModel[] = view.players.map((player) => {
    const isYou = player.id === view.you.id;
    const voted = votedIds.includes(player.id) || (isYou && locked);
    return {
      player,
      isYou,
      isLeader: player.id === view.leaderId,
      onTeam: teamIds.includes(player.id),
      seal: voted ? "voted" : undefined,
    };
  });

  return (
    <>
      <SeatRing
        seats={seats}
        youId={view.you.id}
        sealLabel="Has voted"
        centre={
          <CentreCount
            value={votedCount}
            total={view.players.length}
            label="voted"
          />
        }
      />
      <Dock
        label="Vote on the team"
        kicker={`Quest ${questNumeral(view.questIndex)} · Team vote`}
        wideActions={!locked}
        actions={
          locked ? (
            <ButtonLink href={paths.table("reveal")}>Continue</ButtonLink>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setYourVote("approve")}
                className="ember-btn ember-btn--vote ember-btn--approve"
              >
                <WaxSeal tone="laurel" size={34}>
                  <CheckIcon size={20} />
                </WaxSeal>
                Approve
              </button>
              <button
                type="button"
                onClick={() => setYourVote("reject")}
                className="ember-btn ember-btn--vote ember-btn--reject"
              >
                <WaxSeal size={34}>
                  <CrossIcon size={20} />
                </WaxSeal>
                Reject
              </button>
            </div>
          )
        }
      >
        <p>
          {nameOf(view, view.leaderId)} proposes{" "}
          <strong className="text-accent-strong font-semibold">
            {listNames(namesOf(view, teamIds))}
          </strong>
          .
        </p>
        <div role="status" aria-live="polite">
          {locked ? (
            <p className="ember-arrive text-ink flex items-start gap-2">
              <LockIcon size={20} className="text-accent-strong mt-0.5" />
              <span>
                <strong className="font-semibold">Vote locked.</strong> It lies
                sealed until all seven are in.{" "}
                <span className="text-ink-muted">
                  {votedCount} of {view.players.length} have voted.
                </span>
              </span>
            </p>
          ) : (
            <p className="text-ink-muted">
              {votedCount} of {view.players.length} have voted. All votes turn
              over together.
            </p>
          )}
        </div>
      </Dock>
    </>
  );
}
