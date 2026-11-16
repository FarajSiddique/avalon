/**
 * One Socket.IO connection per browser tab, shared by every screen.
 * Same origin as the page, so there is no URL and no CORS to configure.
 */

import { io, type Socket } from "socket.io-client";
import {
  SOCKET_PATH,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@/shared/protocol";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | undefined;

export function getSocket(): AppSocket {
  socket ??= io({
    path: SOCKET_PATH,
    transports: ["websocket", "polling"],
  });
  return socket;
}
