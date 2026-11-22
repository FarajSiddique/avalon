/**
 * Stand-ins for `useSyncExternalStore` when a hook has nothing to follow
 * right now (a timer that is not running, a loop that is off), and for
 * subscriptions that are only held, never read. Module functions, so their
 * identity is stable and React never resubscribes because of them.
 */

/** Does nothing: the teardown of a subscription that holds nothing. */
export function noop(): void {}

/** Subscribes to nothing. */
export function noSubscription(): () => void {
  return noop;
}

/** The snapshot of a subscription that is held, never read. */
export function noSnapshot(): null {
  return null;
}
