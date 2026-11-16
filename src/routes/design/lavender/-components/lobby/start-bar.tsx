import { designPaths } from "@/design/directions";
import { PixelIcon } from "../pixel/pixel-sprite";
import { ActionBar } from "../ui/action-bar";
import { GatedLink, PixelButton } from "../ui/pixel-button";

const paths = designPaths("lavender");

/**
 * Ready and Start. Fixed to the bottom of a phone (the thumb zone); a
 * normal panel on a wide screen.
 */
export function StartBar({
  ready,
  canStart,
  reasons,
  onToggleReady,
  onEveryoneReady,
}: {
  ready: boolean;
  canStart: boolean;
  /** Why the game cannot start yet. Empty when it can. */
  reasons: string[];
  onToggleReady: () => void;
  onEveryoneReady: () => void;
}) {
  return (
    <ActionBar>
      <div
        role="status"
        aria-live="polite"
        className="lv-small flex min-h-10 flex-col justify-center lg:min-h-0"
      >
        {canStart ? (
          <p className="text-success flex items-center gap-2">
            <PixelIcon name="check" />
            Everyone is ready. Begin when you like.
          </p>
        ) : (
          <ul className="text-warning">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2">
                <PixelIcon name="hourglass" className="mt-[3px]" />
                {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-4">
        <PixelButton
          aria-pressed={ready}
          onClick={onToggleReady}
          className="flex-1"
        >
          <PixelIcon name={ready ? "check" : "pipEmpty"} />
          Ready
        </PixelButton>
        <GatedLink
          href={paths.role("merlin")}
          enabled={canStart}
          className="flex-1"
        >
          Start
        </GatedLink>
      </div>
      <button
        type="button"
        className="lv-link self-center"
        onClick={onEveryoneReady}
      >
        Prototype: everyone ready
      </button>
    </ActionBar>
  );
}
