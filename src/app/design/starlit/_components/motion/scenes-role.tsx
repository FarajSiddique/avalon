"use client";

import type { CSSProperties } from "react";
import { ROLES } from "@/shared/roles";
import { AlignmentTag } from "../alignment-tag";
import { Constellation, constellationFor } from "../art/constellation";
import { IconArrowRight, IconCheck } from "../icons";
import { SkyCard } from "../role/sky-card";
import { Cue, Moment } from "./moment";
import { IDS, MiniSky, PLAYERS, SceneLine, YOU } from "./scene-kit";
import { useBeats, type SceneProps } from "./use-beats";

const MERLIN = constellationFor("merlin", "good");
const DAGGER = constellationFor("assassin", "evil");

/** What the gallery shows on the card: the figure, the name, the side. */
function CardFace() {
  return (
    <>
      <Constellation
        figure={MERLIN}
        color="var(--good)"
        className="h-[5.5rem] w-auto lg:h-[7rem]"
      />
      <span className="text-ink-muted block text-[0.8125rem] font-extrabold tracking-[0.14em] uppercase">
        {MERLIN.name}
      </span>
      <span className="font-display text-ink mt-1 block text-[2.25rem] leading-none font-medium">
        {ROLES.merlin.name}
      </span>
      <span className="mt-2.5 block">
        <AlignmentTag alignment="good" size="lg" />
      </span>
    </>
  );
}

const CARD_HEIGHT = { "--skycard-height": "19rem" } as CSSProperties;

/* ------------------------------------------------------------ the clouds */

function CloudsPart(scene: SceneProps) {
  // The card plays its own sound as it opens (clouds, then constellation).
  const beat = useBeats(scene, [{ at: 400 }]);
  // At rest the moment shows its end: the sky open.
  const open = beat >= 1;
  return (
    <div className="relative p-3" style={CARD_HEIGHT}>
      <SkyCard forceOpen={open}>
        <CardFace />
      </SkyCard>
    </div>
  );
}

export function CloudsPartMoment() {
  return (
    <Moment
      title="The clouds part"
      length={2600}
      stageClassName="min-h-[21rem]"
      notes={{
        moves: (
          <>
            Under a held finger the two banks of cloud slide apart and fade,
            their three layers at different speeds (near cloud furthest), the
            card&apos;s rim warms, and the role rises in. Hold the card yourself
            to try it.
          </>
        ),
        timing: (
          <>
            560ms ease-out; the fade starts a third of the way in, so you see
            the clouds move before they thin. Role rises 250ms after 90ms.
          </>
        ),
        sound: (
          <>
            <Cue>clouds-part</Cue> (a soft rising breath of air) then{" "}
            <Cue>constellation</Cue>. Both are identical for every role, so a
            neighbour hearing it learns nothing.
          </>
        ),
        why: (
          <>
            The reveal feels deliberate and private: you made the sky open, and
            it only stays open while you hold it.
          </>
        ),
      }}
    >
      {(scene) => <CloudsPart {...scene} />}
    </Moment>
  );
}

function ConstellationDraws(scene: SceneProps) {
  useBeats(scene, [{ at: 0, cue: "constellation" }]);
  return (
    <div className="relative grid grid-cols-2 place-items-center gap-2 p-4">
      <MiniSky />
      {[
        { figure: MERLIN, color: "var(--good)" },
        { figure: DAGGER, color: "var(--evil)" },
      ].map(({ figure, color }) => (
        <div key={figure.name} className="relative text-center">
          <Constellation
            figure={figure}
            color={color}
            className="h-[6.5rem] w-auto lg:h-[8.5rem]"
          />
          <span className="text-ink-muted mt-1 block text-[0.8125rem] font-extrabold tracking-[0.14em] uppercase">
            {figure.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ConstellationMoment() {
  return (
    <Moment
      title="The constellation draws itself"
      length={2100}
      notes={{
        moves: (
          <>
            The figure is traced line by line, each star lighting as a line
            reaches it; the brightest star comes last with its glow.
          </>
        ),
        timing: (
          <>
            Each line 240ms (SVG stroke), 120ms apart, from 160ms; stars 320ms
            spring; the bright star at the end (about 1.0 to 1.3s).
          </>
        ),
        sound: (
          <>
            <Cue>constellation</Cue>: five quiet chimes climbing with the lines,
            then one brighter note for the last star. The same tune for every
            figure.
          </>
        ),
        why: (
          <>
            Gives the secret a moment of weight, and draws the eye from the
            figure to the role name under it.
          </>
        ),
      }}
    >
      {(scene) => <ConstellationDraws {...scene} />}
    </Moment>
  );
}

function Release(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 700 }]);
  const open = scene.run > 0 && beat < 1;
  return (
    <div className="relative p-3" style={CARD_HEIGHT}>
      <SkyCard forceOpen={open}>
        <CardFace />
      </SkyCard>
    </div>
  );
}

export function ReleaseMoment() {
  return (
    <Moment
      title="Letting go"
      length={1200}
      stageClassName="min-h-[21rem]"
      notes={{
        moves: (
          <>
            The role disappears at once (it is removed from the page, not
            covered), then the clouds close over the sky.
          </>
        ),
        timing: (
          <>
            280ms ease-in: half the time of parting. Closing is the safe state,
            so it is quick.
          </>
        ),
        sound: (
          <>
            <Cue>clouds-close</Cue>: a short falling breath. If the
            constellation was still ringing it stops.
          </>
        ),
        why: (
          <>
            The secret is gone the instant the finger lifts, and the closing
            clouds confirm it.
          </>
        ),
      }}
    >
      {(scene) => <Release {...scene} />}
    </Moment>
  );
}

/* ----------------------------------------------------------- confirming */

const CONFIRMED_BEFORE = [IDS.mira, IDS.kay];

function ConfirmPips({
  confirmed,
  fresh = [],
}: {
  confirmed: readonly string[];
  fresh?: readonly string[];
}) {
  return (
    <span className="flex items-center gap-1.5" aria-hidden="true">
      {PLAYERS.map((player) => (
        <span
          key={`${player.id}-${confirmed.includes(player.id)}`}
          className={`sl-pip ${fresh.includes(player.id) ? "sl-pip--advance sl-seq" : ""}`}
          data-on={confirmed.includes(player.id)}
        />
      ))}
    </span>
  );
}

function Confirming(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 350, cue: "confirm" }, { at: 520 }]);
  const done = beat >= 1;
  const confirmed = done ? [...CONFIRMED_BEFORE, YOU] : CONFIRMED_BEFORE;
  return (
    <div className="relative grid content-center gap-3 px-4 py-4">
      <p className="flex items-center justify-between gap-3 text-base font-bold">
        <span>
          <span key={confirmed.length} className="sl-pop sl-seq inline-block">
            {confirmed.length}
          </span>{" "}
          of {PLAYERS.length} have confirmed
        </span>
        <ConfirmPips confirmed={confirmed} fresh={done ? [YOU] : []} />
      </p>
      <span className="sl-btn sl-btn--primary w-full" data-pressed={beat === 1}>
        I have seen my role
        <IconArrowRight size={18} />
      </span>
    </div>
  );
}

export function ConfirmMoment() {
  return (
    <Moment
      title="Confirming"
      length={1100}
      stageClassName="min-h-[10rem]"
      notes={{
        moves: (
          <>
            The button blooms, your pip turns from a ring into a four-point
            star, and the count pops up by one.
          </>
        ),
        timing: <>Pip 520ms spring with a quarter turn; count 250ms.</>,
        sound: (
          <>
            <Cue>confirm</Cue>: two warm harp notes, A then D.
          </>
        ),
        why: (
          <>
            You see your own mark join the others, so you know the table is
            waiting on the rest, not on you.
          </>
        ),
      }}
    >
      {(scene) => <Confirming {...scene} />}
    </Moment>
  );
}

const REST = [IDS.ansel, IDS.tobias, IDS.isolde, IDS.bram];
const ALL_CONFIRMED_BEATS = [
  ...REST.map((_, index) => ({
    at: 250 + index * 220,
    cue: "vote-in" as const,
    index,
  })),
  { at: 1250, cue: "all-confirmed" as const },
];

function EveryoneConfirmed(scene: SceneProps) {
  const beat = useBeats(scene, ALL_CONFIRMED_BEATS);
  const arrived = REST.slice(0, Math.min(beat, REST.length));
  const confirmed = [...CONFIRMED_BEFORE, YOU, ...arrived];
  const all = beat > REST.length;
  return (
    <div className="relative grid content-center gap-3 px-4 py-4">
      <p className="flex items-center justify-between gap-3 text-base font-bold">
        <span>
          {confirmed.length} of {PLAYERS.length} have confirmed
        </span>
        <span className={all ? "sl-allpips sl-seq" : ""}>
          <ConfirmPips confirmed={confirmed} fresh={arrived} />
        </span>
      </p>
      {all ? (
        <p className="text-success sl-rise sl-seq flex items-center justify-center gap-2 text-base font-bold">
          <IconCheck size={18} />
          Everyone has seen their role.
        </p>
      ) : (
        <SceneLine className="text-ink-muted">
          Waiting for the others.
        </SceneLine>
      )}
    </div>
  );
}

export function EveryoneConfirmedMoment() {
  return (
    <Moment
      title="Everyone confirmed"
      length={1900}
      stageClassName="min-h-[10rem]"
      notes={{
        moves: (
          <>
            The last pips light one by one, then the whole row swells once
            together and the line under it rises.
          </>
        ),
        timing: (
          <>
            Pips 220ms apart; the row swells 520ms; the line rises 250ms. About
            1.6s in all.
          </>
        ),
        sound: (
          <>
            <Cue>vote-in</Cue> ticks for each arrival, then{" "}
            <Cue>all-confirmed</Cue>, four chimes rolled upward.
          </>
        ),
        why: (
          <>
            Says the waiting is over and the first round is about to begin,
            without anyone having to ask.
          </>
        ),
      }}
    >
      {(scene) => <EveryoneConfirmed {...scene} />}
    </Moment>
  );
}
