/**
 * What a client is allowed to see.
 *
 * The server keeps the full game state. It never sends that state. For every
 * connected player it builds one `RoomView` and sends it only to that player.
 * These types are the whole contract between server and client, so nothing in
 * here may reveal another player's role, an unrevealed vote or who played
 * which quest card.
 */

import type { Avatar } from "./avatar";
import type { Alignment, OptionalRole, Role } from "./roles";

export type PlayerId = string;
export type RoomCode = string;

export interface GameSettings {
  optionalRoles: Array<OptionalRole>;
  ladyOfTheLake: boolean;
}

/** Public facts about one player at the table. Same for every viewer. */
export interface SeatView {
  id: PlayerId;
  name: string;
  isHost: boolean;
  /** False while the player's phone is asleep or offline. Their seat is kept. */
  connected: boolean;
  /** Lobby only. Always true once the game has started. */
  ready: boolean;
  /** The seat's look. Public. Fixed once the game starts. */
  avatar: Avatar;
}

/** A reason the host cannot start yet. Shown next to the Start button. */
export type StartBlocker =
  | { kind: "too_few_players"; needed: number }
  | { kind: "not_ready"; playerIds: Array<PlayerId> }
  | { kind: "disconnected"; playerIds: Array<PlayerId> }
  | { kind: "too_many_evil_roles"; allowed: number };

export interface LobbyView {
  stage: "lobby";
  code: RoomCode;
  /** In seat order (clockwise). */
  players: Array<SeatView>;
  settings: GameSettings;
  you: { id: PlayerId; isHost: boolean };
  /** Empty when the game can start. */
  startBlockers: Array<StartBlocker>;
}

/** What a role learns on the first night. Built per viewer on the server. */
export type Knowledge =
  | { kind: "none" }
  /** Merlin: the Evil players he can see (never Mordred). */
  | { kind: "merlin"; evilIds: Array<PlayerId> }
  /** Percival: Merlin and Morgana, shuffled, not told apart. */
  | { kind: "percival"; merlinCandidateIds: Array<PlayerId> }
  /** Assassin, Minion, Mordred, Morgana: fellow Evil players (never Oberon). */
  | { kind: "evil"; allyIds: Array<PlayerId> };

export type Vote = "approve" | "reject";
export type QuestCard = "success" | "fail";

export interface QuestView {
  teamSize: number;
  failsRequired: 1 | 2;
  status: "upcoming" | "current" | "success" | "fail";
  /** Set once the quest is finished. Team membership is public. */
  team?: Array<PlayerId>;
  /** Set once the quest is finished. Counts only, never who played what. */
  failCount?: number;
}

/** One finished team vote. Votes are public once everyone has voted. */
export interface ProposalRecord {
  questIndex: number;
  leaderId: PlayerId;
  team: Array<PlayerId>;
  votes: Record<PlayerId, Vote>;
  approved: boolean;
}

export type WinReason =
  | "three_quests_failed"
  | "five_rejections"
  | "merlin_assassinated"
  | "merlin_survived";

export type PhaseView =
  /** Everyone looks at their role in private and confirms. */
  | {
      name: "role_reveal";
      confirmedIds: Array<PlayerId>;
      youConfirmed: boolean;
    }
  /** The leader picks a team. `draftIds` updates live as they tap seats. */
  | { name: "team_building"; teamSize: number; draftIds: Array<PlayerId> }
  /** Everyone votes. Only who has voted is visible until all votes are in. */
  | {
      name: "team_vote";
      teamIds: Array<PlayerId>;
      votedIds: Array<PlayerId>;
      yourVote: Vote | null;
    }
  /** The team plays cards. `yourCard` is null if you are not on the team. */
  | {
      name: "quest";
      teamIds: Array<PlayerId>;
      playedIds: Array<PlayerId>;
      onTeam: boolean;
      yourCard: QuestCard | null;
    }
  /** Optional rule. The holder of the Lady of the Lake examines one player. */
  | { name: "lady"; holderId: PlayerId; eligibleIds: Array<PlayerId> }
  /** Good won three quests. The Assassin names Merlin. */
  | {
      name: "assassination";
      assassinId: PlayerId;
      candidateIds: Array<PlayerId>;
    }
  | {
      name: "game_over";
      winner: Alignment;
      reason: WinReason;
      /** Every role is revealed only here. */
      roles: Record<PlayerId, Role>;
      assassinTargetId: PlayerId | null;
    };

export interface GameView {
  stage: "game";
  code: RoomCode;
  /** In seat order (clockwise). The leader token moves along this order. */
  players: Array<SeatView>;
  settings: GameSettings;
  you: {
    id: PlayerId;
    isHost: boolean;
    role: Role;
    alignment: Alignment;
    knowledge: Knowledge;
    /** Lady of the Lake results this player has seen. */
    ladyResults: Array<{ playerId: PlayerId; alignment: Alignment }>;
  };
  /** Always 5 entries. */
  quests: Array<QuestView>;
  /** 0 to 4. Index of the current quest. */
  questIndex: number;
  leaderId: PlayerId;
  /** Rejected proposals in a row for the current quest, 0 to 5. */
  rejections: number;
  score: { good: number; evil: number };
  phase: PhaseView;
  /** Every finished vote, oldest first. */
  proposals: Array<ProposalRecord>;
  /** Who holds the Lady of the Lake, if the rule is on. */
  ladyHolderId: PlayerId | null;
}

export type RoomView = LobbyView | GameView;
