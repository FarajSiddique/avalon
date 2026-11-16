"use client";

import { useHoldToReveal } from "@/client/use-hold-to-reveal";
import { designPaths } from "@/design/directions";
import type { Alignment } from "@/shared/roles";
import type { QuestCard, Vote } from "@/shared/views";
import { PixelIcon, PixelSprite } from "../pixel/pixel-sprite";
import { GRAIL, SKULL } from "../pixel/sprites";
import { ActionBar } from "../ui/action-bar";
import { Pips } from "../ui/pips";
import { GatedLink, PixelButton, PixelLink } from "../ui/pixel-button";

const paths = designPaths("lavender");

/** "2 of 3 chosen": the words, and the same count as pips. */
function CountLine({
  count,
  total,
  what,
  className,
}: {
  count: number;
  total: number;
  what: string;
  className: string;
}) {
  return (
    <p className="flex items-center justify-between gap-3" aria-live="polite">
      <span>
        {count} of {total} {what}
      </span>
      <Pips filled={count} total={total} className={className} />
    </p>
  );
}

/** Leader: how many are chosen, and the button that proposes the team. */
export function ProposeActions({
  chosen,
  teamSize,
}: {
  chosen: number;
  teamSize: number;
}) {
  return (
    <ActionBar>
      <CountLine
        count={chosen}
        total={teamSize}
        what="chosen"
        className="text-accent"
      />
      <GatedLink href={paths.table("vote")} enabled={chosen === teamSize}>
        Propose team
      </GatedLink>
    </ActionBar>
  );
}

/** Everyone: approve or reject. Once chosen, the vote is locked. */
export function VoteActions({
  vote,
  votedCount,
  playerCount,
  onVote,
  onUndo,
}: {
  vote: Vote | null;
  votedCount: number;
  playerCount: number;
  onVote: (vote: Vote) => void;
  onUndo: () => void;
}) {
  return (
    <ActionBar>
      <CountLine
        count={votedCount}
        total={playerCount}
        what="have voted"
        className="text-ink"
      />
      <p role="status" aria-live="polite" className={vote ? "" : "sr-only"}>
        {vote ? (
          <span className="flex items-center gap-3">
            <PixelIcon name="lock" className="text-accent-strong" />
            <span>
              Vote locked:{" "}
              <span
                className={vote === "approve" ? "text-success" : "text-fail"}
              >
                {vote === "approve" ? "Approve" : "Reject"}
              </span>
            </span>
          </span>
        ) : (
          ""
        )}
      </p>
      {vote ? (
        <>
          <PixelLink href={paths.table("reveal")} variant="primary">
            Continue
          </PixelLink>
          <button
            type="button"
            className="lv-link self-center"
            onClick={onUndo}
          >
            Prototype: take the vote back
          </button>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <PixelButton
            variant="approve"
            className="min-h-16"
            onClick={() => onVote("approve")}
          >
            <PixelIcon name="check" />
            Approve
          </PixelButton>
          <PixelButton
            variant="reject"
            className="min-h-16"
            onClick={() => onVote("reject")}
          >
            <PixelIcon name="cross" />
            Reject
          </PixelButton>
        </div>
      )}
    </ActionBar>
  );
}

export function RevealActions() {
  return (
    <ActionBar>
      <PixelLink href={paths.table("quest")} variant="primary">
        Continue to the quest
      </PixelLink>
    </ActionBar>
  );
}

/** While held, shows which card you played. Hidden again on release. */
function PlayedCardPeek({ card }: { card: QuestCard }) {
  const { revealed, holdProps } = useHoldToReveal();
  return (
    <button
      type="button"
      {...holdProps}
      className="lv-frame lv-card-back flex min-h-16 w-full cursor-pointer items-center justify-center gap-3 px-4 py-3 [--frame-color:var(--line-strong)] [--frame-drop:transparent]"
    >
      {revealed ? (
        <span className="bg-surface flex items-center gap-3 px-3 py-1">
          <PixelIcon
            name={card === "success" ? "check" : "cross"}
            className={card === "success" ? "text-success" : "text-fail"}
          />
          You played {card === "success" ? "Success" : "Fail"}
        </span>
      ) : (
        <span className="bg-surface flex items-center gap-3 px-3 py-1">
          <PixelIcon name="eye" className="text-accent-strong" />
          Hold to check your card
        </span>
      )}
    </button>
  );
}

/** One card in your hand: a picture and the word, as a button. */
function QuestChoice({
  card,
  disabled = false,
  onPlay,
}: {
  card: QuestCard;
  disabled?: boolean;
  onPlay: (card: QuestCard) => void;
}) {
  const success = card === "success";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPlay(card)}
      className={`lv-frame flex min-h-[72px] cursor-pointer items-center justify-center gap-3 bg-[var(--surface-raised)] px-2 py-3 active:translate-y-[var(--px)] active:[--frame-drop:transparent] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:[--frame-color:var(--line)] disabled:[--frame-drop:transparent] lg:min-h-[120px] lg:flex-col ${
        success
          ? "[--frame-color:var(--success)]"
          : "[--frame-color:var(--fail)]"
      }`}
    >
      <PixelSprite
        sprite={success ? GRAIL : SKULL}
        className={disabled ? "opacity-50" : ""}
      />
      <span
        className={`lv-label ${disabled ? "text-ink-muted" : success ? "text-success" : "text-fail"}`}
      >
        <span className="sr-only">Play </span>
        {success ? "Success" : "Fail"}
      </span>
    </button>
  );
}

/**
 * Team members: play Success or Fail. Good players cannot play Fail, so
 * that card is a real disabled button with the reason in words.
 */
export function QuestActions({
  card,
  alignment,
  playedCount,
  teamSize,
  onPlay,
  onUndo,
}: {
  card: QuestCard | null;
  alignment: Alignment;
  playedCount: number;
  teamSize: number;
  onPlay: (card: QuestCard) => void;
  onUndo: () => void;
}) {
  const canFail = alignment === "evil";
  return (
    <ActionBar>
      <CountLine
        count={playedCount}
        total={teamSize}
        what="have played"
        className="text-ink"
      />
      <p role="status" aria-live="polite" className={card ? "" : "sr-only"}>
        {card ? (
          <span className="flex items-center gap-3">
            <PixelIcon name="lock" className="text-accent-strong" />
            Card played and locked.
          </span>
        ) : (
          ""
        )}
      </p>
      {card ? (
        <>
          <PlayedCardPeek card={card} />
          <PixelLink href={paths.table("result")} variant="primary">
            Continue
          </PixelLink>
          <button
            type="button"
            className="lv-link self-center"
            onClick={onUndo}
          >
            Prototype: take the card back
          </button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <QuestChoice card="success" onPlay={onPlay} />
            <QuestChoice card="fail" onPlay={onPlay} disabled={!canFail} />
          </div>
          {canFail ? null : (
            <p className="lv-small text-ink-muted flex items-start gap-2">
              <PixelIcon name="shield" className="text-good mt-[2px]" />
              Good players can only play Success.
            </p>
          )}
        </>
      )}
    </ActionBar>
  );
}

export function ResultActions() {
  return (
    <ActionBar>
      <PixelLink href={paths.table("propose")} variant="primary">
        Next quest
      </PixelLink>
    </ActionBar>
  );
}
