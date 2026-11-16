import type { ReactNode } from "react";

/**
 * Where a screen's main action lives. On a phone it is fixed to the bottom
 * edge, in the thumb zone, clear of the home indicator. On a wide screen it
 * is an ordinary block in the layout.
 */
export function ActionBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-ink bg-surface fixed inset-x-0 bottom-0 z-40 border-t-[length:var(--px)] px-4 pt-3 pb-[max(8px,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:border-t-0 lg:bg-transparent lg:p-0 ${className ?? ""}`}
    >
      <div className="mx-auto flex max-w-[520px] flex-col gap-3 lg:max-w-none lg:gap-5">
        {children}
      </div>
    </div>
  );
}
