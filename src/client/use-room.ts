import { useState, useSyncExternalStore } from "react";
import type { RoomCode } from "@/shared/views";
import { RoomClient, type RoomSnapshot } from "./room-client";

export interface UseRoom extends RoomSnapshot {
  /** The room's client, for screens that send more than these. */
  client: RoomClient;
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
    client,
    join: client.join,
    kick: client.kick,
    leave: client.leave,
    rejoin: client.rejoin,
  };
}
