/**
 * The browser's connection to one room: a WebSocket that reconnects by
 * itself, with request and answer on top.
 *
 * Nothing above this file knows it is a WebSocket. Screens use `request` and
 * the callbacks, so the transport can change without touching them.
 */

import {
  CLOSE_ROOM_GONE,
  PING,
  PONG,
  SOCKET_PATH,
  type ClientMessage,
  type Result,
  type RoomClosedReason,
  type RoomEvent,
  type RoomRequests,
  type ServerMessage,
} from "@/shared/protocol";
import type { RoomCode, RoomView } from "@/shared/views";

export interface ConnectionEvents {
  /** The socket is open. Runs on the first connect and on every reconnect. */
  onOpen: () => void;
  /** The socket dropped. A reconnect is already scheduled. */
  onDrop: () => void;
  onState: (view: RoomView) => void;
  /** The room is gone for good. No reconnect follows. */
  onClosed: (reason: RoomClosedReason) => void;
}

const REQUEST_TIMEOUT_MS = 8000;
const HEARTBEAT_EVERY_MS = 20_000;
const HEARTBEAT_GRACE_MS = 8000;
const RETRY_MIN_MS = 400;
const RETRY_MAX_MS = 8000;

const offline: Result<never> = {
  ok: false,
  error: { code: "OFFLINE", message: "You are offline. Trying to reconnect." },
};

const SERVER_MESSAGE_TYPES: ReadonlySet<unknown> = new Set<
  ServerMessage["type"]
>(["ack", "state", "closed"]);

/** Drops anything that is not one of the room's messages. */
function isServerMessage(value: unknown): value is ServerMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    SERVER_MESSAGE_TYPES.has(value.type)
  );
}

interface Pending {
  resolve: (result: Result<unknown>) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class RoomConnection {
  private socket: WebSocket | null = null;
  private stopped = true;
  private nextId = 1;
  private retryMs = RETRY_MIN_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastPong = 0;
  private readonly pending = new Map<number, Pending>();

  constructor(
    private readonly code: RoomCode,
    private readonly events: ConnectionEvents,
  ) {}

  start(): void {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    document.addEventListener("visibilitychange", this.onVisible);
    window.addEventListener("online", this.onVisible);
    this.open();
  }

  stop(): void {
    this.stopped = true;
    document.removeEventListener("visibilitychange", this.onVisible);
    window.removeEventListener("online", this.onVisible);

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = null;
    this.teardown();
  }

  /** Send a request to the room and wait for its answer. Never rejects. */
  request<E extends RoomEvent>(
    event: E,
    payload: RoomRequests[E]["input"],
  ): Promise<Result<RoomRequests[E]["output"]>> {
    const socket = this.socket;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.resolve(offline);
    }

    const id = this.nextId;

    this.nextId += 1;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve(offline);
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, {
        // The room answers each event with that event's output type (see
        // RoomRequests). The browser does not ship zod, so this is trusted.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- protocol boundary, typed by RoomRequests
        resolve: resolve as (result: Result<unknown>) => void,
        timer,
      });
      const message: ClientMessage = { id, event, payload };

      socket.send(JSON.stringify(message));
    });
  }

  private open(): void {
    if (this.stopped || this.socket) {
      return;
    }

    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${scheme}//${window.location.host}${SOCKET_PATH}/${this.code}`,
    );

    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.socket !== socket) {
        return;
      }

      this.retryMs = RETRY_MIN_MS;
      this.lastPong = Date.now();
      this.heartbeat = setInterval(this.beat, HEARTBEAT_EVERY_MS);
      this.events.onOpen();
    });

    socket.addEventListener("message", (event) => {
      if (this.socket !== socket || typeof event.data !== "string") {
        return;
      }

      if (event.data === PONG) {
        this.lastPong = Date.now();

        return;
      }

      const message: unknown = JSON.parse(event.data);

      if (isServerMessage(message)) {
        this.receive(message);
      }
    });

    socket.addEventListener("close", (event) => {
      if (this.socket !== socket) {
        return;
      }

      this.teardown();

      if (this.stopped) {
        return;
      }

      if (event.code === CLOSE_ROOM_GONE) {
        this.stopped = true;

        return;
      }

      this.events.onDrop();
      this.scheduleRetry();
    });
  }

  private receive(message: ServerMessage): void {
    switch (message.type) {
      case "ack": {
        const pending = this.pending.get(message.id);

        if (!pending) {
          return;
        }

        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        pending.resolve(message.result);

        return;
      }

      case "state":
        this.events.onState(message.view);

        return;
      case "closed":
        this.events.onClosed(message.reason);

        return;
    }
  }

  /** Drop the socket and answer everything still waiting. */
  private teardown(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
    }

    this.heartbeat = null;
    const socket = this.socket;

    this.socket = null;

    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close();
    }

    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.resolve(offline);
      this.pending.delete(id);
    }
  }

  private scheduleRetry(): void {
    if (this.stopped || this.retryTimer) {
      return;
    }

    const wait = this.retryMs * (0.75 + Math.random() * 0.5);

    this.retryMs = Math.min(this.retryMs * 2, RETRY_MAX_MS);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.open();
    }, wait);
  }

  /** A phone that slept can hold a dead socket. Ping finds out. */
  private readonly beat = (): void => {
    const socket = this.socket;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (Date.now() - this.lastPong > HEARTBEAT_EVERY_MS + HEARTBEAT_GRACE_MS) {
      socket.close();

      return;
    }

    socket.send(PING);
  };

  /** Coming back to the tab or the network: do not wait out the backoff. */
  private readonly onVisible = (): void => {
    if (this.stopped || document.hidden || this.socket) {
      return;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = null;
    this.retryMs = RETRY_MIN_MS;
    this.open();
  };
}
