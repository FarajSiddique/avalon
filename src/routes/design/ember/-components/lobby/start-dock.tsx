import { designPaths } from "@/design/directions";
import { CheckIcon, HourglassIcon } from "../art/icons";
import { WaxSeal } from "../art/wax-seal";
import { Button, ButtonLink } from "../ui/button";

const paths = designPaths("ember");

/**
 * The host's edge of the table: your own Ready toggle, the Start button and
 * the reasons it is still barred.
 */
export function StartDock({
  blockers,
  canStart,
  youReady,
  onToggleReady,
  onSimulateReady,
  className,
}: {
  blockers: string[];
  canStart: boolean;
  youReady: boolean;
  onToggleReady: () => void;
  onSimulateReady: () => void;
  className?: string;
}) {
  return (
    <section
      aria-label="Start the game"
      className={`ember-dock px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6 lg:py-6 ${className ?? ""}`}
    >
      <div className="mx-auto flex max-w-md flex-col gap-3">
        <div role="status" aria-live="polite" className="min-h-12">
          {canStart ? (
            <p className="text-success flex items-center gap-2">
              <CheckIcon size={18} />
              Everyone is seated and ready.
            </p>
          ) : (
            <ul className="text-warning flex flex-col gap-0.5 leading-snug">
              {blockers.map((message) => (
                <li key={message} className="flex items-start gap-2">
                  <HourglassIcon size={18} className="mt-1" />
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            aria-pressed={youReady}
            onClick={onToggleReady}
            className="flex-1 px-3"
          >
            <WaxSeal tone={youReady ? "laurel" : "empty"} size={24}>
              {youReady ? <CheckIcon size={14} /> : null}
            </WaxSeal>
            Ready
          </Button>
          {canStart ? (
            <ButtonLink
              href={paths.role("merlin")}
              className="ember-pulse flex-[1.5]"
            >
              Start game
            </ButtonLink>
          ) : (
            <Button disabled className="flex-[1.5]">
              Start game
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={onSimulateReady}
          className="text-ink-muted min-h-11 self-center px-3 font-sans text-sm underline underline-offset-4"
        >
          Prototype: everyone ready
        </button>
      </div>
    </section>
  );
}
