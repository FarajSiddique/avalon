/**
 * Seat tokens live in localStorage, one per room code, so a refresh or a
 * phone waking up gets the same seat back. Storage can be unavailable
 * (private mode), so every access is guarded.
 */

import type { RoomCode } from "@/shared/views";

const key = (code: RoomCode): string => `avalon:seat:${code}`;

export function loadToken(code: RoomCode): string | null {
  try {
    return window.localStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function saveToken(code: RoomCode, token: string): void {
  try {
    window.localStorage.setItem(key(code), token);
  } catch {
    // The seat still works for this page load.
  }
}

export function clearToken(code: RoomCode): void {
  try {
    window.localStorage.removeItem(key(code));
  } catch {
    // Nothing to clear.
  }
}
