/**
 * Role catalogue. Source of truth for `.claude/rules/roles.md`.
 * Who knows whom is decided on the server (see docs/architecture.md); this
 * file only describes the roles.
 */

export type Alignment = "good" | "evil";

export type Role =
  | "merlin"
  | "percival"
  | "servant"
  | "assassin"
  | "minion"
  | "mordred"
  | "morgana"
  | "oberon";

/** Roles the host can switch on in the lobby. Merlin and Assassin are always in. */
export const OPTIONAL_ROLES = [
  "percival",
  "morgana",
  "mordred",
  "oberon",
] as const satisfies ReadonlyArray<Role>;

export type OptionalRole = (typeof OPTIONAL_ROLES)[number];

export interface RoleInfo {
  readonly name: string;
  readonly alignment: Alignment;
  /** One line shown on the role card. */
  readonly summary: string;
  /** What this role learns on the first night. */
  readonly knowledge: string;
}

export const ROLES: Readonly<Record<Role, RoleInfo>> = {
  merlin: {
    name: "Merlin",
    alignment: "good",
    summary: "You know the servants of Evil. Guide Good without being found.",
    knowledge: "You see every Evil player except Mordred.",
  },
  percival: {
    name: "Percival",
    alignment: "good",
    summary: "You know Merlin, but Morgana wears the same face.",
    knowledge: "You see Merlin and Morgana, and cannot tell them apart.",
  },
  servant: {
    name: "Loyal Servant of Arthur",
    alignment: "good",
    summary: "You know nothing but your own loyalty.",
    knowledge: "You have no knowledge of the other players.",
  },
  assassin: {
    name: "Assassin",
    alignment: "evil",
    summary: "If Good wins three quests, name Merlin and steal the victory.",
    knowledge: "You see your fellow Evil players, except Oberon.",
  },
  minion: {
    name: "Minion of Mordred",
    alignment: "evil",
    summary: "Sabotage the quests and stay hidden.",
    knowledge: "You see your fellow Evil players, except Oberon.",
  },
  mordred: {
    name: "Mordred",
    alignment: "evil",
    summary: "Merlin cannot see you.",
    knowledge: "You see your fellow Evil players, except Oberon.",
  },
  morgana: {
    name: "Morgana",
    alignment: "evil",
    summary: "You appear as Merlin to Percival.",
    knowledge: "You see your fellow Evil players, except Oberon.",
  },
  oberon: {
    name: "Oberon",
    alignment: "evil",
    summary: "You serve Evil alone. They do not know you, nor you them.",
    knowledge: "You have no knowledge of the other players.",
  },
};
