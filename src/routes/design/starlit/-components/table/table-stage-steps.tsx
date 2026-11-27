import { useMemo, useState } from "react";
import { play } from "@/client/sound";
import type { TableStep } from "@/design/directions";
import {
  playerName,
  playerNames,
  questReveal,
  tableViews,
  voteReveal,
} from "@/design/mock";
import { useTeamDraft } from "@/design/use-team-draft";
import type { GameView, PlayerId, QuestCard, Vote } from "@/shared/views";
import {
  IconApprove,
  IconCrackedMoon,
  IconReject,
  IconStar,
  IconSun,
} from "@/components/ui/icons";
import { useReducedMotion } from "../use-reduced-motion";
import { seededRandom } from "@/components/art/seeded";
import { joinNames, numberWord } from "@/components/lobby/names";
import type { SeatMark } from "../stage/stage-tags";
import type { TablePlay, TablePlayer } from "@/components/three/types";
import { REVEAL_TIMELINE, RESULT_TIMELINE, ms } from "./result-timeline";
import {
  CARD,
  ContinueLink,
  Count,
  LockedNote,
  PlayedCards,
  pickWithSound,
  useOpeningCues,
  useTimeline,
} from "./step-parts";
import { cssVars } from "@/client/css-vars";
import { TableShell } from "./table-stage-shell";
import { tallyOf } from "./vote-history";

type Phase<Name extends GameView["phase"]["name"]> = Extract<
  GameView["phase"],
  { name: Name }
>;

interface StepProps {
  view: GameView;
  players: ReadonlyArray<TablePlayer>;
}

/** Leader and team marks for everyone; `status` adds the step's state. */
function marksFor(
  view: GameView,
  {
    leaderId = view.leaderId,
    teamIds,
    status,
  }: {
    leaderId?: PlayerId;
    teamIds: ReadonlyArray<PlayerId>;
    status?: (id: PlayerId) => SeatMark["status"];
  },
): Record<PlayerId, SeatMark> {
  return Object.fromEntries(
    view.players.map((p): [PlayerId, SeatMark] => [
      p.id,
      {
        leader: p.id === leaderId,
        chosen: teamIds.includes(p.id),
        status: status?.(p.id),
      },
    ]),
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl leading-tight font-medium">
      {children}
    </h2>
  );
}

/* ---------------------------------------------------------------- propose */

function ProposeStep({
  view,
  players,
  phase,
}: StepProps & { phase: Phase<"team_building"> }) {
  const draft = useTeamDraft(phase.teamSize, phase.draftIds);

  useOpeningCues([{ cue: "crown", at: 250 }]);
  const youLead = view.leaderId === view.you.id;
  const toggle = pickWithSound(draft, phase.teamSize);
  const { draftIds } = draft;
  const marks = marksFor(view, {
    teamIds: draftIds,
    status: (id) => (draftIds.includes(id) ? "chosen" : undefined),
  });
  const shown = useMemo<TablePlay>(
    () => ({
      shot: "table",
      leaderId: view.leaderId,
      teamIds: draftIds,
      cards: null,
      cardsShown: 0,
    }),
    [view.leaderId, draftIds],
  );
  const names = playerNames(view, draftIds);
  const leader = playerName(view, view.leaderId);

  return (
    <TableShell
      step="propose"
      view={view}
      players={players}
      play={shown}
      marks={marks}
      pickable={youLead}
      onPick={youLead ? toggle : undefined}
      peek={{
        title: youLead ? "Choose your team" : `${leader} is choosing`,
        state: `${draftIds.length} of ${phase.teamSize} chosen`,
        action:
          youLead && draft.complete ? (
            <ContinueLink to="vote" cue="propose">
              Propose this team
            </ContinueLink>
          ) : undefined,
      }}
      panel={
        <>
          <StepTitle>
            {youLead ? "Your team so far" : `${leader}'s team`}
          </StepTitle>
          <p className="mt-0.5 text-base leading-snug">
            {names.length > 0 ? `${joinNames(names)}.` : "Nobody yet."}{" "}
            <span className="text-ink-muted">
              {!youLead
                ? `${leader} picks ${numberWord(phase.teamSize)} players.`
                : draft.complete
                  ? "Tap someone again to take them off."
                  : "Tap a player or their name. You may choose yourself."}
            </span>
          </p>
          {youLead ? (
            <ul
              aria-label="Team"
              className="mt-2 flex flex-wrap gap-1.5"
              data-team-list=""
            >
              {view.players.map((p) => {
                const picked = draft.isPicked(p.id);

                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="sl-team-pick"
                      aria-pressed={picked}
                      onClick={() => toggle(p.id)}
                    >
                      {picked ? <IconStar size={14} /> : null}
                      {p.name}
                      {p.id === view.you.id ? (
                        <span className="sl-name-tag__you">You</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      }
      actions={
        youLead ? (
          <>
            <Count>
              <span
                key={draftIds.length}
                className="sl-pop sl-seq inline-block"
              >
                {draftIds.length}
              </span>{" "}
              of {phase.teamSize} chosen
            </Count>
            {draft.complete ? (
              <ContinueLink to="vote" cue="propose" wake>
                Propose this team
              </ContinueLink>
            ) : (
              <button
                type="button"
                className="sl-btn sl-btn--primary w-full"
                disabled
              >
                Propose this team
              </button>
            )}
          </>
        ) : (
          <Count>Waiting for {leader} to propose a team.</Count>
        )
      }
    />
  );
}

/* ------------------------------------------------------------------- vote */

function VoteStep({
  view,
  players,
  phase,
}: StepProps & { phase: Phase<"team_vote"> }) {
  const [vote, setVote] = useState<Vote | null>(phase.yourVote);
  const votedIds =
    vote && !phase.votedIds.includes(view.you.id)
      ? [...phase.votedIds, view.you.id]
      : phase.votedIds;
  // Only who has voted, never how.
  const marks = marksFor(view, {
    teamIds: phase.teamIds,
    status: (id) => (votedIds.includes(id) ? "voted" : "waiting"),
  });
  const shown = useMemo<TablePlay>(
    () => ({
      shot: "table",
      leaderId: view.leaderId,
      teamIds: phase.teamIds,
      cards: null,
      cardsShown: 0,
    }),
    [view.leaderId, phase.teamIds],
  );

  const cast = (choice: Vote) => {
    // One sound for both votes: a neighbour can hear the phone.
    play("vote-lock");
    setVote(choice);
  };

  const choices = (
    <div className="flex gap-3">
      <button
        type="button"
        className="sl-choice sl-choice--approve"
        onClick={() => cast("approve")}
      >
        <IconApprove size={28} />
        Approve
      </button>
      <button
        type="button"
        className="sl-choice sl-choice--reject"
        onClick={() => cast("reject")}
      >
        <IconReject size={28} />
        Reject
      </button>
    </div>
  );
  const votedLine = `${votedIds.length} of ${view.players.length} have voted`;

  return (
    <TableShell
      step="vote"
      view={view}
      players={players}
      play={shown}
      marks={marks}
      peek={{
        title: vote ? "You have voted" : "Vote on the team",
        state: votedLine,
        action: vote ? (
          <ContinueLink to="reveal">Continue</ContinueLink>
        ) : (
          choices
        ),
      }}
      panel={
        <>
          <StepTitle>The proposed team</StepTitle>
          <p className="font-display text-accent mt-0.5 text-xl font-medium">
            {joinNames(playerNames(view, phase.teamIds))}
          </p>
          <p className="text-ink-muted mt-1 text-base leading-snug">
            Votes stay hidden until everyone has voted, then all show at once.
          </p>
        </>
      }
      actions={
        <>
          <Count>{votedLine}</Count>
          {vote ? (
            <>
              <LockedNote>
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
              </LockedNote>
              <ContinueLink to="reveal">Continue</ContinueLink>
            </>
          ) : (
            choices
          )}
        </>
      }
    />
  );
}

/* ----------------------------------------------------------------- reveal */

/** The reveal's clock: when the votes turn. */
const REVEAL_MARKS = [REVEAL_TIMELINE.turn];

/** Before the turn, the table still reads as it did during the vote. */
const BEFORE_REVEAL = tableViews.vote;

function RevealStep({ view, players }: StepProps) {
  const still = useReducedMotion();
  // One clock for every tag: they all turn in the same render.
  const timeUp = useTimeline(REVEAL_MARKS, !still) >= REVEAL_TIMELINE.turn;
  const turned = still || timeUp;

  useOpeningCues([
    { cue: "suspense", at: 0 },
    { cue: "votes-turn", at: REVEAL_TIMELINE.turn },
    {
      cue: voteReveal.approved ? "approved" : "rejected",
      at: REVEAL_TIMELINE.tally,
    },
  ]);
  const tally = tallyOf(voteReveal);
  const marks = marksFor(view, {
    leaderId: voteReveal.leaderId,
    teamIds: voteReveal.team,
    status: (id) => (turned ? (voteReveal.votes[id] ?? "voted") : "voted"),
  });
  const shown = useMemo<TablePlay>(
    () => ({
      shot: "table",
      leaderId: voteReveal.leaderId,
      teamIds: voteReveal.team,
      cards: null,
      cardsShown: 0,
    }),
    [],
  );
  const by = (choice: Vote) =>
    joinNames(
      playerNames(
        view,
        view.players
          .filter((p) => voteReveal.votes[p.id] === choice)
          .map((p) => p.id),
      ),
    );

  return (
    <TableShell
      step="reveal"
      view={view}
      players={players}
      play={shown}
      marks={marks}
      quests={turned ? view : { ...view, rejections: BEFORE_REVEAL.rejections }}
      proposals={turned ? view.proposals : BEFORE_REVEAL.proposals}
      peek={{
        title: "The vote",
        state: turned ? tally.text : "The votes turn over together",
        action: <ContinueLink to="quest">Continue to the quest</ContinueLink>,
      }}
      panel={
        <>
          <StepTitle>
            The vote on {joinNames(playerNames(view, voteReveal.team))}
          </StepTitle>
          {turned ? (
            <ul className="mt-1 flex flex-col gap-0.5 text-base leading-snug">
              <li className="flex items-start gap-1.5">
                <IconApprove size={18} className="text-success mt-0.5" />
                <span>
                  <strong>Approve:</strong> {by("approve") || "nobody"}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <IconReject size={18} className="text-fail mt-0.5" />
                <span>
                  <strong>Reject:</strong> {by("reject") || "nobody"}
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-ink-muted mt-1 text-base leading-snug">
              Everyone has voted. The votes turn over together.
            </p>
          )}
        </>
      }
      actions={
        <>
          <div
            role="status"
            className="sl-rise sl-tally sl-seq flex flex-col items-center gap-0.5 text-center"
            style={cssVars({ "--at": ms(REVEAL_TIMELINE.tally) })}
          >
            <p
              className={`font-display flex items-center gap-2 text-[1.75rem] leading-tight font-medium ${voteReveal.approved ? "text-success" : "text-fail"}`}
            >
              {voteReveal.approved ? (
                <IconApprove size={30} />
              ) : (
                <IconReject size={30} />
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
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ quest */

function QuestStep({
  view,
  players,
  phase,
}: StepProps & { phase: Phase<"quest"> }) {
  // Only that a card was played is kept, never which one.
  const [played, setPlayed] = useState(phase.yourCard !== null);
  const [justPlayed, setJustPlayed] = useState(false);

  useOpeningCues([{ cue: "deal", at: 80 }]);

  const playCard = () => {
    // One sound for both cards: a neighbour can hear the phone.
    play("card-play");
    setPlayed(true);
    setJustPlayed(true);
  };

  const playedIds =
    played && !phase.playedIds.includes(view.you.id)
      ? [...phase.playedIds, view.you.id]
      : phase.playedIds;
  const marks = marksFor(view, {
    teamIds: phase.teamIds,
    status: (id) =>
      phase.teamIds.includes(id)
        ? playedIds.includes(id)
          ? "played"
          : "waiting"
        : undefined,
  });
  const shown = useMemo<TablePlay>(
    () => ({
      shot: "team",
      leaderId: view.leaderId,
      teamIds: phase.teamIds,
      cards: null,
      cardsShown: 0,
    }),
    [view.leaderId, phase.teamIds],
  );
  const mustSucceed = view.you.alignment === "good";

  return (
    <TableShell
      step="quest"
      view={view}
      players={players}
      play={shown}
      marks={marks}
      peek={{
        title: phase.onTeam ? "Play your card" : "The team is choosing",
        // The cards are too big for the peek: it asks to be pulled up.
        state:
          phase.onTeam && !played
            ? "Pull up to play yours"
            : `${playedIds.length} of ${phase.teamIds.length} have played`,
        action:
          phase.onTeam && !played ? undefined : (
            <ContinueLink to="result">Continue</ContinueLink>
          ),
      }}
      panel={
        <>
          <StepTitle>
            {phase.onTeam ? "Play your card in secret" : "The team is choosing"}
          </StepTitle>
          <p className="mt-0.5 text-base leading-snug">
            On the quest: {joinNames(playerNames(view, phase.teamIds))}.{" "}
            <span className="text-ink-muted">
              The cards are shuffled before they turn, so nobody learns whose
              was whose.
            </span>
          </p>
        </>
      }
      actions={
        <>
          <Count>
            {playedIds.length} of {phase.teamIds.length} have played
          </Count>
          {!phase.onTeam ? null : played ? (
            <>
              <div className="relative">
                <LockedNote at={justPlayed ? 520 : 0}>
                  Your card is played and locked.
                </LockedNote>
                {justPlayed && <PlayedCards />}
              </div>
              <ContinueLink to="result">Continue</ContinueLink>
            </>
          ) : (
            <div className="flex items-stretch gap-3">
              <button
                type="button"
                className="sl-card sl-card--small sl-card--success sl-deal sl-seq"
                onClick={playCard}
              >
                <IconSun size={30} />
                <span className="sl-card__title">Success</span>
              </button>
              <button
                type="button"
                className="sl-card sl-card--small sl-card--fail sl-deal sl-deal--2 sl-seq"
                disabled={mustSucceed}
                onClick={playCard}
              >
                <IconCrackedMoon size={30} />
                <span className="sl-card__title">Fail</span>
                {mustSucceed && (
                  <span className="text-[0.9375rem] leading-tight font-semibold">
                    Good players can only play Success
                  </span>
                )}
              </button>
            </div>
          )}
          {!phase.onTeam ? (
            <ContinueLink to="result">Continue</ContinueLink>
          ) : null}
        </>
      }
    />
  );
}

/* ----------------------------------------------------------------- result */

/**
 * The quest's cards in the order they lie on the table: shuffled with a
 * fixed seed (so every render and the server's picture agree), and never
 * in seat order. The scene, the words and the sounds all use this order.
 */
const RESULT_CARDS: ReadonlyArray<QuestCard> = (() => {
  const cards = [...questReveal.cards];
  const random = seededRandom(0x5e_ed + questReveal.questIndex);

  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = cards[i];
    const b = cards[j];

    if (a !== undefined && b !== undefined) {
      cards[i] = b;
      cards[j] = a;
    }
  }

  return cards;
})();

/** The result's clock: each card turning, the score, the crown. */
const RESULT_TURNS = RESULT_CARDS.map(
  (_, index) => RESULT_TIMELINE.turns[index] ?? 0,
);
const RESULT_MARKS = [
  ...RESULT_TURNS,
  RESULT_TIMELINE.score,
  RESULT_TIMELINE.crown,
];

/** Before the score settles, the closed Quests line still says the old score. */
const BEFORE_RESULT = tableViews.quest;

function ResultStep({ view, players }: StepProps) {
  const still = useReducedMotion();
  const timeline = RESULT_TIMELINE;
  const failed = questReveal.outcome === "fail";
  const fails = questReveal.failCount;
  const next = view.quests[view.questIndex];
  const [skipped, setSkipped] = useState(false);
  const done = still || skipped;

  const handles = useOpeningCues([
    { cue: "shuffle", at: timeline.shuffle },
    ...RESULT_CARDS.map((card, index) => ({
      cue: card === "fail" ? ("card-fail" as const) : ("card-success" as const),
      at: timeline.turns[index] ?? timeline.turns[0],
    })),
    { cue: failed ? "quest-fail" : "quest-success", at: timeline.outcome },
    { cue: "score", at: timeline.score },
    { cue: "crown-pass", at: timeline.crown },
  ]);

  // The cards turn one at a time, on the same clock as the sounds.
  const reached = useTimeline(RESULT_MARKS, !done);
  const shown = RESULT_TURNS.filter((at) => at <= reached).length;
  const scored = reached >= timeline.score;
  const crowned = reached >= timeline.crown;
  const cardsShown = done ? RESULT_CARDS.length : shown;
  const scoreIn = done || scored;
  const crownIn = done || crowned;

  // A tap anywhere skips to the end.
  const skip = () => {
    if (done || crownIn) {
      return;
    }

    handles.current.forEach((handle) => handle.stop());
    setSkipped(true);
  };

  const leaderId = crownIn ? view.leaderId : voteReveal.leaderId;
  const marks = marksFor(view, { leaderId, teamIds: questReveal.team });
  const scene = useMemo<TablePlay>(
    () => ({
      shot: "cards",
      leaderId,
      teamIds: questReveal.team,
      cards: RESULT_CARDS,
      cardsShown,
    }),
    [leaderId, cardsShown],
  );

  return (
    <TableShell
      step="result"
      view={view}
      players={players}
      play={scene}
      marks={marks}
      quests={
        scoreIn
          ? view
          : {
              score: BEFORE_RESULT.score,
              questIndex: BEFORE_RESULT.questIndex,
              quests: BEFORE_RESULT.quests,
              rejections: view.rejections,
            }
      }
      bumped={failed ? "evil" : "good"}
      settled={questReveal.questIndex}
      rootProps={{
        style: cssVars({
          "--settle-at": ms(timeline.outcome),
          "--score-at": ms(timeline.score),
        }),
        onPointerDown: skip,
        "data-skip": skipped,
      }}
      peek={{
        title: "The quest",
        state: scoreIn
          ? `${failed ? "Failed" : "Succeeded"}. Good ${view.score.good}, Evil ${view.score.evil}`
          : "The cards turn over",
        action: <ContinueLink to="propose">Next team proposal</ContinueLink>,
      }}
      panel={
        <>
          <ul
            className="flex flex-wrap gap-1.5"
            aria-label="The quest cards, shuffled"
          >
            {RESULT_CARDS.map((card, index) => {
              const face = CARD[card];
              const up = index < cardsShown;

              return (
                <li
                  key={index}
                  className={`sl-card-chip ${up ? face.className : ""}`}
                  data-face={up ? "up" : "down"}
                >
                  {up ? (
                    <>
                      <span className="text-[var(--choice)]">
                        <face.icon size={16} />
                      </span>
                      {face.label}
                    </>
                  ) : (
                    <>
                      <IconStar size={14} />
                      Face down
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <div
            className="sl-rise sl-seq"
            style={cssVars({ "--at": ms(timeline.outcome) })}
          >
            <p
              className={`font-display mt-2 flex items-center gap-2 text-[1.625rem] leading-tight font-medium ${failed ? "text-fail" : "text-success"}`}
            >
              {failed ? <IconCrackedMoon size={28} /> : <IconSun size={28} />}
              <span className="text-ink">
                {failed ? "Quest failed" : "Quest succeeded"}
              </span>
            </p>
            <p className="mt-0.5 text-base leading-snug">
              {fails === 0
                ? "No Fail cards were played."
                : `${fails} Fail ${fails === 1 ? "card was" : "cards were"} played.`}{" "}
              The score is Good {view.score.good}, Evil {view.score.evil}.
            </p>
          </div>
        </>
      }
      actions={
        <>
          {next && (
            <p
              className="bg-well border-line sl-rise sl-seq flex items-start gap-2 rounded-md border px-3 py-2 text-base leading-snug"
              style={cssVars({ "--at": ms(timeline.crown) })}
            >
              <IconStar size={18} className="text-accent mt-0.5 flex-none" />
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
          <ContinueLink to="propose">Next team proposal</ContinueLink>
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ steps */

export function TableStageStep({
  step,
  view,
  players,
}: StepProps & { step: TableStep }) {
  const { phase } = view;

  switch (step) {
    case "propose":
      return phase.name === "team_building" ? (
        <ProposeStep view={view} players={players} phase={phase} />
      ) : null;
    case "vote":
      return phase.name === "team_vote" ? (
        <VoteStep view={view} players={players} phase={phase} />
      ) : null;
    case "reveal":
      return <RevealStep view={view} players={players} />;
    case "quest":
      return phase.name === "quest" ? (
        <QuestStep view={view} players={players} phase={phase} />
      ) : null;
    case "result":
      return <ResultStep view={view} players={players} />;
  }
}
