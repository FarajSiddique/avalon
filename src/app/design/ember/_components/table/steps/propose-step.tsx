"use client";

import { designPaths } from "@/design/directions";
import { useTeamDraft } from "@/design/use-team-draft";
import type { GameView } from "@/shared/views";
import { listNames, namesOf, questNumeral } from "../../lib/names";
import { Button, ButtonLink } from "../../ui/button";
import { Dock } from "../dock";
import { CentreCount, SeatRing, type SeatModel } from "../seat-ring";

const paths = designPaths("ember");

/** You are the leader: tap seats to build the team, then propose it. */
export function ProposeStep({ view }: { view: GameView }) {
  const teamSize =
    view.phase.name === "team_building" ? view.phase.teamSize : 0;
  const initial =
    view.phase.name === "team_building" ? view.phase.draftIds : [];
  const draft = useTeamDraft(teamSize, initial);
  const chosen = draft.draftIds.length;

  const seats: SeatModel[] = view.players.map((player) => ({
    player,
    isYou: player.id === view.you.id,
    isLeader: player.id === view.leaderId,
    onTeam: draft.isPicked(player.id),
    onToggle: () => draft.toggle(player.id),
  }));

  return (
    <>
      <SeatRing
        seats={seats}
        youId={view.you.id}
        centre={<CentreCount value={chosen} total={teamSize} label="chosen" />}
      />
      <Dock
        label="Propose a team"
        kicker={`Quest ${questNumeral(view.questIndex)} · You lead`}
        actions={
          draft.complete ? (
            <ButtonLink href={paths.table("vote")} className="ember-pulse">
              Propose team
            </ButtonLink>
          ) : (
            <Button disabled>Propose team</Button>
          )
        }
      >
        <p>
          Tap seats to choose {teamSize} for the quest. You may choose yourself.
        </p>
        <p role="status" aria-live="polite" className="text-ink-muted">
          <strong className="text-ink font-semibold">
            {chosen} of {teamSize} chosen
          </strong>
          {chosen > 0 ? `: ${listNames(namesOf(view, draft.draftIds))}.` : "."}
        </p>
      </Dock>
    </>
  );
}
