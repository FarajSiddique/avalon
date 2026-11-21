import type { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import type { Avatar } from "@/design/avatar";
import type { QuestCard } from "@/shared/views";
import type { Palette } from "./palette";

/** Someone in the lobby, as the table draws them. */
export interface TablePlayer {
  id: string;
  name: string;
  avatar: Avatar;
  isHost: boolean;
  isYou: boolean;
  connected: boolean;
  ready: boolean;
}

export interface Pointer {
  /** -1 (left) to 1 (right), smoothed. */
  x: number;
  /** -1 (bottom) to 1 (top), smoothed. */
  y: number;
}

/** How the camera travels from the landing to the lobby, or back. */
export type FlightPath = "create" | "join" | "back";

export interface Flight {
  path: FlightPath;
  /** 0 to 1 along the flight, by the wall clock. */
  progress: number;
}

/**
 * Where the camera looks once the game is under way. The lobby framing is
 * blend 1; these shots are a separate axis beyond it.
 * - role: low behind your seat, looking across the table.
 * - table: high over the table, every figure and tag in view.
 * - team: drawn in on the glowing team (the quest).
 * - cards: over the table's centre, where quest cards land and turn.
 */
export type TableShot = "role" | "table" | "team" | "cards";

/**
 * What the game shows in the scene. Display only: it never carries a vote,
 * a role, or who played which card. Everything it shows is also said in
 * text (the tags and panels).
 */
export interface TablePlay {
  shot: TableShot;
  /** The leader's ring is lit. Null: nobody's. */
  leaderId: string | null;
  /** These figures glow and lines of light join them. Empty: no team. */
  teamIds: readonly string[];
  /**
   * Quest cards lying face down at the table's centre, in shuffled order
   * (never placed by or near the seat that played them). Null: none.
   */
  cards: readonly QuestCard[] | null;
  /** How many of `cards` are face up, from the first. */
  cardsShown: number;
}

export interface Frame {
  /** Seconds since the scene started (scaled by the ambient tempo). */
  time: number;
  /** Seconds since the last frame, clamped. */
  dt: number;
  pointer: Pointer;
  /**
   * The stage only: 0 is the landing framing, 1 the lobby framing, and
   * anything between is mid-flight. Unset, the variant decides.
   */
  blend?: number;
  /** The stage only: the flight under way, if any. */
  flight?: Flight | null;
}

export interface Layout {
  width: number;
  height: number;
  aspect: number;
  /**
   * True when the canvas is a wide backdrop with the title and form on its
   * left: the subject should sit in the right-hand part of the frame.
   */
  wide: boolean;
}

export interface SceneContext {
  renderer: WebGLRenderer;
  palette: Palette;
  /** Fewer particles and cheaper effects on small screens. */
  lite: boolean;
  /** "lobby": framed on the whole table, seats show the players given. */
  variant: "hero" | "lobby";
}

export interface ConceptScene {
  scene: Scene;
  camera: PerspectiveCamera;
  update(frame: Frame): void;
  resize(layout: Layout): void;
  dispose(): void;
  /** Bloom tuned per scene. */
  bloom: { strength: number; radius: number; threshold: number };
  /** The moment shown as a still frame when motion is reduced. */
  posterTime: number;
  /** Lobby: who is at the table. Arrivals and departures animate. */
  setPlayers?(players: readonly TablePlayer[]): void;
  /** Lobby: where each player's name tag goes, in world space. */
  anchors?(): ReadonlyMap<string, Vector3>;
  /** Lobby: how many figures are standing at the table now. */
  seated?(): number;
  /** Finish any arrival or departure at once (reduced motion, rebuilds). */
  settle?(): void;
  /** The game's state in the scene. Null: none (landing, lobby). */
  setPlay?(play: TablePlay | null): void;
  /**
   * The player whose figure is at this point, in normalised device
   * coordinates (-1 to 1, y up), or null.
   */
  pick?(x: number, y: number): string | null;
}

export type CreateConcept = (ctx: SceneContext) => ConceptScene;
