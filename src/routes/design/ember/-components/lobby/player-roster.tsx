import { MAX_PLAYERS } from "@/shared/constants";
import type { LobbyView, SeatView } from "@/shared/views";
import { CheckIcon, CrownIcon, HourglassIcon, MoonIcon } from "../art/icons";
import { Medallion } from "../art/medallion";
import { WaxSeal } from "../art/wax-seal";
import { Frame, FrameTitle } from "../ui/frame";

type Presence = "ready" | "waiting" | "away";

function presenceOf(player: SeatView): Presence {
  if (!player.connected) return "away";
  return player.ready ? "ready" : "waiting";
}

/** Ready, not ready, away: each has its own mark, word and colour. */
function PresenceMark({ presence }: { presence: Presence }) {
  switch (presence) {
    case "ready":
      return (
        <span className="text-success flex items-center gap-2">
          <WaxSeal tone="laurel" size={26}>
            <CheckIcon size={15} />
          </WaxSeal>
          <span className="ember-label">Ready</span>
        </span>
      );
    case "waiting":
      return (
        <span className="text-warning flex items-center gap-2">
          <WaxSeal tone="empty" size={26}>
            <HourglassIcon size={15} className="text-warning" />
          </WaxSeal>
          <span className="ember-label">Not ready</span>
        </span>
      );
    case "away":
      return (
        <span className="text-ink-muted flex items-center gap-2">
          <WaxSeal tone="empty" size={26}>
            <MoonIcon size={15} />
          </WaxSeal>
          <span className="ember-label">Away</span>
        </span>
      );
  }
}

function RosterRow({ player, isYou }: { player: SeatView; isYou: boolean }) {
  const presence = presenceOf(player);
  return (
    <li className="flex min-h-16 items-center gap-3 py-2">
      <Medallion
        name={player.name}
        size={46}
        you={isYou}
        away={presence === "away"}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`ember-carved truncate text-[1.0625rem] ${
            presence === "away" ? "text-ink-muted" : "text-ink"
          }`}
        >
          {player.name}
        </p>
        {player.isHost || isYou ? (
          <p className="text-accent-strong flex items-center gap-1.5 text-[1.0625rem] leading-tight">
            {player.isHost ? (
              <>
                <CrownIcon size={15} />
                <span>Host</span>
              </>
            ) : null}
            {player.isHost && isYou ? (
              <span aria-hidden="true" className="text-ink-muted">
                ·
              </span>
            ) : null}
            {isYou ? <span>You</span> : null}
          </p>
        ) : null}
      </div>
      <PresenceMark presence={presence} />
    </li>
  );
}

export function PlayerRoster({
  view,
  className,
}: {
  view: LobbyView;
  className?: string;
}) {
  return (
    <Frame
      aria-label="Players"
      className={`px-5 pt-6 pb-4 lg:px-7 ${className ?? ""}`}
    >
      <FrameTitle aside={`${view.players.length} of ${MAX_PLAYERS}`}>
        At the table
      </FrameTitle>
      <ul className="divide-y divide-(--frame-outer)">
        {view.players.map((player) => (
          <RosterRow
            key={player.id}
            player={player}
            isYou={player.id === view.you.id}
          />
        ))}
      </ul>
    </Frame>
  );
}
