import { ROLES } from "@/shared/roles";
import type { GameView } from "@/shared/views";
import { listNames, namesOf } from "../lib/names";

/** What the role card says under "What you know". Plain data, no secrets
 * beyond what the server already put in this player's view. */
export interface RoleKnowledge {
  /** The sentence before the names, e.g. "These players serve Evil:". */
  lead: string;
  /** The names, already joined: "Tobias and Kay". Empty if the role sees no one. */
  names: string;
  /** Whether the named players are Evil, or cannot be told (Percival). */
  tone: "evil" | "unknown" | "none";
  /** A caveat, e.g. who stays hidden. */
  note: string | null;
}

export function roleKnowledge(view: GameView): RoleKnowledge {
  const { knowledge, role } = view.you;
  const inPlay = view.settings.optionalRoles;

  switch (knowledge.kind) {
    case "merlin":
      return {
        lead: "These players serve Evil:",
        names: listNames(namesOf(view, knowledge.evilIds)),
        tone: "evil",
        note: inPlay.includes("mordred")
          ? "Mordred stays hidden from you. One more traitor walks unseen."
          : null,
      };
    case "evil":
      return {
        lead: "Your fellow Evil players:",
        names: listNames(namesOf(view, knowledge.allyIds)),
        tone: "evil",
        note: inPlay.includes("oberon")
          ? "Oberon serves Evil too, but stays hidden from you."
          : null,
      };
    case "percival":
      return {
        lead: "One of these is Merlin, the other Morgana:",
        names: listNames(namesOf(view, knowledge.merlinCandidateIds)),
        tone: "unknown",
        note: null,
      };
    case "none":
      return {
        lead: ROLES[role].knowledge,
        names: "",
        tone: "none",
        note: null,
      };
  }
}
