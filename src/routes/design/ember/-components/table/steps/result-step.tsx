import { designPaths } from "@/design/directions";
import { questReveal } from "@/design/mock";
import type { GameView, QuestCard } from "@/shared/views";
import { BrokenBladeIcon, GrailIcon } from "../../art/icons";
import { WaxSeal } from "../../art/wax-seal";
import { nameOf, questNumeral } from "../../lib/names";
import { ButtonLink } from "../../ui/button";
import { Dock } from "../dock";
import { SeatRing, type SeatModel } from "../seat-ring";

const paths = designPaths("ember");

const TILT = [
  "-rotate-6 translate-y-1",
  "rotate-1 -translate-y-1",
  "rotate-[7deg] translate-y-1",
];

/** One shuffled quest card, face up on the table. */
function TableCard({ card, index }: { card: QuestCard; index: number }) {
  const success = card === "success";
  return (
    <li
      className={`ember-parchment ember-tablecard ember-deal -mx-0.5 ${
        TILT[index % TILT.length]
      } ${success ? "text-(--paper-success)" : "text-(--paper-fail)"}`}
      style={{ animationDelay: `${index * 140}ms` }}
    >
      <span className="lg:scale-150 lg:py-2">
        {success ? <GrailIcon size={30} /> : <BrokenBladeIcon size={30} />}
      </span>
      {success ? "Success" : "Fail"}
    </li>
  );
}

/** The quest is over: the cards are turned, the track and score move on. */
export function ResultStep({ view }: { view: GameView }) {
  const reveal = questReveal;
  const failed = reveal.outcome === "fail";
  const next = view.quests[view.questIndex];

  const seats: SeatModel[] = view.players.map((player) => ({
    player,
    isYou: player.id === view.you.id,
    isLeader: player.id === view.leaderId,
    onTeam: reveal.team.includes(player.id),
  }));

  return (
    <>
      <SeatRing
        seats={seats}
        youId={view.you.id}
        bareCentre
        centre={
          <ul aria-label="The quest cards, shuffled" className="flex">
            {reveal.cards.map((card, index) => (
              <TableCard key={index} card={card} index={index} />
            ))}
          </ul>
        }
      />
      <Dock
        label="Quest result"
        kicker={`Quest ${questNumeral(reveal.questIndex)} · Result`}
        actions={
          <ButtonLink href={paths.table("propose")}>Next quest</ButtonLink>
        }
      >
        <p
          role="status"
          className={`ember-carved flex flex-wrap items-center gap-x-2.5 text-[1.375rem] ${
            failed ? "text-fail" : "text-success"
          }`}
        >
          <WaxSeal tone={failed ? "wax" : "laurel"} size={30}>
            {failed ? <BrokenBladeIcon size={18} /> : <GrailIcon size={18} />}
          </WaxSeal>
          {failed ? "Quest failed" : "Quest succeeded"}
          <span className="ember-label text-ink">
            {reveal.failCount} Fail of {reveal.cards.length} cards
          </span>
        </p>
        <p className="mt-1">
          Good {view.score.good}, Evil {view.score.evil}.{" "}
          {nameOf(view, view.leaderId)} leads next.
          {next ? (
            <>
              {" "}
              Quest {questNumeral(view.questIndex)} needs {next.teamSize}{" "}
              players
              {next.failsRequired === 2 ? " and 2 Fails to fail" : ""}.
            </>
          ) : null}
        </p>
      </Dock>
    </>
  );
}
