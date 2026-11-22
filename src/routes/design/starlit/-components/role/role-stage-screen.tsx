import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ProtoLink as Link } from "@/design/proto-link";
import { designPaths, type RoleVariant } from "@/design/directions";
import { roleViews } from "@/design/mock";
import { ROLES } from "@/shared/roles";
import { IconArrowRight, IconCheck, IconEyeOff, IconHold } from "../icons";
import { SoundLink } from "../sound-link";
import { useGamePlayers, useGameView } from "../stage/game-players";
import {
  useStage,
  useStagePlay,
  useStagePlayers,
  useStageSlot,
} from "../stage/stage-context";
import { StageTags } from "../stage/stage-tags";
import type { TablePlay } from "../three/types";
import { RoleFace } from "./role-face";
import { SkyCard } from "./sky-card";

const paths = designPaths();

/** The longest the overlays wait for the camera to settle on your seat. */
const MAX_WAIT_MS = 2200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Whether the overlays may show. Arriving from another screen (the lobby or
 * the table), the camera is still moving to your seat: wait until it
 * settles, or a little over a move's length if it never says so. A direct
 * load, a failed stage and reduced motion show them at once.
 */
function useArrived(): boolean {
  const stage = useStage();
  const [moving] = useState(
    () =>
      stage.phase !== null && stage.phase !== "role" && !prefersReducedMotion(),
  );
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    if (!moving) {
      return;
    }

    const timer = window.setTimeout(() => setWaited(true), MAX_WAIT_MS);

    return () => window.clearTimeout(timer);
  }, [moving]);
  const settled = stage.phase === "role" || stage.status === "failed";

  return !moving || settled || waited;
}

/**
 * The role reveal at the Star Table: the camera sits low behind your seat
 * and the face-down sky card lies over the scene. Press and hold to read it
 * (the sky card and its hold). The scene never changes
 * while the card is held: what you know stays on the card.
 */
export function RoleStageScreen({ variant }: { variant: RoleVariant }) {
  const view = useGameView(roleViews[variant]);
  const focus = useRef<HTMLDivElement>(null);

  useStageSlot({ mode: "role", reveal: "whole", fade: 0 }, focus);
  const players = useGamePlayers(view);

  useStagePlayers(players);
  const play = useMemo<TablePlay>(
    () => ({
      shot: "role",
      leaderId: null,
      teamIds: [],
      cards: null,
      cardsShown: 0,
    }),
    [],
  );

  useStagePlay(play);

  const arrived = useArrived();
  const [seen, setSeen] = useState(false);
  const onHold = useCallback(() => setSeen(true), []);

  const confirmed =
    view.phase.name === "role_reveal" ? view.phase.confirmedIds : [];
  const other: RoleVariant = variant === "merlin" ? "assassin" : "merlin";
  // Hidden (not just transparent) until then, so nothing can be pressed.
  const shown = arrived ? "sl-overlay-in" : "invisible";
  const at = (ms: number) => ({ "--arrive-at": `${ms}ms` }) as CSSProperties;

  return (
    <main
      className="relative z-10 flex h-[calc(100dvh-2.75rem)] flex-col overflow-hidden"
      data-role-stage={arrived ? "arrived" : "waiting"}
    >
      <StageTags players={players} />

      {/* The table's place, fixed so a held card never reframes the scene. */}
      <div
        ref={focus}
        data-stage-slot="role"
        className="absolute inset-x-0 top-[7.5rem] bottom-[25rem] lg:top-56 lg:right-[28rem] lg:bottom-0"
      />

      <header
        className={`${shown} relative px-4 pt-4 lg:absolute lg:top-8 lg:left-8 lg:max-w-[30rem] lg:p-0`}
        style={at(0)}
      >
        <div className="sl-over-scene">
          {/* Clear of the sound toggle in the top corner on a phone. */}
          <p className="sl-eyebrow pr-32 lg:pr-0">For your eyes only</p>
          <h1 className="font-display mt-0.5 text-[1.75rem] leading-tight font-medium lg:text-5xl">
            Written in the stars
          </h1>
          <p className="text-ink mt-1.5 flex items-start gap-2 text-base leading-snug lg:mt-3 lg:text-lg">
            <IconEyeOff size={20} className="text-accent mt-0.5 shrink-0" />
            <span>
              <strong className="font-extrabold">
                Keep this screen to yourself.
              </strong>{" "}
              Look only when no one else can see.
            </span>
          </p>
        </div>
      </header>

      <section
        aria-label="Your role card"
        className={`${shown} absolute inset-x-0 bottom-0 flex flex-col [--skycard-height:260px] lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-6 lg:w-[26rem] lg:justify-end lg:[--skycard-height:480px]`}
        style={at(140)}
      >
        <div className="px-4 pb-3 lg:px-0">
          <SkyCard onHold={onHold}>
            <RoleFace view={view} />
          </SkyCard>
        </div>

        <div className="sl-panel flex flex-col gap-2.5 rounded-b-none border-b-0 px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] lg:rounded-b-[var(--corner-lg)] lg:border-b lg:px-5 lg:pb-5">
          <p className="flex items-center justify-between gap-3 text-base font-bold">
            <span>
              {confirmed.length} of {view.players.length} have confirmed
            </span>
            <span className="flex items-center gap-1.5" aria-hidden="true">
              {view.players.map((player) => (
                <span
                  key={player.id}
                  className="sl-pip"
                  data-on={confirmed.includes(player.id)}
                />
              ))}
            </span>
          </p>
          {seen ? (
            <SoundLink
              href={paths.table("propose")}
              cue="confirm"
              className="sl-btn sl-btn--primary w-full"
            >
              Continue to the table
              <IconArrowRight size={18} />
            </SoundLink>
          ) : (
            <button
              type="button"
              className="sl-btn sl-btn--primary w-full"
              disabled
              aria-describedby="role-continue-why"
            >
              Continue to the table
            </button>
          )}
          {/* Swapped, not removed, so the bar keeps its height under a finger. */}
          <p
            id="role-continue-why"
            className="text-ink-muted flex items-center gap-2 text-base leading-snug"
            aria-live="polite"
          >
            {seen ? (
              <>
                <IconCheck size={18} className="text-success shrink-0" />
                You have seen your role.
              </>
            ) : (
              <>
                <IconHold size={18} className="text-accent shrink-0" />
                Hold the card once to see your role first.
              </>
            )}
          </p>
          <Link href={paths.role(other)} className="sl-plain self-center">
            Prototype: show the {ROLES[roleViews[other].you.role].name} card
          </Link>
        </div>
      </section>
    </main>
  );
}
