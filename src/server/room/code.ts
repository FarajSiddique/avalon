import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@/shared/constants";
import type { RoomCode } from "@/shared/views";

/** A random room code. `randomInt(max)` returns a uniform integer in [0, max). */
export function randomRoomCode(randomInt: (max: number) => number): RoomCode {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += ROOM_CODE_ALPHABET.charAt(randomInt(ROOM_CODE_ALPHABET.length));
  }
  return code;
}

/** Uniform integer in [0, max) from the platform's secure random source. */
export function secureRandomInt(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0] ?? 0;
    if (value < limit) return value % max;
  }
}
