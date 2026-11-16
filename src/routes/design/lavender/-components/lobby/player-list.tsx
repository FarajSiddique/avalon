import { MAX_PLAYERS } from "@/shared/constants";
import type { LobbyView, SeatView } from "@/shared/views";
import { Helm, PixelIcon } from "../pixel/pixel-sprite";
import type { IconName } from "../pixel/sprites";
import { Panel } from "../ui/panel";

type Presence = "ready" | "waiting" | "away";

const PRESENCE: Record<
  Presence,
  { label: string; icon: IconName; className: string }
> = {
  ready: { label: "Ready", icon: "check", className: "text-success" },
  waiting: { label: "Not ready", icon: "hourglass", className: "text-warning" },
  away: { label: "Away", icon: "moon", className: "text-ink-muted" },
};

function presenceOf(player: SeatView): Presence {
  if (!player.connected) return "away";
  return player.ready ? "ready" : "waiting";
}

export function PlayerList({ view }: { view: LobbyView }) {
  const open = MAX_PLAYERS - view.players.length;
  return (
    <Panel
      title="Knights at the fire"
      aside={
        <span className="lv-label text-ink">
          {view.players.length} of {MAX_PLAYERS}
        </span>
      }
    >
      <ul>
        {view.players.map((player, index) => {
          const presence = PRESENCE[presenceOf(player)];
          const away = !player.connected;
          return (
            <li
              key={player.id}
              className="border-line flex min-h-[60px] items-center gap-3 border-b-[length:var(--px)] px-4 py-2"
            >
              <Helm seatIndex={index} className={away ? "opacity-50" : ""} />
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={`truncate text-[24px] leading-none ${away ? "text-ink-muted" : ""}`}
                >
                  {player.name}
                </span>
                {player.id === view.you.id ? (
                  <span className="lv-tag [--tag-face:var(--accent)] [--tag-ink:var(--on-accent)]">
                    You
                  </span>
                ) : null}
                {player.isHost ? (
                  <span className="lv-tag">
                    <PixelIcon name="crown" />
                    Host
                  </span>
                ) : null}
              </span>
              <span
                className={`flex shrink-0 items-center gap-2 ${presence.className}`}
              >
                <PixelIcon name={presence.icon} />
                {presence.label}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="lv-small text-ink-muted px-4 py-3">
        {open === 0
          ? "The camp is full."
          : `${open} more ${open === 1 ? "seat" : "seats"} by the fire.`}
      </p>
    </Panel>
  );
}
