/**
 * Client-side room state. It holds the latest `RoomView` the room sent and
 * nothing else: the browser never computes game state on its own.
 */

import type { StoreApi } from "zustand/vanilla";
import type { ProtocolError } from "@/shared/protocol";
import type { RoomCode, RoomView } from "@/shared/views";
import { RoomConnection } from "./connection";
import { createDevStore } from "./dev-store";
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

/**
 * The socket is open while anything is subscribed: the first subscriber
 * opens it and the last one closes it, so a component reads the room with
 * `useSyncExternalStore` and needs no effect. Closing waits a microtask,
 * because React StrictMode unsubscribes and subscribes again in the same
 * commit and that must not drop the socket.
 */
export class RoomClient {
  private readonly store: StoreApi<RoomSnapshot>;
  private readonly connection: RoomConnection;
  private subscribers = 0;

  constructor(private readonly code: RoomCode) {
    this.store = createDevStore<RoomSnapshot>(`room:${code}`, () => initial);
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
    const unsubscribe = this.store.subscribe(listener);

    this.subscribers += 1;
    this.connection.start();

    return () => {
      unsubscribe();
      this.subscribers -= 1;
      queueMicrotask(this.stopIfUnused);
    };
  };

  readonly getSnapshot = (): RoomSnapshot => this.store.getState();
  readonly getServerSnapshot = (): RoomSnapshot => initial;

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
    this.store.setState(patch);
  }

  private readonly stopIfUnused = (): void => {
    if (this.subscribers === 0) {
      this.connection.stop();
    }
  };

  /** Runs on the first connect and on every reconnect: take the seat back. */
  private readonly onOpen = (): void => {
    this.set({ online: true });
    const token = loadToken(this.code);

    if (!token) {
      this.set({ status: "needs_name" });

      return;
    }

    void this.connection.request("room:resume", { token }).then((result) => {
      if (result.ok || result.error.code === "OFFLINE") {
        return;
      }

      clearToken(this.code);
      this.set({ status: "needs_name", view: null });
    });
  };
}
