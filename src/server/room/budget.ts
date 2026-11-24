/**
 * The message budget: a token bucket per socket. Pure, with the clock passed
 * in. The room object keeps one `Budget` in each socket's attachment and
 * spends from it for every message that reaches `webSocketMessage`.
 *
 * See "Message budget" in docs/architecture.md.
 */

import { MESSAGE_BURST, MESSAGE_REFILL_PER_S } from "@/shared/constants";

export interface Budget {
  /** Tokens left, fractional, from 0 to MESSAGE_BURST. */
  tokens: number;
  /** When `tokens` was last brought up to date. */
  refilledAt: number;
  /** True from the first refusal until a full burst is available again. */
  limited: boolean;
}

export interface Spent {
  budget: Budget;
  allowed: boolean;
  /** True only on the first refusal of a run, so it is logged once. */
  firstRefusal: boolean;
}

/** What a new socket starts with. */
export function fullBudget(now: number): Budget {
  return { tokens: MESSAGE_BURST, refilledAt: now, limited: false };
}

/** Spend one token for one message, after refilling for the time passed. */
export function spend(budget: Budget, now: number): Spent {
  // A clock that goes backwards refills nothing.
  const elapsed = Math.max(0, now - budget.refilledAt);
  const tokens = Math.min(
    MESSAGE_BURST,
    budget.tokens + (elapsed / 1000) * MESSAGE_REFILL_PER_S,
  );
  // Back under budget only once a whole burst is available again, so a
  // steady flood is logged once and not every time a token trickles in.
  const limited = budget.limited && tokens < MESSAGE_BURST;

  if (tokens >= 1) {
    return {
      budget: { tokens: tokens - 1, refilledAt: now, limited },
      allowed: true,
      firstRefusal: false,
    };
  }

  return {
    budget: { tokens, refilledAt: now, limited: true },
    allowed: false,
    firstRefusal: !limited,
  };
}

/**
 * The budget stored in a socket attachment. Anything that is not one (an
 * attachment written before the budget existed, from a socket that slept
 * through a deploy) reads as a full budget.
 */
export function readBudget(stored: unknown, now: number): Budget {
  if (
    typeof stored === "object" &&
    stored !== null &&
    "tokens" in stored &&
    typeof stored.tokens === "number" &&
    "refilledAt" in stored &&
    typeof stored.refilledAt === "number" &&
    "limited" in stored &&
    typeof stored.limited === "boolean"
  ) {
    return {
      tokens: stored.tokens,
      refilledAt: stored.refilledAt,
      limited: stored.limited,
    };
  }

  return fullBudget(now);
}
