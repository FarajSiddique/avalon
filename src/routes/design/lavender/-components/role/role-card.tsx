import { useHoldToReveal } from "@/client/use-hold-to-reveal";
import { playerNames } from "@/design/mock";
import { ROLES } from "@/shared/roles";
import type { GameView, Knowledge, PlayerId } from "@/shared/views";
import { GreatHelm } from "../pixel/great-helm";
import { Helm, PixelIcon } from "../pixel/pixel-sprite";
import { plumePalette } from "../pixel/sprites";
import { AlignmentBadge } from "../ui/alignment-badge";

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

interface KnowledgeCopy {
  heading: string;
  ids: PlayerId[];
  /** Completes the sentence after the names. */
  verb: string;
  note?: string;
}

function knowledgeCopy(view: GameView): KnowledgeCopy | null {
  const knowledge: Knowledge = view.you.knowledge;
  switch (knowledge.kind) {
    case "merlin":
      return {
        heading: "You see Evil",
        ids: knowledge.evilIds,
        verb: knowledge.evilIds.length === 1 ? "is Evil." : "are Evil.",
        note: view.settings.optionalRoles.includes("mordred")
          ? "Mordred stays hidden from you. One more Evil player walks unseen."
          : undefined,
      };
    case "evil":
      return {
        heading: "Your fellow Evil players",
        ids: knowledge.allyIds,
        verb: knowledge.allyIds.length === 1 ? "is Evil too." : "are Evil too.",
        note: view.settings.optionalRoles.includes("oberon")
          ? "Oberon is Evil as well, but hidden from you."
          : undefined,
      };
    case "percival":
      return {
        heading: "Merlin is one of these",
        ids: knowledge.merlinCandidateIds,
        verb: ": one is Merlin, the other is Morgana.",
      };
    case "none":
      return null;
  }
}

/**
 * The private role card. Face down until the player presses and holds;
 * face down again the moment they let go or the tab loses focus. The secret
 * text is only in the page while it is shown.
 */
export function RoleCard({ view }: { view: GameView }) {
  const { revealed, holdProps } = useHoldToReveal();
  const role = ROLES[view.you.role];
  const seatIndex = view.players.findIndex((p) => p.id === view.you.id);
  const knows = knowledgeCopy(view);
  const names = knows ? playerNames(view, knows.ids) : [];

  return (
    <>
      <button
        type="button"
        {...holdProps}
        aria-label="Your role card. Press and hold to look at it."
        className="lv-frame grid min-h-[392px] w-full cursor-pointer text-left [--frame-color:var(--ink)] aria-pressed:translate-y-[var(--px)] aria-pressed:[--frame-drop:transparent] lg:min-h-[480px]"
      >
        {revealed ? (
          <span className="bg-surface col-start-1 row-start-1 flex flex-col gap-4 p-5 lg:p-7">
            <span className="flex items-center justify-between gap-3">
              <span className="lv-label text-ink-muted">You are</span>
              <AlignmentBadge alignment={view.you.alignment} />
            </span>
            <span className="flex items-center gap-4">
              <Helm seatIndex={seatIndex} />
              <span className="lv-title min-w-0 break-words">{role.name}</span>
            </span>
            <span className="block">{role.summary}</span>
            {knows ? (
              <span className="lv-frame bg-well flex flex-col gap-3 p-4 [--frame-color:var(--line-strong)] [--frame-drop:transparent]">
                <span className="lv-label text-ink-muted">{knows.heading}</span>
                <span className="flex flex-wrap gap-x-5 gap-y-3">
                  {knows.ids.map((id, index) => (
                    <span key={id} className="flex items-center gap-2">
                      <Helm
                        seatIndex={view.players.findIndex((p) => p.id === id)}
                      />
                      <span className="text-[24px] leading-none">
                        {names[index]}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="text-evil flex items-start gap-2">
                  <PixelIcon name="horns" className="mt-[2px]" />
                  <span>
                    {joinNames(names)} {knows.verb}
                  </span>
                </span>
                {knows.note ? (
                  <span className="lv-small text-ink-muted block">
                    {knows.note}
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="lv-small text-ink-muted block">
                {role.knowledge}
              </span>
            )}
          </span>
        ) : (
          <span className="lv-card-back col-start-1 row-start-1 flex flex-col items-center justify-center gap-6 p-6">
            <GreatHelm plume={plumePalette(seatIndex)} />
            <span className="lv-frame bg-surface flex flex-col items-center gap-3 px-5 py-4 text-center [--frame-color:var(--ink)]">
              <span className="lv-heading">Hold to peek</span>
              <span className="text-ink-muted">Keep it hidden.</span>
              <PixelIcon name="arrowDown" className="lv-bob text-accent" />
            </span>
          </span>
        )}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {revealed
          ? `Your role: ${role.name}. ${view.you.alignment === "good" ? "Good" : "Evil"}. ${role.summary} ${
              knows
                ? `${joinNames(names)} ${knows.verb} ${knows.note ?? ""}`
                : role.knowledge
            }`
          : ""}
      </p>
    </>
  );
}
