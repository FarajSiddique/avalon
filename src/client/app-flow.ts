import { ROOM_CODE_PATTERN } from "@/shared/constants";

const ROOM_PATH = /^\/room\/([^/]+)\/?$/;

/**
 * Is going from one address to the other the game's next step? Then the
 * stage's camera flies; otherwise it cuts. In the real app only the landing
 * to a room is: creating or joining one.
 */
export function isAppNextInFlow(from: string, to: string): boolean {
  const code = ROOM_PATH.exec(to)?.[1];

  return from === "/" && code !== undefined && ROOM_CODE_PATTERN.test(code);
}
