"use client";

import { useState, type CSSProperties } from "react";
import { play } from "@/client/sound";
import { lobbyView, playerName } from "@/design/mock";
import type { LobbyView } from "@/shared/views";
import { CampScene } from "../art/camp-scene";
import { IconArrowRight, IconCheck, IconCopy, IconStar } from "../icons";
import { PlayerList } from "../lobby/player-list";
import { SkyCard } from "../role/sky-card";
import { TitleMark } from "../title-mark";
import { Cue, Moment } from "./moment";
import {
  IDS,
  LOBBY_NAMES,
  LobbySky,
  MiniSky,
  SceneLine,
  YOU,
} from "./scene-kit";
import { useBeats, type SceneProps } from "./use-beats";

/* ================================================================ landing */

function LivingSky(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 400, cue: "shooting-star" }]);
  return (
    <>
      <MiniSky />
      <CampScene className="absolute inset-0 h-full w-full" />
      {scene.run > 0 && beat >= 1 && <span className="sl-shoot-once" />}
    </>
  );
}

export function LivingSkyMoment() {
  return (
    <Moment
      title="The living sky"
      length={1600}
      stageClassName="h-[17rem] lg:h-[19rem]"
      notes={{
        moves: (
          <>
            One star in five twinkles, clouds drift, the fire breathes and its
            flames flicker, sparks rise, the pennant stirs. Play sends a
            shooting star across.
          </>
        ),
        timing: (
          <>
            Loops of 0.9 to 7.5s (clouds 110 and 160s), ease-in-out, opacity and
            transform only. The shooting star crosses in 1.1s, ease-out.
          </>
        ),
        sound: (
          <>
            <Cue>shooting-star</Cue>: a faint falling whistle. With the ambience
            switch on, the fire crackles under it.
          </>
        ),
        why: (
          <>
            Decoration, kept to the sky: slow and low in contrast so nothing
            competes with reading. It says the world is alive before anyone has
            done anything.
          </>
        ),
      }}
    >
      {(scene) => <LivingSky {...scene} />}
    </Moment>
  );
}

function TitleArrives(scene: SceneProps) {
  useBeats(scene, [{ at: 120, cue: "title" }]);
  return (
    <div className="sl-stage-title relative self-center px-5 py-6">
      <MiniSky />
      <div className="relative">
        <TitleMark as="p" />
        <p className="text-ink sl-rise sl-seq sl-title__lead mt-2 text-base leading-snug">
          Knights and traitors share one fire.
        </p>
      </div>
    </div>
  );
}

export function TitleMoment() {
  return (
    <Moment
      title="The title arriving"
      length={1500}
      notes={{
        moves: (
          <>
            The eyebrow rises, the word Avalon rises and fades in, the line
            under it follows, and a small star lights above the last letter,
            then keeps a slow twinkle.
          </>
        ),
        timing: (
          <>
            Eyebrow 250ms, word 900ms from 120ms, line at 360ms, form panel at
            520ms, star pops at 880ms (spring). All ease-out.
          </>
        ),
        sound: (
          <>
            <Cue>title</Cue>: three soft music-box notes rising, D, A, D. Only
            in the gallery: a first visit has had no tap yet, so the browser
            would not allow it.
          </>
        ),
        why: (
          <>
            The page reads in order: what it is, its name, what to do. Played on
            the real landing every time it opens.
          </>
        ),
      }}
    >
      {(scene) => <TitleArrives {...scene} />}
    </Moment>
  );
}

function ButtonPress(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 350, cue: "tap" }, { at: 520 }]);
  const pressed = scene.run > 0 && !scene.still && beat === 1;
  return (
    <div className="relative grid place-items-center px-6">
      <MiniSky />
      <button
        type="button"
        className="sl-btn sl-btn--primary relative w-full max-w-[20rem]"
        data-pressed={pressed}
        style={pressed ? { transform: "scale(0.98)" } : undefined}
        onClick={() => play("tap")}
      >
        <IconStar size={18} />
        Create a room
      </button>
    </div>
  );
}

export function ButtonMoment() {
  return (
    <Moment
      title="A button press"
      length={1100}
      stageClassName="min-h-[10rem]"
      notes={{
        moves: (
          <>
            The button sinks 2%. A ring of firelight tightens round it while it
            is held, then opens back out to the edge and fades as the finger
            lifts. Try it.
          </>
        ),
        timing: (
          <>
            Press 60ms. Release 450ms, ease-out. CSS only, on every primary
            button.
          </>
        ),
        sound: (
          <>
            <Cue>tap</Cue>: one small harp pluck (under 250ms). In the
            click-through it is used on Continue buttons only.
          </>
        ),
        why: (
          <>
            Instant proof the tap landed, which matters on a phone where the
            next screen may take a moment.
          </>
        ),
      }}
    >
      {(scene) => <ButtonPress {...scene} />}
    </Moment>
  );
}

/* ================================================================= lobby */

const JOIN_BEATS = [
  { at: 300, cue: "join" as const, index: 4 },
  { at: 800, cue: "join" as const, index: 5 },
  { at: 1300, cue: "join" as const, index: 6 },
];

function PlayerJoins(scene: SceneProps) {
  const beat = useBeats(scene, JOIN_BEATS);
  const joined = 4 + beat;
  return (
    <div className="relative grid content-center gap-2 px-3 py-3">
      <MiniSky />
      <LobbySky names={LOBBY_NAMES} joined={joined} />
      <SceneLine className="relative">
        <span key={joined} className="sl-pop sl-seq inline-block">
          {joined}
        </span>{" "}
        of 10 players
        {joined > 4 && (
          <span className="text-ink-muted font-semibold">
            {" "}
            · {LOBBY_NAMES[joined - 1]} joined
          </span>
        )}
      </SceneLine>
    </div>
  );
}

export function JoinMoment() {
  return (
    <Moment
      title="A player joins"
      length={2400}
      notes={{
        moves: (
          <>
            An empty dashed seat becomes a star: it scales up from nothing and
            one ring of light opens around it. The count ticks up.
          </>
        ),
        timing: <>420ms spring for the star, 640ms for the ring, ease-out.</>,
        sound: (
          <>
            <Cue>join</Cue>: one music-box note with a long tail. Each seat
            plays the next note of a D major chord (D, F#, A, then up an
            octave), so a full table builds the chord.
          </>
        ),
        why: (
          <>
            Everyone looking at the shared screen sees who just arrived, and
            hears the table filling up without looking.
          </>
        ),
      }}
    >
      {(scene) => <PlayerJoins {...scene} />}
    </Moment>
  );
}

const READY_SEATS = new Set<string>([IDS.wren, IDS.kay, IDS.tobias]);

const READY_BEATS = [
  { at: 300, cue: "ready" as const },
  { at: 1100, cue: "away" as const },
  { at: 2100, cue: "back" as const },
];

function ReadyAway(scene: SceneProps) {
  const beat = useBeats(scene, READY_BEATS);
  // The player can also press "I'm ready" in the scene.
  const [manual, setManual] = useState<boolean | null>(null);
  const youReady = manual ?? beat >= 1;
  const kayAway = beat === 2;
  const view: LobbyView = {
    ...lobbyView,
    players: lobbyView.players
      .filter((player) => READY_SEATS.has(player.id))
      .map((player) => {
        if (player.id === YOU) return { ...player, ready: youReady };
        if (player.id === IDS.kay)
          return { ...player, connected: !kayAway, ready: true };
        return player;
      }),
  };
  return (
    <div className="sl-stage-fit relative p-2">
      <PlayerList view={view} onToggleReady={() => setManual(!youReady)} />
    </div>
  );
}

export function ReadyMoment() {
  return (
    <Moment
      title="Ready, away and back"
      length={2700}
      stageClassName="min-h-[22rem]"
      notes={{
        moves: (
          <>
            A changed state pops in where the old one was: the dashed ring
            becomes a tick, Ready turns to Away (a crescent moon) and back. The
            button&apos;s icon pops too.
          </>
        ),
        timing: <>250ms spring (scale and fade).</>,
        sound: (
          <>
            <Cue>ready</Cue> (two notes up), <Cue>unready</Cue> (one low note),{" "}
            <Cue>away</Cue> (two notes falling to B), <Cue>back</Cue> (two notes
            rising to D).
          </>
        ),
        why: (
          <>
            The host can see at a glance why Start is not ready yet, and hears
            when someone drops out or returns.
          </>
        ),
      }}
    >
      {(scene) => <ReadyAway {...scene} />}
    </Moment>
  );
}

function CodeCopied(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 350, cue: "copy" }]);
  const copied = beat >= 1;
  const code = lobbyView.code;
  return (
    <div className="relative grid place-items-center p-3">
      <section className="sl-panel flex w-full max-w-[20rem] flex-col items-center gap-3 px-5 pt-4 pb-5 text-center">
        <p className="sl-eyebrow">Room code</p>
        <p
          className="sl-code font-display"
          aria-label={code.split("").join(" ")}
          data-wave={copied}
        >
          {code.split("").map((letter, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="sl-code__letter sl-seq"
              style={{ "--i": index } as CSSProperties}
            >
              {letter}
            </span>
          ))}
        </p>
        <span className="sl-btn sl-btn--ghost w-full max-w-[16rem]">
          {copied ? (
            <IconCheck size={18} className="sl-pop sl-seq" />
          ) : (
            <IconCopy size={18} />
          )}
          {copied ? "Copied" : "Copy code"}
        </span>
      </section>
    </div>
  );
}

export function CopyMoment() {
  return (
    <Moment
      title="The code copied"
      length={1200}
      stageClassName="min-h-[16rem]"
      notes={{
        moves: (
          <>
            A small wave runs through the four letters, left to right, and the
            copy icon pops into a tick.
          </>
        ),
        timing: <>440ms per letter, 55ms apart; tick 250ms spring.</>,
        sound: (
          <>
            <Cue>copy</Cue>: two bright music-box notes.
          </>
        ),
        why: (
          <>
            Copying has no visible result of its own. The wave ties
            &quot;Copied&quot; to the code itself.
          </>
        ),
      }}
    >
      {(scene) => <CodeCopied {...scene} />}
    </Moment>
  );
}

function EveryoneReady(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 300, cue: "all-ready" }]);
  const ready = beat >= 1;
  return (
    <div className="relative grid content-center gap-3 px-4 py-3">
      <MiniSky />
      <LobbySky names={LOBBY_NAMES} joined={7} linked={ready} />
      <div className="relative mx-auto flex w-full max-w-[22rem] flex-col gap-2.5">
        {ready ? (
          <>
            <p className="text-success sl-rise sl-seq flex items-center justify-center gap-2 text-base font-bold">
              <IconCheck size={18} />
              Everyone is here and ready.
            </p>
            <span className="sl-btn sl-btn--primary sl-wake sl-seq w-full">
              Start the game
              <IconArrowRight size={18} />
            </span>
          </>
        ) : (
          <>
            <SceneLine className="text-ink-muted">
              Waiting for {playerName(lobbyView, IDS.tobias)}.
            </SceneLine>
            <span
              className="sl-btn sl-btn--primary w-full"
              aria-disabled="true"
            >
              Start the game
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function EveryoneReadyMoment() {
  return (
    <Moment
      title="Everyone ready"
      length={1700}
      stageClassName="min-h-[22rem]"
      notes={{
        moves: (
          <>
            The stars link up round the ring one line after another and turn to
            firelight; the status line rises; Start wakes with one bloom of
            light. In the real lobby the stars by each name flare in turn.
          </>
        ),
        timing: (
          <>
            Lines 380ms each, 70ms apart (about 800ms in all); bloom 900ms;
            ease-out.
          </>
        ),
        sound: (
          <>
            <Cue>all-ready</Cue>: the chord rolled upward with a soft pad under
            it (1.8s).
          </>
        ),
        why: (
          <>
            The one moment the host is waiting for. The light runs to the button
            that is now theirs to press.
          </>
        ),
      }}
    >
      {(scene) => <EveryoneReady {...scene} />}
    </Moment>
  );
}

function GameStarts(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 250, cue: "start" }, { at: 400 }]);
  const started = beat >= 2;
  return (
    <div className="relative grid">
      <MiniSky />
      {!started ? (
        <div className="relative grid content-center gap-3 px-4 py-3">
          <LobbySky names={LOBBY_NAMES} joined={7} linked />
          <span
            className="sl-btn sl-btn--primary mx-auto w-full max-w-[22rem]"
            data-pressed={beat === 1}
          >
            Start the game
            <IconArrowRight size={18} />
          </span>
        </div>
      ) : (
        <div
          className="sl-arrive sl-seq relative p-3"
          style={{ "--skycard-height": "15rem" } as CSSProperties}
        >
          <SkyCard>
            <span className="text-ink block">Your role</span>
          </SkyCard>
        </div>
      )}
    </div>
  );
}

export function StartMoment() {
  return (
    <Moment
      title="The game starting"
      length={1400}
      stageClassName="min-h-[19rem]"
      notes={{
        moves: (
          <>
            Start is pressed, the lobby gives way, and the clouded role card
            rises into its place.
          </>
        ),
        timing: (
          <>
            Card rises 600ms, ease-out, after an 80ms beat. The swap itself is
            instant, so the next screen is never held up.
          </>
        ),
        sound: (
          <>
            <Cue>start</Cue>: a low pad swells under a breath of air, then a
            harp climbs four notes (2.4s). It carries across the change of
            screen.
          </>
        ),
        why: (
          <>
            Marks the line between gathering and playing, and points every eye
            at the private card.
          </>
        ),
      }}
    >
      {(scene) => <GameStarts {...scene} />}
    </Moment>
  );
}
