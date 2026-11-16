import type { Metadata } from "next";
import Link from "next/link";
import { designPaths } from "@/design/directions";
import { FreshOnReturn } from "../_components/fresh-on-return";
import { GalleryControls } from "../_components/motion/gallery-controls";
import {
  ButtonMoment,
  CopyMoment,
  EveryoneReadyMoment,
  JoinMoment,
  LivingSkyMoment,
  ReadyMoment,
  StartMoment,
  TitleMoment,
} from "../_components/motion/scenes-arrival";
import {
  AssassinMoment,
  AwayMoment,
  EvilWinsMoment,
  GoodWinsMoment,
  ReconnectMoment,
} from "../_components/motion/scenes-end";
import {
  CrownPassMoment,
  DealMoment,
  FailMoonMoment,
  OthersCardsMoment,
  PlayCardMoment,
  ShuffleMoment,
  SuccessMoonMoment,
} from "../_components/motion/scenes-quest";
import {
  ApprovedMoment,
  CrownMoment,
  LockMoment,
  PickMoment,
  ProposeMoment,
  RejectedMoment,
  TeamCompleteMoment,
  UnpickMoment,
  VotesArrivingMoment,
  WaitMoment,
} from "../_components/motion/scenes-round";
import {
  CloudsPartMoment,
  ConfirmMoment,
  ConstellationMoment,
  EveryoneConfirmedMoment,
  ReleaseMoment,
} from "../_components/motion/scenes-role";

export const metadata: Metadata = {
  title: "Starlit Vale: motion and sound",
};

const paths = designPaths("starlit");

const STAGES = [
  {
    id: "landing",
    title: "Landing",
    line: "The sky is the only thing that moves on its own.",
    moments: [LivingSkyMoment, TitleMoment, ButtonMoment],
  },
  {
    id: "lobby",
    title: "Lobby",
    line: "The table fills, and every arrival adds a note to one chord.",
    moments: [
      JoinMoment,
      ReadyMoment,
      CopyMoment,
      EveryoneReadyMoment,
      StartMoment,
    ],
  },
  {
    id: "role",
    title: "Role reveal",
    line: "Slow to open, quick to close. Sounds the same for every role.",
    moments: [
      CloudsPartMoment,
      ConstellationMoment,
      ReleaseMoment,
      ConfirmMoment,
      EveryoneConfirmedMoment,
    ],
  },
  {
    id: "proposal",
    title: "Team proposal",
    line: "The team is drawn as a constellation inside the ring.",
    moments: [
      CrownMoment,
      PickMoment,
      UnpickMoment,
      TeamCompleteMoment,
      ProposeMoment,
    ],
  },
  {
    id: "vote",
    title: "Team vote",
    line: "Who has voted is shown; how is not, by sight or by sound.",
    moments: [LockMoment, VotesArrivingMoment, WaitMoment],
  },
  {
    id: "reveal",
    title: "Votes revealed",
    line: "A held breath, then every vote turns at the same instant.",
    moments: [ApprovedMoment, RejectedMoment],
  },
  {
    id: "quest",
    title: "Quest cards",
    line: "Both cards always move together, so nobody learns yours.",
    moments: [DealMoment, PlayCardMoment, OthersCardsMoment],
  },
  {
    id: "result",
    title: "Quest result",
    line: "One card at a time, then the moon, the score and the crown.",
    moments: [
      ShuffleMoment,
      SuccessMoonMoment,
      FailMoonMoment,
      CrownPassMoment,
    ],
  },
  {
    id: "end",
    title: "The end of the game",
    line: "New scenes, no screen yet: dawn for Good, an eclipse for Evil.",
    moments: [AssassinMoment, GoodWinsMoment, EvilWinsMoment],
  },
  {
    id: "connection",
    title: "Connection",
    line: "A sleeping phone, and a lost connection.",
    moments: [AwayMoment, ReconnectMoment],
  },
] as const;

/**
 * Every moment of motion and sound in the Starlit Vale direction, grouped
 * by stage of the game, each one replayable.
 */
export default function StarlitMotionPage() {
  return (
    <FreshOnReturn>
      <main className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-6 px-4 pt-6 pb-14 lg:px-8 lg:pt-10">
        <header className="flex flex-col gap-3">
          <p className="sl-eyebrow">Motion and sound</p>
          <h1 className="font-display text-[2rem] leading-tight font-medium lg:text-5xl">
            The vale, awake
          </h1>
          <p className="text-ink max-w-[44rem] text-[1.0625rem] leading-relaxed">
            Every moment that moves or sounds in the game, stage by stage. Press
            Play on any of them. Each one says what moves, for how long, what
            you hear and why it helps. With reduced motion on, each scene shows
            its end at once.
          </p>
          <p className="text-ink-muted max-w-[44rem] text-base leading-relaxed">
            The sound was checked by measurement (length, peak level, not
            silent), not by ear. Listen and judge it yourself.{" "}
            <Link
              href={paths.landing}
              className="text-accent font-bold underline underline-offset-4"
            >
              Back to the click-through
            </Link>
          </p>
        </header>

        <GalleryControls />

        <nav aria-label="Stages" className="sl-gallery__nav">
          {STAGES.map((stage, index) => (
            <a key={stage.id} href={`#${stage.id}`} className="sl-plain">
              {index + 1}. {stage.title}
            </a>
          ))}
        </nav>

        {STAGES.map((stage, index) => (
          <section
            key={stage.id}
            id={stage.id}
            aria-labelledby={`${stage.id}-heading`}
            className="flex scroll-mt-14 flex-col gap-4"
          >
            <div>
              <p className="sl-eyebrow">Stage {index + 1}</p>
              <h2
                id={`${stage.id}-heading`}
                className="font-display mt-1 text-[1.75rem] leading-tight font-medium lg:text-[2.25rem]"
              >
                {stage.title}
              </h2>
              <p className="text-ink-muted mt-1 text-base">{stage.line}</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {stage.moments.map((MomentScene, index) => (
                <MomentScene key={index} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </FreshOnReturn>
  );
}
