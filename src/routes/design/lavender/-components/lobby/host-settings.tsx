import { TEAM_BALANCE, isPlayerCount } from "@/shared/constants";
import { OPTIONAL_ROLES, ROLES, type OptionalRole } from "@/shared/roles";
import type { LobbyView } from "@/shared/views";
import { PixelIcon } from "../pixel/pixel-sprite";
import { AlignmentBadge } from "../ui/alignment-badge";
import { Panel } from "../ui/panel";
import { PixelSwitch } from "../ui/pixel-switch";

/** One line each, written for the host choosing the rules. */
const ROLE_LINES: Record<OptionalRole, string> = {
  percival: "Sees Merlin and Morgana as one.",
  morgana: "Looks like Merlin to Percival.",
  mordred: "Stays hidden from Merlin.",
  oberon: "Evil, but unknown to the other Evil players.",
};

export function HostSettings({
  view,
  onToggleRole,
  onToggleLady,
}: {
  view: LobbyView;
  onToggleRole: (role: OptionalRole) => void;
  onToggleLady: () => void;
}) {
  const count = view.players.length;
  const balance = isPlayerCount(count) ? TEAM_BALANCE[count] : null;

  return (
    <Panel
      title="Rules of this camp"
      aside={<span className="lv-tag">Host</span>}
    >
      {OPTIONAL_ROLES.map((role) => (
        <PixelSwitch
          key={role}
          checked={view.settings.optionalRoles.includes(role)}
          onChange={() => onToggleRole(role)}
          label={ROLES[role].name}
          description={ROLE_LINES[role]}
          badge={<AlignmentBadge alignment={ROLES[role].alignment} />}
        />
      ))}
      <PixelSwitch
        checked={view.settings.ladyOfTheLake}
        onChange={onToggleLady}
        label="Lady of the Lake"
        description="From quest 2, its holder may learn one player's loyalty."
      />
      {balance ? (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
          <span>{count} players:</span>
          <span className="text-good flex items-center gap-2">
            <PixelIcon name="shield" />
            {balance.good} Good
          </span>
          <span className="text-evil flex items-center gap-2">
            <PixelIcon name="horns" />
            {balance.evil} Evil
          </span>
        </p>
      ) : null}
    </Panel>
  );
}
