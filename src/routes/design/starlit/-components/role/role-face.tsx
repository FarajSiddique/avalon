import { playerNames } from "@/design/mock";
import { ROLES } from "@/shared/roles";
import type { GameView } from "@/shared/views";
import { AlignmentTag } from "@/components/lobby/alignment-tag";
import {
  Constellation,
  constellationFor,
} from "@/components/art/constellation";
import { joinNames } from "@/components/lobby/names";

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

/**
 * The secret side of the role card: your constellation, role, alignment and
 * what you learned on the first night. Render it only while the card is
 * held, so none of it is in the page at rest. `compact` is the smaller cut
 * for the "Your role" peek over the table: the same words, smaller type.
 */
export function RoleFace({
  view,
  compact = false,
}: {
  view: GameView;
  compact?: boolean;
}) {
  const role = ROLES[view.you.role];
  const { alignment } = view.you;
  const knowledge = describeKnowledge(view);
  const figure = constellationFor(view.you.role, alignment);
  const tone = alignment === "good" ? "var(--good)" : "var(--evil)";

  return (
    <>
      <Constellation
        figure={figure}
        color={tone}
        className={
          compact ? "h-[4rem] w-auto" : "h-[5.25rem] w-auto lg:h-[10rem]"
        }
      />
      <span className="text-ink-muted block text-[0.8125rem] font-extrabold tracking-[0.14em] uppercase">
        {figure.name}
      </span>
      <span
        className={
          compact
            ? "font-display text-ink mt-1 block text-[2rem] leading-none font-medium"
            : "font-display text-ink mt-1.5 block text-[2.5rem] leading-none font-medium lg:mt-3 lg:text-[3.25rem]"
        }
      >
        <span className="sr-only">You are </span>
        {role.name}
      </span>
      <span className="mt-2.5 block">
        <AlignmentTag alignment={alignment} size="lg" />
      </span>
      <span
        className={
          compact
            ? "text-ink mt-2 mb-3 block text-base leading-snug"
            : "text-ink mt-2.5 mb-3 block text-base leading-snug lg:text-[1.0625rem]"
        }
      >
        {role.summary}
      </span>
      <span className="sl-knowledge mt-auto">
        <span className="text-ink-muted block text-base font-bold">
          {knowledge.title}
        </span>
        {knowledge.names && (
          <span
            className={
              compact
                ? "font-display block text-[1.375rem] leading-tight font-medium"
                : "font-display block text-[1.625rem] leading-tight font-medium"
            }
            style={{ color: knowledge.nameTone }}
          >
            {knowledge.names}
          </span>
        )}
        <span className="text-ink mt-1 block text-base leading-snug">
          {knowledge.note ?? role.knowledge}
        </span>
      </span>
    </>
  );
}
