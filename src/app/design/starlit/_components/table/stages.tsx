"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { designPaths, type TableStep } from "@/design/directions";
import {
  playerName,
  playerNames,
  questReveal,
  voteReveal,
} from "@/design/mock";
import { useTeamDraft } from "@/design/use-team-draft";
import type { GameView, PlayerId, QuestCard, Vote } from "@/shared/views";
import {
  IconApprove,
  IconArrowRight,
  IconCrackedMoon,
  IconLock,
  IconReject,
  IconStar,
  IconSun,
} from "../icons";
import { joinNames, numberWord } from "../names";
import { SeatRing, type SeatStatus } from "./seat-ring";
import { tallyOf } from "./vote-history";

const paths = designPaths("starlit");

type Phase<Name extends GameView["phase"]["name"]> = Extract<
  GameView["phase"],
  { name: Name }
>;

/* ----------------------------------------------------------- small pieces */

function Ring({ children }: { children: ReactNode }) {
  return (
    <section className="sl-table__ring sl-chart px-1 pt-3 pb-2 lg:px-4 lg:pb-1">
      {children}
    </section>
  );
}

/**
 * The step's own panel. `lead` moves it to the top on a phone, for steps
 * where it is the news (the quest result).
 */
function StepPanel({
  children,
  lead = false,
}: {
  children: ReactNode;
  lead?: boolean;
}) {
  return (
    <section
      className={`sl-table__step sl-panel p-4 lg:mx-auto lg:w-full lg:max-w-[40rem] lg:p-5 ${lead ? "sl-table__step--lead" : ""}`}
    >
      {children}
    </section>
  );
}

function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sl-bar">
      <div className="lg:border-line lg:bg-surface mx-auto flex w-full max-w-[40rem] flex-col gap-2.5 lg:rounded-lg lg:border lg:p-4">
        {children}
      </div>
    </div>
  );
}

function ContinueLink({
  to,
  children,
}: {
  to: TableStep;
  children: ReactNode;
}) {
  return (
    <Link href={paths.table(to)} className="sl-btn sl-btn--primary w-full">
      {children}
      <IconArrowRight size={18} />
    </Link>
  );
}

function Count({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-center text-base font-bold"
    >
      {children}
    </p>
  );
}

const CARD = {
  success: { label: "Success", icon: IconSun, className: "sl-card--success" },
  fail: { label: "Fail", icon: IconCrackedMoon, className: "sl-card--fail" },
} as const satisfies Record<QuestCard, unknown>;

/* ---------------------------------------------------------------- propose */

function ProposeStage({
  view,
  phase,
}: {
  view: GameView;
  phase: Phase<"team_building">;
}) {
  const draft = useTeamDraft(phase.teamSize, phase.draftIds);
  const status = Object.fromEntries(
    draft.draftIds.map((id): [PlayerId, SeatStatus] => [id, "chosen"]),
  );
  const names = playerNames(view, draft.draftIds);

  return (
    <>
      <Ring>
        <SeatRing
          label={`Seats. Choose ${phase.teamSize} players for the quest.`}
          players={view.players}
          youId={view.you.id}
          leaderId={view.leaderId}
          litIds={draft.draftIds}
          status={status}
          onToggle={draft.toggle}
        />
      </Ring>
      <StepPanel>
        <h2 className="font-display text-[1.375rem] font-medium">
          Your team so far
        </h2>
        <p className="mt-1 text-[1.0625rem] leading-snug">
          {names.length > 0 ? `${joinNames(names)}.` : "Nobody yet."}{" "}
          <span className="text-ink-muted">
            {draft.complete
              ? "Tap a lit star to take someone off."
              : "Tap a star to light it. You may choose yourself."}
          </span>
        </p>
      </StepPanel>
      <ActionBar>
        <Count>
          {draft.draftIds.length} of {phase.teamSize} chosen
        </Count>
        {draft.complete ? (
          <ContinueLink to="vote">Propose team</ContinueLink>
        ) : (
          <button
            type="button"
            className="sl-btn sl-btn--primary w-full"
            disabled
          >
            Propose team
          </button>
        )}
      </ActionBar>
    </>
  );
}

/* ------------------------------------------------------------------- vote */

function VoteStage({
  view,
  phase,
}: {
  view: GameView;
  phase: Phase<"team_vote">;
}) {
  const [vote, setVote] = useState<Vote | null>(phase.yourVote);
  const votedIds =
    vote && !phase.votedIds.includes(view.you.id)
      ? [...phase.votedIds, view.you.id]
      : phase.votedIds;
  const status = Object.fromEntries(
    view.players.map((player): [PlayerId, SeatStatus] => [
      player.id,
      votedIds.includes(player.id) ? "voted" : "waiting",
    ]),
  );

  return (
    <>
      <Ring>
        <SeatRing
          label="Seats. Lit stars are the proposed team."
          players={view.players}
          youId={view.you.id}
          leaderId={view.leaderId}
          litIds={phase.teamIds}
          status={status}
        />
      </Ring>
      <StepPanel>
        <div className="lg:flex lg:items-baseline lg:gap-3">
          <h2 className="font-display text-[1.375rem] font-medium">
            The proposed team
          </h2>
          <p className="font-display text-accent mt-0.5 text-2xl font-medium lg:mt-0">
            {joinNames(playerNames(view, phase.teamIds))}
          </p>
        </div>
        <p className="text-ink-muted mt-1.5 text-base leading-snug lg:mt-1">
          Votes stay hidden until everyone has voted, then all of them show at
          once.
        </p>
      </StepPanel>
      <ActionBar>
        <Count>
          {votedIds.length} of {view.players.length} have voted
        </Count>
        {vote ? (
          <>
            <p
              role="status"
              aria-live="polite"
              className="bg-well border-line flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-[1.0625rem] font-bold"
            >
              <IconLock size={20} className="text-accent" />
              Your vote is locked:
              <span
                className={`inline-flex items-center gap-1 ${vote === "approve" ? "text-success" : "text-fail"}`}
              >
                {vote === "approve" ? (
                  <IconApprove size={18} />
                ) : (
                  <IconReject size={18} />
                )}
                {vote === "approve" ? "Approve" : "Reject"}
              </span>
            </p>
            <ContinueLink to="reveal">Continue</ContinueLink>
          </>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              className="sl-choice sl-choice--approve"
              onClick={() => setVote("approve")}
            >
              <IconApprove size={28} />
              Approve
            </button>
            <button
              type="button"
              className="sl-choice sl-choice--reject"
              onClick={() => setVote("reject")}
            >
              <IconReject size={28} />
              Reject
            </button>
          </div>
        )}
      </ActionBar>
    </>
  );
}

/* ----------------------------------------------------------------- reveal */

function RevealStage({ view }: { view: GameView }) {
  const tally = tallyOf(voteReveal);
  const status = Object.fromEntries(
    Object.entries(voteReveal.votes).map(
      ([id, vote]): [PlayerId, SeatStatus] => [id, vote],
    ),
  );

  return (
    <>
      <Ring>
        <SeatRing
          label="Seats, with every player's vote."
          players={view.players}
          youId={view.you.id}
          leaderId={view.leaderId}
          litIds={voteReveal.team}
          status={status}
        />
      </Ring>
      <ActionBar>
        <div
          role="status"
          className="sl-rise flex flex-col items-center gap-1 text-center"
        >
          <p
            className={`font-display flex items-center gap-2.5 text-[2rem] leading-tight font-medium ${voteReveal.approved ? "text-success" : "text-fail"}`}
          >
            {voteReveal.approved ? (
              <IconApprove size={34} />
            ) : (
              <IconReject size={34} />
            )}
            <span className="text-ink">{tally.text}</span>
          </p>
          <p className="text-ink-muted text-base leading-snug">
            {voteReveal.approved
              ? `${joinNames(playerNames(view, voteReveal.team))} go on the quest.`
              : "The crown passes to the next leader."}
          </p>
        </div>
        <ContinueLink to="quest">Continue to the quest</ContinueLink>
      </ActionBar>
    </>
  );
}

/* ------------------------------------------------------------------ quest */

function QuestStage({
  view,
  phase,
}: {
  view: GameView;
  phase: Phase<"quest">;
}) {
  // Only that a card was played is kept, never which one.
  const [played, setPlayed] = useState(phase.yourCard !== null);
  const playedIds =
    played && !phase.playedIds.includes(view.you.id)
      ? [...phase.playedIds, view.you.id]
      : phase.playedIds;
  const status = Object.fromEntries(
    phase.teamIds.map((id): [PlayerId, SeatStatus] => [
      id,
      playedIds.includes(id) ? "played" : "choosing",
    ]),
  );
  const mustSucceed = view.you.alignment === "good";

  return (
    <>
      <Ring>
        <SeatRing
          label="Seats. Lit stars are on the quest."
          players={view.players}
          youId={view.you.id}
          leaderId={view.leaderId}
          litIds={phase.teamIds}
          status={status}
        />
      </Ring>
      <StepPanel>
        <h2 className="font-display text-[1.375rem] font-medium">
          {phase.onTeam ? "Play your card in secret" : "The team is choosing"}
        </h2>
        <p className="mt-1 text-[1.0625rem] leading-snug">
          The cards are shuffled before they are turned over, so nobody learns
          which card was yours.
        </p>
      </StepPanel>
      <ActionBar>
        <Count>
          {playedIds.length} of {phase.teamIds.length} have played
        </Count>
        {played ? (
          <>
            <p
              role="status"
              aria-live="polite"
              className="bg-well border-line flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-[1.0625rem] font-bold"
            >
              <IconLock size={20} className="text-accent" />
              Your card is played and locked.
            </p>
            <ContinueLink to="result">Continue</ContinueLink>
          </>
        ) : (
          <div className="flex items-stretch gap-3">
            <button
              type="button"
              className="sl-card sl-card--success"
              onClick={() => setPlayed(true)}
            >
              <IconSun size={34} />
              <span className="sl-card__title">Success</span>
            </button>
            <button
              type="button"
              className="sl-card sl-card--fail"
              disabled={mustSucceed}
              onClick={() => setPlayed(true)}
            >
              <IconCrackedMoon size={34} />
              <span className="sl-card__title">Fail</span>
              {mustSucceed && (
                <span className="text-base leading-tight font-semibold">
                  Good players can only play Success
                </span>
              )}
            </button>
          </div>
        )}
      </ActionBar>
    </>
  );
}

/* ----------------------------------------------------------------- result */

function ResultStage({ view }: { view: GameView }) {
  const failed = questReveal.outcome === "fail";
  const next = view.quests[view.questIndex];
  const fails = questReveal.failCount;

  return (
    <>
      <Ring>
        <SeatRing
          label="Seats. Lit stars went on the quest."
          players={view.players}
          youId={view.you.id}
          leaderId={view.leaderId}
          litIds={questReveal.team}
        />
      </Ring>
      <StepPanel lead>
        <div className="lg:flex lg:items-center lg:gap-6">
          <ul
            className="flex gap-2.5 lg:flex-[1.15]"
            aria-label="The quest cards, shuffled"
          >
            {questReveal.cards.map((card, index) => {
              const face = CARD[card];
              return (
                <li
                  key={index}
                  className={`sl-card sl-card--small sl-rise ${face.className} ${index === 1 ? "sl-rise--2" : ""} ${index === 2 ? "sl-rise--3" : ""}`}
                >
                  <face.icon size={30} />
                  <span className="sl-card__title">{face.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="lg:flex-1">
            <p
              className={`font-display mt-4 flex items-center justify-center gap-2.5 text-[2rem] leading-tight font-medium lg:mt-0 lg:justify-start ${failed ? "text-fail" : "text-success"}`}
            >
              {failed ? <IconCrackedMoon size={32} /> : <IconSun size={32} />}
              <span className="text-ink">
                {failed ? "Quest failed" : "Quest succeeded"}
              </span>
            </p>
            <p className="mt-1 text-center text-[1.0625rem] leading-snug lg:text-left">
              {fails === 0
                ? "No Fail cards were played."
                : `${fails} Fail ${fails === 1 ? "card was" : "cards were"} played.`}{" "}
              The score is Good {view.score.good}, Evil {view.score.evil}.
            </p>
          </div>
        </div>
        {next && (
          <p className="bg-well border-line mt-3 flex items-start gap-2.5 rounded-md border px-4 py-3 text-base leading-snug">
            <IconStar size={18} className="text-accent mt-0.5" />
            <span>
              <strong className="font-extrabold">
                {playerName(view, view.leaderId)} leads next.
              </strong>{" "}
              Quest {view.questIndex + 1} needs {next.teamSize} players
              {next.failsRequired === 2
                ? `, and it takes ${numberWord(next.failsRequired)} Fails to fail it.`
                : "."}
            </span>
          </p>
        )}
      </StepPanel>
      <ActionBar>
        <ContinueLink to="propose">Next team proposal</ContinueLink>
      </ActionBar>
    </>
  );
}

/* ------------------------------------------------------------------ stage */

/**
 * The interactive middle of the table for one step: the seat ring, the
 * step's panel and the action bar. They are siblings so the bar can stick
 * to the bottom of the screen on a phone.
 */
export function TableStage({
  step,
  view,
}: {
  step: TableStep;
  view: GameView;
}) {
  const { phase } = view;
  switch (step) {
    case "propose":
      return phase.name === "team_building" ? (
        <ProposeStage view={view} phase={phase} />
      ) : null;
    case "vote":
      return phase.name === "team_vote" ? (
        <VoteStage view={view} phase={phase} />
      ) : null;
    case "reveal":
      return <RevealStage view={view} />;
    case "quest":
      return phase.name === "quest" ? (
        <QuestStage view={view} phase={phase} />
      ) : null;
    case "result":
      return <ResultStage view={view} />;
  }
}
