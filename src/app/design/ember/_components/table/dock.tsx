import type { ReactNode } from "react";

/**
 * The action area. On a phone it is fixed to the bottom edge, in the thumb
 * zone, with safe-area padding. On a wide screen it is a panel under the
 * table.
 */
export function Dock({
  label,
  kicker,
  children,
  actions,
  wideActions = false,
}: {
  /** Accessible name of the region. */
  label: string;
  /** The small carved line at the top: which quest, which moment. */
  kicker: string;
  /** Explanation and status. */
  children: ReactNode;
  /** Buttons or cards. */
  actions: ReactNode;
  /** Give the actions more room on a wide screen (two cards side by side). */
  wideActions?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className="ember-dock sticky bottom-0 z-10 order-4 mt-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:col-start-2 lg:row-start-2 lg:mt-0 lg:px-7 lg:py-5"
    >
      <div className="mx-auto flex max-w-md flex-col gap-2.5 lg:max-w-none lg:flex-row lg:items-center lg:gap-8">
        <div className="min-w-0 lg:flex-1">
          <p className="ember-label text-accent-strong mb-1">{kicker}</p>
          {children}
        </div>
        <div
          className={`flex flex-col gap-2 lg:shrink-0 ${wideActions ? "lg:w-80" : "lg:w-60"}`}
        >
          {actions}
        </div>
      </div>
    </section>
  );
}
