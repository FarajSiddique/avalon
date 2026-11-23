import { useState, useSyncExternalStore } from "react";
import type { RoomCode } from "@/shared/views";
import { RoomClient, type RoomSnapshot } from "./room-client";

export interface UseRoom extends RoomSnapshot {
  join: (name: string) => void;
  kick: (playerId: string) => void;
  leave: () => void;
  rejoin: () => void;
}

/** The room's latest state. Subscribing opens the socket; see RoomClient. */
export function useRoom(code: RoomCode): UseRoom {
  const [client] = useState(() => new RoomClient(code));

  const snapshot = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getServerSnapshot,
  );

  return {
    ...snapshot,
    join: client.join,
    kick: client.kick,
    leave: client.leave,
    rejoin: client.rejoin,
  };
}
