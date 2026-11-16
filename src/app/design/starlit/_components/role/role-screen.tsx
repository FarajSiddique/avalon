import Link from "next/link";
import { designPaths, type RoleVariant } from "@/design/directions";
import { playerNames, roleViews } from "@/design/mock";
import { ROLES } from "@/shared/roles";
import type { GameView } from "@/shared/views";
import { AlignmentTag } from "../alignment-tag";
import { Constellation, constellationFor } from "../art/constellation";
import { IconArrowRight, IconEyeOff } from "../icons";
import { joinNames } from "../names";
import { SoundLink } from "../sound-link";
import { SkyCard } from "./sky-card";

const paths = designPaths("starlit");

interface KnowledgeText {
  title: string;
  names: string | null;
  /** Colour for the names: the alignment of the players named, not the viewer's. */
  nameTone: string;
  note: string | null;
}

/** What this role learned on the first night, in words, with names. */
function describeKnowledge(view: GameView): KnowledgeText {
  const { knowledge } = view.you;
  const inPlay = view.settings.optionalRoles;
  switch (knowledge.kind) {
    case "merlin":
      return {
        title: "These players are Evil",
        names: joinNames(playerNames(view, knowledge.evilIds)),
        nameTone: "var(--evil)",
        note: inPlay.includes("mordred")
          ? "Mordred is in this game and stays hidden from you."
          : null,
      };
    case "evil":
      return {
        title: "Your fellow Evil players",
        names: joinNames(playerNames(view, knowledge.allyIds)),
        nameTone: "var(--evil)",
        note: inPlay.includes("oberon")
          ? "Oberon is in this game. You do not know who he is."
          : null,
      };
    case "percival":
      return {
        title: "One of these is Merlin",
        names: joinNames(playerNames(view, knowledge.merlinCandidateIds)),
        nameTone: "var(--ink)",
        note: "The other is Morgana. You cannot tell them apart.",
      };
    case "none":
      return {
        title: "You know no one",
        names: null,
        nameTone: "var(--ink)",
        note: null,
      };
  }
}

export function RoleScreen({ variant }: { variant: RoleVariant }) {
  const view = roleViews[variant];
  const role = ROLES[view.you.role];
  const { alignment } = view.you;
  const knowledge = describeKnowledge(view);
  const figure = constellationFor(view.you.role, alignment);
  const tone = alignment === "good" ? "var(--good)" : "var(--evil)";
  const confirmed =
    view.phase.name === "role_reveal" ? view.phase.confirmedIds : [];
  const other: RoleVariant = variant === "merlin" ? "assassin" : "merlin";

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-4 px-4 pt-6 lg:grid lg:flex-none lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-14 lg:gap-y-6 lg:px-8 lg:pt-14 lg:pb-12">
      <header className="lg:col-start-1 lg:row-start-1 lg:pt-4">
        <p className="sl-eyebrow">For your eyes only</p>
        <h1 className="font-display mt-1 text-[1.875rem] leading-tight font-medium lg:text-5xl">
          Written in the stars
        </h1>
        <p className="sl-panel mt-3 flex items-start gap-3 px-4 py-3 text-base leading-snug lg:mt-5 lg:p-4 lg:text-[1.0625rem]">
          <IconEyeOff size={24} className="text-accent mt-0.5" />
          <span>
            <strong className="font-extrabold">
              Keep this screen to yourself.
            </strong>{" "}
            Look only when no one else can see.
          </span>
        </p>
      </header>

      <div className="sl-arrive sl-seq lg:col-start-2 lg:row-span-3 lg:row-start-1">
        <SkyCard>
          <Constellation
            figure={figure}
            color={tone}
            className="h-[5.25rem] w-auto lg:h-[10rem]"
          />
          <span className="text-ink-muted block text-[0.8125rem] font-extrabold tracking-[0.14em] uppercase">
            {figure.name}
          </span>
          <span className="font-display text-ink mt-1.5 block text-[2.5rem] leading-none font-medium lg:mt-3 lg:text-[3.25rem]">
            <span className="sr-only">You are </span>
            {role.name}
          </span>
          <span className="mt-2.5 block">
            <AlignmentTag alignment={alignment} size="lg" />
          </span>
          <span className="text-ink mt-2.5 mb-3 block text-base leading-snug lg:text-[1.0625rem]">
            {role.summary}
          </span>
          <span className="sl-knowledge mt-auto">
            <span className="text-ink-muted block text-base font-bold">
              {knowledge.title}
            </span>
            {knowledge.names && (
              <span
                className="font-display block text-[1.625rem] leading-tight font-medium"
                style={{ color: knowledge.nameTone }}
              >
                {knowledge.names}
              </span>
            )}
            <span className="text-ink mt-1 block text-base leading-snug">
              {knowledge.note ?? role.knowledge}
            </span>
          </span>
        </SkyCard>
      </div>

      <div className="sl-bar -mx-4 lg:col-start-1 lg:row-start-2 lg:mx-0">
        <div className="flex flex-col gap-3 lg:max-w-[26rem]">
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
          <SoundLink
            href={paths.table("propose")}
            cue="confirm"
            className="sl-btn sl-btn--primary w-full"
          >
            I have seen my role
            <IconArrowRight size={18} />
          </SoundLink>
        </div>
      </div>

      <div className="flex justify-center pb-6 lg:col-start-1 lg:row-start-3 lg:justify-start lg:pb-0">
        <Link href={paths.role(other)} className="sl-plain">
          Prototype: show the {ROLES[roleViews[other].you.role].name} card
        </Link>
      </div>
    </main>
  );
}
