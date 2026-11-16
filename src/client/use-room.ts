"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RoomCode } from "@/shared/views";
import { RoomClient, type RoomSnapshot } from "./room-client";

export interface UseRoom extends RoomSnapshot {
  join: (name: string) => void;
}

export function useRoom(code: RoomCode): UseRoom {
  const [client] = useState(() => new RoomClient(code));

  useEffect(() => {
    client.start();
    return () => client.stop();
  }, [client]);

  const snapshot = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getServerSnapshot,
  );

  return { ...snapshot, join: client.join };
}
