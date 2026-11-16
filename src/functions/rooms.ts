/**
 * Server functions for rooms. Client code may import this file: the bundler
 * replaces the handler with a network call in the browser build.
 */

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import type { Result, SeatGrant } from "@/shared/protocol";
import { createRoomSchema } from "@/shared/schemas";
import { randomRoomCode, secureRandomInt } from "@/server/room/code";

const MAX_CODE_ATTEMPTS = 20;

/**
 * Create a room with the caller as host. This is the one room operation that
 * is not a socket message, because there is no room to send it to yet.
 */
export const createRoom = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }): Promise<Result<SeatGrant>> => {
    const parsed = createRoomSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: "INVALID_PAYLOAD", message: "That name is not valid." },
      };
    }
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = randomRoomCode(secureRandomInt);
      const grant = await env.ROOM.getByName(code).create(
        code,
        parsed.data.name,
      );
      if (grant) return { ok: true, data: grant };
    }
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Could not find a free room code. Try again.",
      },
    };
  });
