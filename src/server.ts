/**
 * The Worker. One deployment serves the app and the rooms:
 *
 * - `/api/socket/CODE` WebSocket upgrades go to that room's Durable Object.
 * - Everything else goes to TanStack Start.
 */

import handler from "@tanstack/react-start/server-entry";
import { ROOM_CODE_PATTERN } from "@/shared/constants";
import { SOCKET_PATH } from "@/shared/protocol";

export { RoomObject } from "@/server/room/room-object";

const socketPrefix = `${SOCKET_PATH}/`;

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith(socketPrefix)) {
      const code = pathname.slice(socketPrefix.length);

      if (!ROOM_CODE_PATTERN.test(code)) {
        return new Response("Not found", { status: 404 });
      }

      return env.ROOM.getByName(code).fetch(request);
    }

    return handler.fetch(request);
  },
} satisfies ExportedHandler<Env>;
