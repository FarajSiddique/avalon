/**
 * Client-side room state. It holds the latest `RoomView` the server sent and
 * nothing else: the browser never computes game state on its own.
 */

import type { ProtocolError, Result, SeatGrant } from "@/shared/protocol";
import type { RoomCode, RoomView } from "@/shared/views";
import { clearToken, loadToken, saveToken } from "./session";
import { getSocket, type AppSocket } from "./socket";

export type RoomStatus =
  /** Waiting for the socket or for the server to answer. */
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
  transport: string | null;
}

const initial: RoomSnapshot = {
  status: "connecting",
  view: null,
  error: null,
  online: false,
  transport: null,
};

/** Create a room and remember the seat. Used by the landing page. */
export function createRoom(name: string): Promise<Result<SeatGrant>> {
  return new Promise((resolve) => {
    getSocket().emit("room:create", { name }, (result) => {
      if (result.ok) saveToken(result.data.code, result.data.token);
      resolve(result);
    });
  });
}

export class RoomClient {
  private snapshot: RoomSnapshot = initial;
  private readonly listeners = new Set<() => void>();
  private socket: AppSocket | null = null;

  constructor(private readonly code: RoomCode) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): RoomSnapshot => this.snapshot;
  readonly getServerSnapshot = (): RoomSnapshot => initial;

  start(): void {
    const socket = getSocket();
    this.socket = socket;
    socket.on("connect", this.onConnect);
    socket.on("disconnect", this.onDisconnect);
    socket.on("room:state", this.onState);
    socket.on("room:closed", this.onClosed);
    if (socket.connected) this.onConnect();
  }

  stop(): void {
    const socket = this.socket;
    if (!socket) return;
    socket.off("connect", this.onConnect);
    socket.off("disconnect", this.onDisconnect);
    socket.off("room:state", this.onState);
    socket.off("room:closed", this.onClosed);
    this.socket = null;
  }

  readonly join = (name: string): void => {
    this.set({ error: null });
    this.socket?.emit("room:join", { code: this.code, name }, (result) => {
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

  /** Runs on first connect and on every reconnect. */
  private readonly onConnect = (): void => {
    const socket = this.socket;
    if (!socket) return;
    this.set({ online: true, transport: socket.io.engine.transport.name });
    socket.io.engine.once("upgrade", (transport) => {
      this.set({ transport: transport.name });
    });
    const token = loadToken(this.code);
    if (!token) {
      this.set({ status: "needs_name" });
      return;
    }
    socket.emit("room:resume", { token }, (result) => {
      if (!result.ok) {
        clearToken(this.code);
        this.set({ status: "needs_name", view: null });
      }
    });
  };

  private readonly onDisconnect = (): void => {
    this.set({ online: false });
  };

  private readonly onState = (view: RoomView): void => {
    if (view.code !== this.code) return;
    this.set({ status: "seated", view, error: null });
  };

  private readonly onClosed = (): void => {
    clearToken(this.code);
    this.set({ status: "closed", view: null });
  };
}
