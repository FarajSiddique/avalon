"use client";

import type { CSSProperties } from "react";
import type { SeatView } from "@/shared/views";
import { makeStars, sparklePath } from "../art/seeded";
import { IconCheck, IconDagger, IconShield, IconStar } from "../icons";
import { seatLayout } from "../table/seat-layout";
import { Cue, Moment } from "./moment";
import { IDS, PLAYERS, RingScene, SceneLine } from "./scene-kit";
import { useBeats, type SceneProps } from "./use-beats";

/* -------------------------------------------------------- the assassin */

/** Good players the Assassin looks over, ending on Merlin (Wren). */
const AIM = [IDS.ansel, IDS.isolde, IDS.mira, IDS.wren];

function markAt(id: string): CSSProperties {
  const index = PLAYERS.findIndex((player) => player.id === id);
  const point = seatLayout(PLAYERS.length)[index];
  if (!point) return {};
  return {
    "--x-m": point.mx,
    "--y-m": point.my,
    "--x-d": point.dx,
    "--y-d": point.dy,
  } as CSSProperties;
}

function AssassinChooses(scene: SceneProps) {
  const beat = useBeats(scene, [
    { at: 250, cue: "assassin-aim" },
    { at: 700, cue: "assassin-aim" },
    { at: 1150, cue: "assassin-aim" },
    { at: 1700, cue: "assassin-strike" },
  ]);
  const target = AIM[Math.max(0, beat - 1)] ?? IDS.wren;
  const struck = beat >= AIM.length;
  return (
    <div className="grid content-center">
      <RingScene leaderId={IDS.tobias} label="Seats. Tobias is choosing.">
        <div className="sl-markfield sl-markfield--ring">
          <span
            className="sl-mark"
            data-struck={struck}
            style={markAt(target)}
          />
        </div>
      </RingScene>
      {struck ? (
        <SceneLine at={250} className="px-4 pb-4">
          <span className="text-evil inline-flex items-center gap-1.5">
            <IconDagger size={18} />
            Tobias names Wren as Merlin.
          </span>
        </SceneLine>
      ) : (
        <SceneLine className="text-ink-muted px-4 pb-4">
          The Assassin is choosing.
        </SceneLine>
      )}
    </div>
  );
}

export function AssassinMoment() {
  return (
    <Moment
      title="The Assassin choosing"
      length={2300}
      stageClassName="min-h-[22rem]"
      notes={{
        moves: (
          <>
            A dashed coral ring, turning slowly, moves from one Good seat to the
            next as the Assassin considers them, then snaps solid and tightens
            on the one they name.
          </>
        ),
        timing: (
          <>
            Each move 320ms ease-out, about every 450ms; the strike is a 420ms
            spring. 1.7s to the choice.
          </>
        ),
        sound: (
          <>
            <Cue>assassin-aim</Cue> (a low muted pluck) per move, then{" "}
            <Cue>assassin-strike</Cue>: a swish, a dark note and a low knock.
          </>
        ),
        why: (
          <>
            The whole table watches one decision. Showing the hesitation makes
            the last moment of the game a shared one.
          </>
        ),
      }}
    >
      {(scene) => <AssassinChooses {...scene} />}
    </Moment>
  );
}

/* ------------------------------------------------------------- the end */

const END_STARS = makeStars({
  count: 70,
  seed: 314,
  width: 600,
  height: 300,
  topBias: 1,
  twinkleEvery: 99,
});

function EndSky({ order }: { order: "out" | "fade" }) {
  return (
    <svg
      viewBox="0 0 600 300"
      preserveAspectRatio="xMidYMid slice"
      className="sl-minisky"
      aria-hidden="true"
      focusable="false"
    >
      {END_STARS.map((star, index) => (
        <g key={index} transform={`translate(${star.x} ${star.y})`}>
          {star.sparkle ? (
            <path
              className="sl-endstar sl-seq"
              d={sparklePath(star.r)}
              fill="var(--art-star)"
              style={
                {
                  "--at": `${order === "out" ? 200 + index * 14 : 200}ms`,
                } as CSSProperties
              }
            />
          ) : (
            <circle
              className="sl-endstar sl-seq"
              r={star.r}
              fill="var(--art-star)"
              style={
                {
                  "--at": `${order === "out" ? 200 + index * 14 : 200}ms`,
                } as CSSProperties
              }
            />
          )}
        </g>
      ))}
    </svg>
  );
}

const FALLING = [
  { left: "18%", at: 500 },
  { left: "41%", at: 850 },
  { left: "63%", at: 650 },
  { left: "82%", at: 1100 },
  { left: "30%", at: 1350 },
];

function GoodWins(scene: SceneProps) {
  useBeats(scene, [{ at: 0, cue: "good-wins" }]);
  return (
    <div className="sl-dawnlit relative grid place-items-center overflow-hidden px-4 py-6">
      <EndSky order="fade" />
      <span className="sl-dawn sl-seq" />
      {FALLING.map((star) => (
        <span
          key={star.left}
          className="sl-fallstar sl-seq"
          style={{ left: star.left, "--at": `${star.at}ms` } as CSSProperties}
        />
      ))}
      <div className="sl-endtitle sl-seq relative text-center">
        <p className="text-good inline-flex items-center gap-2 text-base font-extrabold">
          <IconShield size={20} />
          Good
        </p>
        <p className="font-display text-ink text-[2.25rem] leading-tight font-medium">
          Good prevails
        </p>
        <p className="text-ink text-base">Merlin was never found.</p>
      </div>
    </div>
  );
}

export function GoodWinsMoment() {
  return (
    <Moment
      title="Good wins"
      length={2900}
      stageClassName="min-h-[16rem]"
      notes={{
        moves: (
          <>
            First light: a warm band rises from the horizon, the stars fade back
            as the sky pales, a few falling stars drop through it, and the
            verdict rises in.
          </>
        ),
        timing: (
          <>
            Dawn 1.8s ease-out; stars fade 1.6s; falling stars 1.1s each,
            staggered to 2.45s; title at 1.2s.
          </>
        ),
        sound: (
          <>
            <Cue>good-wins</Cue>: a slow swell and seven chimes climbing to a
            high D (2.9s).
          </>
        ),
        why: (
          <>
            The night of hidden loyalties is over; morning means the truth is
            out. Warm, upward, bright: the opposite of the eclipse.
          </>
        ),
      }}
    >
      {(scene) => <GoodWins {...scene} />}
    </Moment>
  );
}

function EvilWins(scene: SceneProps) {
  useBeats(scene, [{ at: 0, cue: "evil-wins" }]);
  return (
    <div className="sl-eclipse relative grid place-items-center overflow-hidden px-4 py-6">
      <EndSky order="out" />
      <svg
        viewBox="-60 -60 120 120"
        className="absolute top-4 right-6 h-[5.5rem] w-[5.5rem]"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="sl-eclipse__corona sl-seq"
          r={40}
          fill="none"
          stroke="var(--evil)"
          strokeWidth={2.5}
          opacity={0.8}
        />
        <circle r={34} fill="var(--art-moon)" />
        <circle
          className="sl-eclipse__shadow sl-seq"
          cx={2.5}
          r={33}
          fill="var(--well)"
        />
      </svg>
      <div
        className="sl-endtitle sl-seq relative text-center"
        style={{ "--at": "1300ms" } as CSSProperties}
      >
        <p className="text-evil inline-flex items-center gap-2 text-base font-extrabold">
          <IconDagger size={20} />
          Evil
        </p>
        <p className="font-display text-ink text-[2.25rem] leading-tight font-medium">
          Evil prevails
        </p>
        <p className="text-ink text-base">Three quests have failed.</p>
      </div>
    </div>
  );
}

export function EvilWinsMoment() {
  return (
    <Moment
      title="Evil wins"
      length={2600}
      stageClassName="min-h-[16rem]"
      notes={{
        moves: (
          <>
            The stars go out one by one, a shadow slides across the moon, a
            coral ring burns round it, and the verdict rises.
          </>
        ),
        timing: (
          <>
            Stars 600ms ease-in, 14ms apart from 200ms; eclipse 1.1s from 200ms;
            ring at 1.2s; title at 1.3s.
          </>
        ),
        sound: (
          <>
            <Cue>evil-wins</Cue>: a dark B minor pad and harp notes falling to
            B, with one low knock (2.9s).
          </>
        ),
        why: (
          <>
            The light the table played by is put out. Falling and darkening,
            where Good&apos;s rises and brightens.
          </>
        ),
      }}
    >
      {(scene) => <EvilWins {...scene} />}
    </Moment>
  );
}

/* ----------------------------------------------------------- connection */

function AwayAndBack(scene: SceneProps) {
  const beat = useBeats(scene, [
    { at: 400, cue: "away" },
    { at: 1800, cue: "back" },
  ]);
  const away = beat === 1;
  const players: SeatView[] = PLAYERS.map((player) =>
    player.id === IDS.kay ? { ...player, connected: !away } : player,
  );
  return (
    <div className="grid content-center">
      <RingScene players={players} />
      <SceneLine className="px-4 pb-4">
        {away
          ? "Kay's phone is asleep. Their seat is kept."
          : "Everyone is here."}
      </SceneLine>
    </div>
  );
}

export function AwayMoment() {
  return (
    <Moment
      title="Away, and back"
      length={2300}
      stageClassName="min-h-[22rem]"
      notes={{
        moves: (
          <>
            The seat&apos;s star dims and its edge turns dashed, and
            &quot;Away&quot; with a crescent moon pops in. On return the star
            brightens again and the label goes.
          </>
        ),
        timing: <>420ms fade; label 250ms spring.</>,
        sound: (
          <>
            <Cue>away</Cue> (two notes falling to B) and <Cue>back</Cue> (two
            notes rising to D).
          </>
        ),
        why: (
          <>
            A sleeping phone is the commonest hold-up at a real table. This
            shows whose it is, and that their seat is safe.
          </>
        ),
      }}
    >
      {(scene) => <AwayAndBack {...scene} />}
    </Moment>
  );
}

function Reconnecting(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 1700, cue: "reconnected" }]);
  const back = beat >= 1;
  return (
    <div className="grid content-center">
      <div className="px-3 pt-3">
        {back ? (
          <p
            key="back"
            role="status"
            className="sl-banner sl-seq bg-well border-success text-success flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-base font-bold"
          >
            <IconCheck size={18} />
            Back at the fire
          </p>
        ) : (
          <p
            key="lost"
            role="status"
            className="sl-banner sl-seq bg-well border-line-strong text-ink flex min-h-11 items-center justify-center gap-2.5 rounded-md border px-4 text-base font-bold"
          >
            <span className="sl-dots text-accent flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <span key={index} style={{ "--i": index } as CSSProperties}>
                  <IconStar size={12} />
                </span>
              ))}
            </span>
            Reconnecting to the fire
          </p>
        )}
      </div>
      <div
        className="transition-opacity duration-[420ms]"
        style={{ opacity: back ? 1 : 0.45 }}
      >
        <RingScene />
      </div>
    </div>
  );
}

export function ReconnectMoment() {
  return (
    <Moment
      title="Reconnecting"
      length={2300}
      stageClassName="min-h-[24rem]"
      notes={{
        moves: (
          <>
            While the connection is lost the table dims and a banner drops in
            with three small stars pulsing in turn. When it is back the banner
            turns to a tick and the table brightens.
          </>
        ),
        timing: (
          <>
            Banner 320ms; stars pulse 1.2s, 200ms apart (a loop, it is a wait);
            table 420ms fade.
          </>
        ),
        sound: (
          <>
            None while lost (it may last). <Cue>reconnected</Cue> on return:
            three harp notes rising to A.
          </>
        ),
        why: (
          <>
            Says why nothing is responding, and that it is being handled,
            without an error tone at the table.
          </>
        ),
      }}
    >
      {(scene) => <Reconnecting {...scene} />}
    </Moment>
  );
}
