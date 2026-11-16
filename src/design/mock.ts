/**
 * Mock data for the design prototypes.
 *
 * Everything here is typed with the real view types from src/shared/views.ts,
 * so a prototype screen built on this data can be wired to the live server by
 * swapping the data source. One 7-player game, seen mostly by Wren (Merlin).
 *
 * The story so far: quest 1 succeeded, quest 2 failed, one team for quest 3
 * was rejected, and now Wren leads. Wren cannot see Mordred (Bram), puts him
 * on the team, and quest 3 fails.
 */

import { ROLES } from "@/shared/roles";
import type {
  GameSettings,
  GameView,
  LobbyView,
  PlayerId,
  ProposalRecord,
  QuestCard,
  QuestView,
  SeatView,
} from "@/shared/views";
import type { RoleVariant, TableStep } from "./directions";

export const ROOM_CODE = "KNGT";

const ids = {
  wren: "p-wren",
  ansel: "p-ansel",
  mira: "p-mira",
  tobias: "p-tobias",
  isolde: "p-isolde",
  kay: "p-kay",
  bram: "p-bram",
} as const;

export const PLAYER_IDS = ids;

/** Hidden truth, for reference only. A real client never has this. */
export const MOCK_ROLES = {
  [ids.wren]: "merlin",
  [ids.ansel]: "percival",
  [ids.mira]: "servant",
  [ids.tobias]: "assassin",
  [ids.isolde]: "servant",
  [ids.kay]: "morgana",
  [ids.bram]: "mordred",
} as const;

const settings: GameSettings = {
  optionalRoles: ["percival", "morgana", "mordred"],
  ladyOfTheLake: false,
};

function seat(
  id: PlayerId,
  name: string,
  overrides: Partial<SeatView> = {},
): SeatView {
  return {
    id,
    name,
    isHost: false,
    connected: true,
    ready: true,
    ...overrides,
  };
}

/** Seat order is clockwise. Wren is the host and, in most views, "you". */
const seatedPlayers: SeatView[] = [
  seat(ids.wren, "Wren", { isHost: true }),
  seat(ids.ansel, "Ansel"),
  seat(ids.mira, "Mira"),
  seat(ids.tobias, "Tobias"),
  seat(ids.isolde, "Isolde"),
  seat(ids.kay, "Kay"),
  seat(ids.bram, "Bram"),
];

/* ------------------------------------------------------------------ lobby */

export const lobbyView: LobbyView = {
  stage: "lobby",
  code: ROOM_CODE,
  players: [
    seat(ids.wren, "Wren", { isHost: true }),
    seat(ids.ansel, "Ansel"),
    seat(ids.mira, "Mira"),
    seat(ids.tobias, "Tobias", { ready: false }),
    seat(ids.isolde, "Isolde"),
    seat(ids.kay, "Kay", { connected: false }),
    seat(ids.bram, "Bram"),
  ],
  settings,
  you: { id: ids.wren, isHost: true },
  startBlockers: [
    { kind: "disconnected", playerIds: [ids.kay] },
    { kind: "not_ready", playerIds: [ids.tobias] },
  ],
};

/* ------------------------------------------------------------------- game */

const quest1Team = [ids.wren, ids.mira];
const quest2Team = [ids.ansel, ids.tobias, ids.isolde];
const quest3Team = [ids.wren, ids.mira, ids.bram];

const everyone = seatedPlayers.map((p) => p.id);

function votes(rejecting: PlayerId[]): ProposalRecord["votes"] {
  return Object.fromEntries(
    everyone.map((id) => [id, rejecting.includes(id) ? "reject" : "approve"]),
  );
}

const pastProposals: ProposalRecord[] = [
  {
    questIndex: 0,
    leaderId: ids.tobias,
    team: quest1Team,
    votes: votes([ids.kay, ids.bram]),
    approved: true,
  },
  {
    questIndex: 1,
    leaderId: ids.isolde,
    team: [ids.isolde, ids.wren, ids.mira],
    votes: votes([ids.tobias, ids.kay, ids.bram, ids.ansel]),
    approved: false,
  },
  {
    questIndex: 1,
    leaderId: ids.kay,
    team: quest2Team,
    votes: votes([ids.wren, ids.mira]),
    approved: true,
  },
  {
    questIndex: 2,
    leaderId: ids.bram,
    team: [ids.bram, ids.kay, ids.tobias],
    votes: votes([ids.wren, ids.ansel, ids.mira, ids.isolde]),
    approved: false,
  },
];

/** The vote on Wren's team, shown at the "reveal" step. Approved 5 to 2. */
export const voteReveal: ProposalRecord = {
  questIndex: 2,
  leaderId: ids.wren,
  team: quest3Team,
  votes: votes([ids.ansel, ids.isolde]),
  approved: true,
};

/** Quest 3's cards, already shuffled, shown at the "result" step. */
export const questReveal: {
  questIndex: number;
  team: PlayerId[];
  cards: QuestCard[];
  failCount: number;
  outcome: "success" | "fail";
} = {
  questIndex: 2,
  team: quest3Team,
  cards: ["success", "fail", "success"],
  failCount: 1,
  outcome: "fail",
};

const questsBefore: QuestView[] = [
  {
    teamSize: 2,
    failsRequired: 1,
    status: "success",
    team: quest1Team,
    failCount: 0,
  },
  {
    teamSize: 3,
    failsRequired: 1,
    status: "fail",
    team: quest2Team,
    failCount: 1,
  },
  { teamSize: 3, failsRequired: 1, status: "current" },
  { teamSize: 4, failsRequired: 2, status: "upcoming" },
  { teamSize: 4, failsRequired: 1, status: "upcoming" },
];

const questsAfter: QuestView[] = [
  ...questsBefore.slice(0, 2),
  {
    teamSize: 3,
    failsRequired: 1,
    status: "fail",
    team: quest3Team,
    failCount: 1,
  },
  { teamSize: 4, failsRequired: 2, status: "current" },
  { teamSize: 4, failsRequired: 1, status: "upcoming" },
];

const asWren: GameView["you"] = {
  id: ids.wren,
  isHost: true,
  role: "merlin",
  alignment: ROLES.merlin.alignment,
  // Merlin sees Tobias and Kay. Bram is Mordred, so he stays hidden.
  knowledge: { kind: "merlin", evilIds: [ids.tobias, ids.kay] },
  ladyResults: [],
};

const asTobias: GameView["you"] = {
  id: ids.tobias,
  isHost: false,
  role: "assassin",
  alignment: ROLES.assassin.alignment,
  knowledge: { kind: "evil", allyIds: [ids.kay, ids.bram] },
  ladyResults: [],
};

const quest3Base: Omit<GameView, "phase"> = {
  stage: "game",
  code: ROOM_CODE,
  players: seatedPlayers,
  settings,
  you: asWren,
  quests: questsBefore,
  questIndex: 2,
  leaderId: ids.wren,
  rejections: 1,
  score: { good: 1, evil: 1 },
  proposals: pastProposals,
  ladyHolderId: null,
};

/** The table at each step of the click-through. */
export const tableViews: Record<TableStep, GameView> = {
  // Wren is the leader and has picked two of three team members.
  propose: {
    ...quest3Base,
    phase: {
      name: "team_building",
      teamSize: 3,
      draftIds: [ids.wren, ids.mira],
    },
  },
  // The team is proposed. Three players have voted. Wren has not.
  vote: {
    ...quest3Base,
    phase: {
      name: "team_vote",
      teamIds: quest3Team,
      votedIds: [ids.ansel, ids.tobias, ids.kay],
      yourVote: null,
    },
  },
  // All votes are in and shown at once (see `voteReveal`). The quest begins.
  reveal: {
    ...quest3Base,
    rejections: 0,
    proposals: [...pastProposals, voteReveal],
    phase: {
      name: "quest",
      teamIds: quest3Team,
      playedIds: [],
      onTeam: true,
      yourCard: null,
    },
  },
  // Wren is on the team and must play a card. Mira has already played.
  quest: {
    ...quest3Base,
    rejections: 0,
    proposals: [...pastProposals, voteReveal],
    phase: {
      name: "quest",
      teamIds: quest3Team,
      playedIds: [ids.mira],
      onTeam: true,
      yourCard: null,
    },
  },
  // Quest 3 failed (see `questReveal`). Ansel leads quest 4.
  result: {
    ...quest3Base,
    quests: questsAfter,
    questIndex: 3,
    leaderId: ids.ansel,
    rejections: 0,
    score: { good: 1, evil: 2 },
    proposals: [...pastProposals, voteReveal],
    phase: { name: "team_building", teamSize: 4, draftIds: [] },
  },
};

/** The private role screen, for a Good role and an Evil role. */
export const roleViews: Record<RoleVariant, GameView> = {
  merlin: {
    ...quest3Base,
    quests: questsBefore.map((q, i) => ({
      teamSize: q.teamSize,
      failsRequired: q.failsRequired,
      status: i === 0 ? "current" : "upcoming",
    })),
    questIndex: 0,
    leaderId: ids.tobias,
    rejections: 0,
    score: { good: 0, evil: 0 },
    proposals: [],
    phase: {
      name: "role_reveal",
      confirmedIds: [ids.mira, ids.kay],
      youConfirmed: false,
    },
  },
  assassin: {
    ...quest3Base,
    you: asTobias,
    quests: questsBefore.map((q, i) => ({
      teamSize: q.teamSize,
      failsRequired: q.failsRequired,
      status: i === 0 ? "current" : "upcoming",
    })),
    questIndex: 0,
    leaderId: ids.tobias,
    rejections: 0,
    score: { good: 0, evil: 0 },
    proposals: [],
    phase: {
      name: "role_reveal",
      confirmedIds: [ids.mira, ids.kay],
      youConfirmed: false,
    },
  },
};

/* ---------------------------------------------------------------- helpers */

export function playerName(view: LobbyView | GameView, id: PlayerId): string {
  return view.players.find((p) => p.id === id)?.name ?? "Unknown";
}

export function playerNames(
  view: LobbyView | GameView,
  playerIds: readonly PlayerId[],
): string[] {
  return playerIds.map((id) => playerName(view, id));
}
