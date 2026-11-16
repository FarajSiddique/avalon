import type { GameView, LobbyView, PlayerId } from "@/shared/views";

/** "Wren", "Wren and Mira", "Wren, Mira and Bram". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function nameOf(view: LobbyView | GameView, id: PlayerId): string {
  return view.players.find((player) => player.id === id)?.name ?? "Unknown";
}

export function namesOf(
  view: LobbyView | GameView,
  ids: readonly PlayerId[],
): string[] {
  return ids.map((id) => nameOf(view, id));
}

const NUMERALS = ["I", "II", "III", "IV", "V"] as const;

/** Quests are numbered in Roman numerals, as if carved. */
export function questNumeral(index: number): string {
  return NUMERALS[index] ?? String(index + 1);
}
