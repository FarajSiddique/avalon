import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { play, type CueHandle, type CueName } from "@/client/sound";
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
import { SoundLink } from "../sound-link";
import { REVEAL_TIMELINE, RESULT_TIMELINE, ms } from "./result-timeline";
import { SeatRing, type SeatStatus } from "./seat-ring";
import { tallyOf } from "./vote-history";

const paths = designPaths("starlit");

type Phase<Name extends GameView["phase"]["name"]> = Extract<
  GameView["phase"],
  { name: Name }
>;

/* ----------------------------------------------------------- small pieces */

function Ring({
  children,
  timing,
}: {
  children: ReactNode;
  /** CSS custom properties that time the ring's motion. */
  timing?: Record<string, string>;
}) {
  return (
    <section
      className="sl-table__ring sl-chart px-1 pt-3 pb-2 lg:px-4 lg:pb-1"
      style={timing as CSSProperties | undefined}
    >
      {children}
    </section>
  );
}

/**
 * Play cues as a step opens, on the audio clock. They stop if the step is
 * left (Next hides the old page, which runs this clean-up) or skipped.
 */
function useOpeningCues(
  cues: readonly { cue: CueName; at: number }[],
): React.RefObject<CueHandle[]> {
  const handles = useRef<CueHandle[]>([]);
  useEffect(() => {
    handles.current = cues.map(({ cue, at }) =>
      play(cue, { delay: at / 1000 }),
    );
    return () => handles.current.forEach((handle) => handle.stop());
    // The cues are fixed for each step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return handles;
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
  cue = "tap",
  wake = false,
}: {
  to: TableStep;
  children: ReactNode;
  cue?: CueName;
  /** Bloom once as it appears: "you can go on now". */
  wake?: boolean;
}) {
  return (
    <SoundLink
      href={paths.table(to)}
      cue={cue}
      className={`sl-btn sl-btn--primary w-full ${wake ? "sl-wake sl-seq" : ""}`}
    >
      {children}
      <IconArrowRight size={18} />
    </SoundLink>
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

/** "Your vote is locked" and "Your card is played": the lock closes as it rises. */
export function LockedNote({
  children,
  at = 0,
}: {
  children: ReactNode;
  at?: number;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="bg-well border-line sl-rise sl-lock sl-seq flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-[1.0625rem] font-bold"
      style={{ "--at": ms(at) } as CSSProperties}
    >
      <IconLock size={20} className="text-accent" />
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
  useOpeningCues([{ cue: "crown", at: 250 }]);
  const toggle = (id: PlayerId) => {
    const count = draft.draftIds.length;
    if (draft.isPicked(id)) {
      play("unpick");
    } else if (count < phase.teamSize) {
      // Each pick is one note higher; the last one resolves into a chord.
      play("pick", { index: count });
      if (count + 1 === phase.teamSize) {
        play("team-complete", { delay: 0.2 });
      }
    }
    draft.toggle(id);
  };
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
          onToggle={toggle}
          crown="arrive"
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
          <span
            key={draft.draftIds.length}
            className="sl-pop sl-seq inline-block"
          >
            {draft.draftIds.length}
          </span>{" "}
          of {phase.teamSize} chosen
        </Count>
        {draft.complete ? (
          <ContinueLink to="vote" cue="propose" wake>
            Propose team
          </ContinueLink>
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
          <div className="flex gap-3">
            <button
              type="button"
              className="sl-choice sl-choice--approve"
              onClick={() => {
                // One sound for both votes: a neighbour can hear the phone.
                play("vote-lock");
                setVote("approve");
              }}
            >
              <IconApprove size={28} />
              Approve
            </button>
            <button
              type="button"
              className="sl-choice sl-choice--reject"
              onClick={() => {
                play("vote-lock");
                setVote("reject");
              }}
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
  // A held breath, every vote turning at once, then the verdict.
  useOpeningCues([
    { cue: "suspense", at: 0 },
    { cue: "votes-turn", at: REVEAL_TIMELINE.turn },
    {
      cue: voteReveal.approved ? "approved" : "rejected",
      at: REVEAL_TIMELINE.tally,
    },
  ]);
  const status = Object.fromEntries(
    Object.entries(voteReveal.votes).map(
      ([id, vote]): [PlayerId, SeatStatus] => [id, vote],
    ),
  );

  return (
    <>
      <Ring timing={{ "--turn-at": ms(REVEAL_TIMELINE.turn) }}>
        <SeatRing
          label="Seats, with every player's vote."
          players={view.players}
          youId={view.you.id}
          leaderId={view.leaderId}
          litIds={voteReveal.team}
          status={status}
          turnFrom="voted"
        />
      </Ring>
      <ActionBar>
        <div
          role="status"
          className="sl-rise sl-tally sl-seq flex flex-col items-center gap-1 text-center"
          style={{ "--at": ms(REVEAL_TIMELINE.tally) } as CSSProperties}
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

/**
 * The moment after playing: both cards turn face down together, slide into
 * one, and that one card goes up to the fire. Both cards do the same thing,
 * so the motion does not say which was played. Decorative only.
 */
export function PlayedCards() {
  return (
    <span className="sl-cardfly" aria-hidden="true">
      <span className="sl-cardfly__card sl-cardfly__card--left sl-seq">
        <IconStar size={30} />
      </span>
      <span className="sl-cardfly__card sl-cardfly__card--right sl-seq">
        <IconStar size={30} />
      </span>
    </span>
  );
}

function QuestStage({
  view,
  phase,
}: {
  view: GameView;
  phase: Phase<"quest">;
}) {
  // Only that a card was played is kept, never which one.
  const [played, setPlayed] = useState(phase.yourCard !== null);
  // True only when the card was played here, so the hand-off animates.
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
              className="sl-card sl-card--success sl-deal sl-seq"
              onClick={playCard}
            >
              <IconSun size={34} />
              <span className="sl-card__title">Success</span>
            </button>
            <button
              type="button"
              className="sl-card sl-card--fail sl-deal sl-deal--2 sl-seq"
              disabled={mustSucceed}
              onClick={playCard}
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

/**
 * The quest's cards, already shuffled by the server. They arrive face down,
 * slide over each other, and turn one at a time on RESULT_TIMELINE; the
 * last one lifts and waits before it turns (the held breath). At rest they
 * are simply the three faces.
 */
export function QuestDeck({
  cards,
  listRef,
}: {
  cards: readonly QuestCard[];
  listRef?: React.Ref<HTMLUListElement>;
}) {
  const timeline = RESULT_TIMELINE;
  return (
    <ul
      ref={listRef}
      className="sl-deck flex gap-2.5 lg:flex-[1.15]"
      aria-label="The quest cards, shuffled"
    >
      {cards.map((card, index) => {
        const face = CARD[card];
        const last = index === cards.length - 1;
        return (
          <li
            key={index}
            className={`sl-card sl-card--small sl-qcard sl-seq ${face.className} ${last ? "sl-qcard--last" : ""}`}
            style={
              {
                "--turn-at": ms(timeline.turns[index] ?? 0),
                "--breath-at": ms(timeline.breath),
              } as CSSProperties
            }
          >
            <span className="sl-qcard__face sl-seq">
              <face.icon size={30} />
              <span className="sl-card__title">{face.label}</span>
            </span>
            <span className="sl-qcard__back sl-seq" aria-hidden="true">
              <IconStar size={26} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Skip a long opening sequence with one tap anywhere on the table: every
 * animation jumps to its end and the cues still to come are cancelled.
 */
function useTapToSkip(
  anchor: React.RefObject<HTMLElement | null>,
  handles: React.RefObject<CueHandle[]>,
  lasts: number,
): void {
  useEffect(() => {
    const table = anchor.current?.closest<HTMLElement>(".sl-table");
    if (!table) return;
    const skip = () => {
      table.dataset.skip = "true";
      handles.current.forEach((handle) => handle.stop());
    };
    table.addEventListener("pointerdown", skip, { once: true });
    const done = window.setTimeout(
      () => table.removeEventListener("pointerdown", skip),
      lasts,
    );
    return () => {
      window.clearTimeout(done);
      table.removeEventListener("pointerdown", skip);
      delete table.dataset.skip;
    };
  }, [anchor, handles, lasts]);
}

function ResultStage({ view }: { view: GameView }) {
  const failed = questReveal.outcome === "fail";
  const next = view.quests[view.questIndex];
  const fails = questReveal.failCount;
  const timeline = RESULT_TIMELINE;
  const cards = useRef<HTMLUListElement>(null);
  const handles = useOpeningCues([
    { cue: "shuffle", at: timeline.shuffle },
    ...questReveal.cards.map((card, index) => ({
      cue: card === "fail" ? ("card-fail" as const) : ("card-success" as const),
      at: timeline.turns[index] ?? timeline.turns[0],
    })),
    { cue: failed ? "quest-fail" : "quest-success", at: timeline.outcome },
    { cue: "score", at: timeline.score },
    { cue: "crown-pass", at: timeline.crown },
  ]);
  useTapToSkip(cards, handles, timeline.end);

  return (
    <>
      <Ring timing={{ "--crown-at": ms(timeline.crown) }}>
        <SeatRing
          label="Seats. Lit stars went on the quest."
          players={view.players}
          youId={view.you.id}
          leaderId={view.leaderId}
          litIds={questReveal.team}
          crown={voteReveal.leaderId}
        />
      </Ring>
      <StepPanel lead>
        <div className="lg:flex lg:items-center lg:gap-6">
          <QuestDeck cards={questReveal.cards} listRef={cards} />
          <div
            className="sl-rise sl-seq lg:flex-1"
            style={{ "--at": ms(timeline.outcome) } as CSSProperties}
          >
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
          <p
            className="bg-well border-line sl-rise sl-seq mt-3 flex items-start gap-2.5 rounded-md border px-4 py-3 text-base leading-snug"
            style={{ "--at": ms(timeline.crown) } as CSSProperties}
          >
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
