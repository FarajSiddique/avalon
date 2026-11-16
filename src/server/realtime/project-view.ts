/**
 * The only path from server state to the wire.
 *
 * `projectView` builds what one player may see. Nothing else in the codebase
 * is allowed to serialize a `RoomRecord`. When the game engine lands, this is
 * where roles, unrevealed votes and quest cards are filtered per viewer.
 */

import { MIN_PLAYERS } from "@/shared/constants";
import type {
  LobbyView,
  PlayerId,
  RoomView,
  SeatView,
  StartBlocker,
} from "@/shared/views";
import type { RoomRecord } from "@/server/rooms/room-store";

function seatViews(room: RoomRecord): SeatView[] {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.id === room.hostId,
    connected: p.socketIds.size > 0,
    ready: p.ready,
  }));
}

function startBlockers(room: RoomRecord): StartBlocker[] {
  const blockers: StartBlocker[] = [];
  if (room.players.length < MIN_PLAYERS) {
    blockers.push({
      kind: "too_few_players",
      needed: MIN_PLAYERS - room.players.length,
    });
  }
  const offline = room.players.filter((p) => p.socketIds.size === 0);
  if (offline.length > 0) {
    blockers.push({
      kind: "disconnected",
      playerIds: offline.map((p) => p.id),
    });
  }
  const notReady = room.players.filter((p) => !p.ready);
  if (notReady.length > 0) {
    blockers.push({ kind: "not_ready", playerIds: notReady.map((p) => p.id) });
  }
  return blockers;
}

export function projectView(room: RoomRecord, viewerId: PlayerId): RoomView {
  const view: LobbyView = {
    stage: "lobby",
    code: room.code,
    players: seatViews(room),
    settings: {
      optionalRoles: [...room.settings.optionalRoles],
      ladyOfTheLake: room.settings.ladyOfTheLake,
    },
    you: { id: viewerId, isHost: viewerId === room.hostId },
    startBlockers: startBlockers(room),
  };
  return view;
}
