/**
 * Client-side room state. It holds the latest `RoomView` the room sent and
 * nothing else: the browser never computes game state on its own.
 */

import type { ProtocolError } from "@/shared/protocol";
import type { RoomCode, RoomView } from "@/shared/views";
import { RoomConnection } from "./connection";
import { clearToken, loadToken, saveToken } from "./session";

export type RoomStatus =
  /** Waiting for the socket or for the room to answer. */
  | "connecting"
  /** No seat in this room yet. Show the name form. */
  | "needs_name"
  /** Seated. `view` is set. */
  | "seated"
  /** The room is gone. */
  | "closed";

export interface RoomSnapshot {
  status: RoomStatus;
  view: RoomView | null;
  error: ProtocolError | null;
  /** False while the socket is reconnecting. */
  online: boolean;
}

const initial: RoomSnapshot = {
  status: "connecting",
  view: null,
  error: null,
  online: false,
};

export class RoomClient {
  private snapshot: RoomSnapshot = initial;
  private readonly listeners = new Set<() => void>();
  private readonly connection: RoomConnection;

  constructor(private readonly code: RoomCode) {
    this.connection = new RoomConnection(code, {
      onOpen: this.onOpen,
      onDrop: () => this.set({ online: false }),
      onState: (view) => this.set({ status: "seated", view, error: null }),
      onClosed: () => {
        clearToken(this.code);
        this.set({ status: "closed", view: null, online: false });
      },
    });
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): RoomSnapshot => this.snapshot;
  readonly getServerSnapshot = (): RoomSnapshot => initial;

  start(): void {
    this.connection.start();
  }

  stop(): void {
    this.connection.stop();
  }

  readonly join = (name: string): void => {
    this.set({ error: null });
    void this.connection.request("room:join", { name }).then((result) => {
      if (result.ok) {
        saveToken(result.data.code, result.data.token);
      } else {
        this.set({
          error: result.error,
          status:
            result.error.code === "ROOM_NOT_FOUND" ? "closed" : "needs_name",
        });
      }
    });
  };

  private set(patch: Partial<RoomSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  /** Runs on the first connect and on every reconnect: take the seat back. */
  private readonly onOpen = (): void => {
    this.set({ online: true });
    const token = loadToken(this.code);
    if (!token) {
      this.set({ status: "needs_name" });
      return;
    }
    void this.connection.request("room:resume", { token }).then((result) => {
      if (result.ok || result.error.code === "OFFLINE") return;
      clearToken(this.code);
      this.set({ status: "needs_name", view: null });
    });
  };
}
