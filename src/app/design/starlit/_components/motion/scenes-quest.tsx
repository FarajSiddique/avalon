"use client";

import type { CSSProperties } from "react";
import { questReveal, tableViews } from "@/design/mock";
import type { GameView, PlayerId } from "@/shared/views";
import { Campfire } from "../art/campfire";
import { IconCrackedMoon, IconStar, IconSun } from "../icons";
import { QuestTrack } from "../table/quest-track";
import { RESULT_TIMELINE } from "../table/result-timeline";
import { Scoreboard } from "../table/scoreboard";
import type { SeatStatus } from "../table/seat-ring";
import { LockedNote, PlayedCards, QuestDeck } from "../table/stages";
import { Cue, Moment } from "./moment";
import { IDS, RingScene, SceneLine } from "./scene-kit";
import { useBeats, type SceneProps } from "./use-beats";

/* ------------------------------------------------------------ quest cards */

function TwoCards({ dealt = false }: { dealt?: boolean }) {
  const deal = dealt ? "sl-deal sl-seq" : "";
  return (
    <div className="flex items-stretch gap-3">
      <span className={`sl-card sl-card--success ${deal}`}>
        <IconSun size={34} />
        <span className="sl-card__title">Success</span>
      </span>
      <span
        className={`sl-card sl-card--fail ${deal} ${dealt ? "sl-deal--2" : ""}`}
      >
        <IconCrackedMoon size={34} />
        <span className="sl-card__title">Fail</span>
      </span>
    </div>
  );
}

function CardsArrive(scene: SceneProps) {
  useBeats(scene, [{ at: 80, cue: "deal" }]);
  return (
    <div className="grid content-center gap-2.5 px-4 py-4">
      <SceneLine>1 of 3 have played</SceneLine>
      <TwoCards dealt />
    </div>
  );
}

export function DealMoment() {
  return (
    <Moment
      title="The cards arriving"
      length={800}
      stageClassName="min-h-[12rem]"
      notes={{
        moves: (
          <>
            Success and Fail slide up into your hand with a slight turn, one
            after the other.
          </>
        ),
        timing: <>380ms each, ease-out, 90ms apart.</>,
        sound: (
          <>
            <Cue>deal</Cue>: two soft paper flicks.
          </>
        ),
        why: <>Says &quot;your turn, in private&quot; as the step opens.</>,
      }}
    >
      {(scene) => <CardsArrive {...scene} />}
    </Moment>
  );
}

function PlayCard(scene: SceneProps) {
  const beat = useBeats(scene, [{ at: 450, cue: "card-play" }]);
  const played = beat >= 1;
  const live = scene.run > 0 && !scene.still;
  return (
    <div className="grid content-center gap-2.5 px-4 py-4">
      <SceneLine>{played ? 2 : 1} of 3 have played</SceneLine>
      {played ? (
        <div className="relative">
          <LockedNote at={live ? 520 : 0}>
            Your card is played and locked.
          </LockedNote>
          {live && <PlayedCards />}
        </div>
      ) : (
        <TwoCards />
      )}
    </div>
  );
}

export function PlayCardMoment() {
  return (
    <Moment
      title="Playing a card"
      length={1500}
      stageClassName="min-h-[12rem]"
      notes={{
        moves: (
          <>
            Both cards turn face down together, slide into one, and that one
            card rises toward the fire and fades. The locked line rises in
            behind it.
          </>
        ),
        timing: (
          <>
            820ms: turn 200ms, merge 230ms, rise and fade 390ms. Line at 520ms.
          </>
        ),
        sound: (
          <>
            <Cue>card-play</Cue>: a flick, a breath of air, a soft knock as it
            lands, and a 16ms buzz on Android. Identical for Success and Fail.
          </>
        ),
        why: (
          <>
            Both cards move the same way, so neither the motion nor the sound
            says which one you played.
          </>
        ),
      }}
    >
      {(scene) => <PlayCard {...scene} />}
    </Moment>
  );
}

const PILE = [
  { x: "-14px", y: "-4px", tilt: "-9deg", from: "-60px" },
  { x: "10px", y: "-8px", tilt: "7deg", from: "40px" },
  { x: "-2px", y: "-14px", tilt: "-2deg", from: "0px" },
];

function OthersCards(scene: SceneProps) {
  const beat = useBeats(
    scene,
    PILE.map((_, index) => ({
      at: 300 + index * 600,
      cue: "card-in" as const,
      index,
    })),
  );
  return (
    <div className="grid content-center gap-2 px-4 py-4">
      <div className="relative mx-auto h-[10rem] w-full max-w-[16rem]">
        <Campfire className="absolute inset-x-0 bottom-0 mx-auto w-[11rem]" />
        {PILE.slice(0, beat).map((card, index) => (
          <span
            key={index}
            className="sl-pilecard sl-seq"
            style={
              {
                "--x": card.x,
                "--y": `calc(${card.y} - 44px)`,
                "--tilt": card.tilt,
                "--from-x": card.from,
              } as CSSProperties
            }
          >
            <IconStar size={18} />
          </span>
        ))}
      </div>
      <SceneLine>
        <span key={beat} className="sl-pop sl-seq inline-block">
          {beat}
        </span>{" "}
        of 3 have played
      </SceneLine>
    </div>
  );
}

export function OthersCardsMoment() {
  return (
    <Moment
      title="The others' cards arriving"
      length={2000}
      stageClassName="min-h-[15rem]"
      notes={{
        moves: (
          <>
            A face-down card drops onto a pile by the fire for each player who
            has played; the count pops up. Seats change from Choosing to Played.
          </>
        ),
        timing: <>Each card falls and settles in 520ms, ease-out.</>,
        sound: (
          <>
            <Cue>card-in</Cue>: a flick and a soft knock, the same for every
            card.
          </>
        ),
        why: (
          <>
            The table sees the quest filling up while every card stays
            anonymous.
          </>
        ),
      }}
    >
      {(scene) => <OthersCards {...scene} />}
    </Moment>
  );
}

/* ----------------------------------------------------------- quest result */

function ShuffleAndTurn(scene: SceneProps) {
  const t = RESULT_TIMELINE;
  useBeats(scene, [
    { at: t.shuffle, cue: "shuffle" },
    ...questReveal.cards.map((card, index) => ({
      at: t.turns[index] ?? 0,
      cue: card === "fail" ? ("card-fail" as const) : ("card-success" as const),
    })),
    { at: t.outcome, cue: "quest-fail" },
  ]);
  return (
    <div className="grid content-center gap-4 px-4 py-5">
      <QuestDeck cards={questReveal.cards} />
      <p
        className="font-display text-fail sl-rise sl-seq flex items-center justify-center gap-2.5 text-[1.75rem] leading-tight font-medium"
        style={{ "--at": `${t.outcome}ms` } as CSSProperties}
      >
        <IconCrackedMoon size={30} />
        <span className="text-ink">Quest failed</span>
      </p>
    </div>
  );
}

export function ShuffleMoment() {
  return (
    <Moment
      title="Shuffled, then turned one by one"
      length={2600}
      stageClassName="min-h-[15rem]"
      notes={{
        moves: (
          <>
            The face-down cards slide over each other, then turn one at a time.
            The last one lifts and waits, a held breath, before it turns. Then
            the outcome rises.
          </>
        ),
        timing: (
          <>
            Shuffle 520ms. Turns at 0.6s and 0.95s; the last lifts from 1.05s
            and turns at 1.7s (each turn 180ms out, 240ms in). Outcome at 2.05s.
          </>
        ),
        sound: (
          <>
            <Cue>shuffle</Cue> (five quick flicks), <Cue>card-success</Cue> (a
            bright note) or <Cue>card-fail</Cue> (a dark low one) per card, then{" "}
            <Cue>quest-fail</Cue> or <Cue>quest-success</Cue>.
          </>
        ),
        why: (
          <>
            The server shuffled the cards, and the table watches it happen.
            Turning them one by one gives the room its moment of suspense.
          </>
        ),
      }}
    >
      {(scene) => <ShuffleAndTurn {...scene} />}
    </Moment>
  );
}

/** The result view, with quest 3 won instead of lost. */
const SUCCESS_VIEW: GameView = {
  ...tableViews.result,
  quests: tableViews.result.quests.map((quest, index) =>
    index === 2 ? { ...quest, status: "success", failCount: 0 } : quest,
  ),
  score: { good: 2, evil: 1 },
};

function MoonSettles({
  scene,
  success,
}: {
  scene: SceneProps;
  success: boolean;
}) {
  useBeats(scene, [
    { at: 300, cue: success ? "quest-success" : "quest-fail" },
    { at: 450, cue: "score" },
  ]);
  const view = success ? SUCCESS_VIEW : tableViews.result;
  return (
    <div
      className="grid content-center gap-4 px-4 py-4 lg:px-6"
      style={{ "--settle-at": "300ms", "--score-at": "450ms" } as CSSProperties}
    >
      <Scoreboard view={view} bumped={success ? "good" : "evil"} />
      <div className="sl-moonrow">
        <QuestTrack view={view} settled={2} />
      </div>
    </div>
  );
}

const MOON_TIMING = (
  <>
    Moon grows into its outcome in 560ms (spring) with one ring of light
    (760ms); badge pops 260ms later; the next moon brightens at 720ms. Score
    rolls 260ms out, 340ms in.
  </>
);

export function SuccessMoonMoment() {
  return (
    <Moment
      title="Success on the quest's moon"
      length={1600}
      stageClassName="min-h-[14rem]"
      notes={{
        moves: (
          <>
            The quest&apos;s moon fills green with a tick, one green ring opens
            round it, Good&apos;s score rolls up, and the next moon starts to
            glow.
          </>
        ),
        timing: MOON_TIMING,
        sound: (
          <>
            <Cue>quest-success</Cue>: chimes rising to D over a warm open chord
            (2.6s), then <Cue>score</Cue>, one high chime.
          </>
        ),
        why: <>The quest track is the game&apos;s story; this writes a line.</>,
      }}
    >
      {(scene) => <MoonSettles scene={scene} success />}
    </Moment>
  );
}

export function FailMoonMoment() {
  return (
    <Moment
      title="Fail on the quest's moon"
      length={1600}
      stageClassName="min-h-[14rem]"
      notes={{
        moves: (
          <>
            The moon takes a coral rim and a cross, a coral ring opens, and
            Evil&apos;s score rolls up.
          </>
        ),
        timing: MOON_TIMING,
        sound: (
          <>
            <Cue>quest-fail</Cue>: harp notes falling to B over a dark chord and
            a low knock (2.6s), then <Cue>score</Cue>.
          </>
        ),
        why: (
          <>
            Same shape as success, different colour, icon, word and sound, so it
            never relies on colour alone.
          </>
        ),
      }}
    >
      {(scene) => <MoonSettles scene={scene} success={false} />}
    </Moment>
  );
}

function CrownPasses(scene: SceneProps) {
  useBeats(scene, [{ at: 300, cue: "crown-pass" }]);
  const status: Record<PlayerId, SeatStatus> = {};
  return (
    <RingScene
      leaderId={IDS.ansel}
      crown={IDS.wren}
      status={status}
      timing={{ "--crown-at": "300ms" }}
      label="Seats. Ansel leads next."
    />
  );
}

export function CrownPassMoment() {
  return (
    <Moment
      title="The crown passes"
      length={1100}
      stageClassName="min-h-[19rem]"
      notes={{
        moves: (
          <>
            The crown lifts off the old leader&apos;s star, arcs over and lands
            on the next seat clockwise, a little larger at the top of the arc.
          </>
        ),
        timing: <>620ms ease-out. In the quest result it flies at 2.35s.</>,
        sound: (
          <>
            <Cue>crown-pass</Cue>: a soft upward slide and a chime.
          </>
        ),
        why: (
          <>
            Answers the next &quot;whose turn?&quot; before anyone asks, and
            shows the order goes round the table.
          </>
        ),
      }}
    >
      {(scene) => <CrownPasses {...scene} />}
    </Moment>
  );
}
