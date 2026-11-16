import { useId, useState } from "react";
import { designPaths } from "@/design/directions";
import type { GameView, QuestCard } from "@/shared/views";
import { BrokenBladeIcon, GrailIcon, LockIcon } from "../../art/icons";
import { questNumeral } from "../../lib/names";
import { ButtonLink } from "../../ui/button";
import { Dock } from "../dock";
import { CentreCount, SeatRing, type SeatModel } from "../seat-ring";

const paths = designPaths("ember");

/**
 * You are on the quest: play Success or Fail. Good players can only play
 * Success. Once played, the card is locked and never shown again.
 */
export function QuestStep({ view }: { view: GameView }) {
  const [yourCard, setYourCard] = useState<QuestCard | null>(null);
  const ruleId = useId();
  const phase = view.phase.name === "quest" ? view.phase : null;
  const teamIds = phase?.teamIds ?? [];
  const playedIds = phase?.playedIds ?? [];
  const locked = yourCard !== null;
  const playedCount = playedIds.length + (locked ? 1 : 0);
  const mustSucceed = view.you.alignment === "good";

  const seats: SeatModel[] = view.players.map((player) => {
    const isYou = player.id === view.you.id;
    const played = playedIds.includes(player.id) || (isYou && locked);
    return {
      player,
      isYou,
      isLeader: player.id === view.leaderId,
      onTeam: teamIds.includes(player.id),
      seal: played ? "played" : undefined,
    };
  });

  return (
    <>
      <SeatRing
        seats={seats}
        youId={view.you.id}
        sealLabel="Has played"
        centre={
          <CentreCount
            value={playedCount}
            total={teamIds.length}
            label="played"
          />
        }
      />
      <Dock
        label="Play a quest card"
        kicker={`Quest ${questNumeral(view.questIndex)} · Your card`}
        wideActions={!locked}
        actions={
          locked ? (
            <ButtonLink href={paths.table("result")}>Continue</ButtonLink>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setYourCard("success")}
                  className="ember-parchment ember-questcard ember-questcard--success"
                >
                  <GrailIcon size={38} />
                  Success
                </button>
                <button
                  type="button"
                  disabled={mustSucceed}
                  aria-describedby={mustSucceed ? ruleId : undefined}
                  onClick={() => setYourCard("fail")}
                  className={`ember-parchment ember-questcard ember-questcard--fail ${
                    mustSucceed ? "ember-questcard--barred" : ""
                  }`}
                >
                  <BrokenBladeIcon size={38} />
                  Fail
                </button>
              </div>
              {mustSucceed ? (
                <p
                  id={ruleId}
                  className="text-ink flex items-center justify-end gap-1.5 text-[1.0625rem]"
                >
                  <LockIcon size={16} className="text-ink-muted" />
                  Good players can only play Success
                </p>
              ) : null}
            </>
          )
        }
      >
        <div role="status" aria-live="polite">
          {locked ? (
            <p className="ember-arrive text-ink flex items-start gap-2">
              <LockIcon size={20} className="text-accent-strong mt-0.5" />
              <span>
                <strong className="font-semibold">Card locked.</strong> It lies
                face down with the others.{" "}
                <span className="text-ink-muted">
                  {playedCount} of {teamIds.length} have played.
                </span>
              </span>
            </p>
          ) : (
            <p>
              You are on the quest. Play one card. They are shuffled before they
              turn, so nobody learns which was yours.{" "}
              <span className="text-ink-muted">
                {playedCount} of {teamIds.length} have played.
              </span>
            </p>
          )}
        </div>
      </Dock>
    </>
  );
}
