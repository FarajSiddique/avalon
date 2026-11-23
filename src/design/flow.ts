import { TABLE_STEPS, isTableStep } from "./directions";

/**
 * Is going from one prototype screen to the other the game's next step
 * (lobby, role card, then the table's steps in order, round again)? Then
 * the camera moves; any other jump cuts.
 */
export function isPrototypeNextInFlow(from: string, to: string): boolean {
  const a = screenOf(from);
  const b = screenOf(to);

  if (!a || !b) {
    return false;
  }

  if (a === "lobby") {
    return b.startsWith("role/");
  }

  // Your own card continues to the table. The Assassin's card is another
  // seat (a prototype detour), so its Continue cuts.
  if (a === "role/merlin") {
    return b === "table/propose";
  }

  if (a.startsWith("table/") && b.startsWith("table/")) {
    const step = a.slice(6);

    if (!isTableStep(step)) {
      return false;
    }

    const i = TABLE_STEPS.indexOf(step);

    return b.slice(6) === TABLE_STEPS[(i + 1) % TABLE_STEPS.length];
  }

  return false;
}

function screenOf(path: string): string | null {
  const match = /\/design\/starlit\/(lobby|role\/[^/]+|table\/[^/]+)\/?$/.exec(
    path,
  );

  return match?.[1] ?? null;
}
