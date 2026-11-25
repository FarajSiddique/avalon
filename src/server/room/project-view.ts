/**
 * The only path from room state to the wire.
 *
 * `projectView` builds what one player may see. Nothing else in the codebase
 * is allowed to serialize a `RoomState` for a client. When the game engine
 * lands, this is where roles, unrevealed votes and quest cards are filtered
 * per viewer.
 */

import { MIN_PLAYERS } from "@/shared/constants";
import type {
  LobbyView,
  PlayerId,
  RoomView,
  SeatView,
  StartBlocker,
} from "@/shared/views";
import { settingsBlockers } from "../game/setup";
import type { RoomState } from "./state";

function seatViews(
  state: RoomState,
  connected: ReadonlySet<PlayerId>,
): Array<SeatView> {
  return state.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.id === state.hostId,
    connected: connected.has(p.id),
    ready: p.ready,
    // A copy: the stored object never goes out as is.
    avatar: { ...p.avatar },
  }));
}

function startBlockers(
  state: RoomState,
  connected: ReadonlySet<PlayerId>,
): Array<StartBlocker> {
  const blockers: Array<StartBlocker> = [];

  if (state.players.length < MIN_PLAYERS) {
    blockers.push({
      kind: "too_few_players",
      needed: MIN_PLAYERS - state.players.length,
    });
  }

  const away = state.players.filter((p) => !connected.has(p.id));

  if (away.length > 0) {
    blockers.push({ kind: "disconnected", playerIds: away.map((p) => p.id) });
  }

  // The host has no ready: pressing Start is the host's ready.
  const notReady = state.players.filter(
    (p) => p.id !== state.hostId && !p.ready,
  );

  if (notReady.length > 0) {
    blockers.push({ kind: "not_ready", playerIds: notReady.map((p) => p.id) });
  }

  // Checked against the seats now, not when the settings were saved.
  blockers.push(...settingsBlockers(state.players.length, state.settings));

  return blockers;
}

/**
 * @param connected ids of the players with at least one open socket. This is
 *   live information the room object has and the stored state does not.
 */
export function projectView(
  state: RoomState,
  viewerId: PlayerId,
  connected: ReadonlySet<PlayerId>,
): RoomView {
  const view: LobbyView = {
    stage: "lobby",
    code: state.code,
    players: seatViews(state, connected),
    settings: {
      optionalRoles: [...state.settings.optionalRoles],
      ladyOfTheLake: state.settings.ladyOfTheLake,
    },
    you: { id: viewerId, isHost: viewerId === state.hostId },
    startBlockers: startBlockers(state, connected),
  };

  return view;
}
