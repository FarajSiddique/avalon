import { useId } from "react";
import { TEAM_BALANCE, isPlayerCount } from "@/shared/constants";
import { OPTIONAL_ROLES, ROLES, type OptionalRole } from "@/shared/roles";
import type { LobbyView } from "@/shared/views";
import { AlignmentTag } from "../alignment-tag";
import { IconWaves } from "../icons";
import { Switch } from "../switch";

/** One line per optional role, written for the host choosing the mix. */
const ROLE_LINES: Record<OptionalRole, string> = {
  percival: "Knows who Merlin is, unless Morgana muddies it.",
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
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="sl-panel p-5">
      <h2 id={headingId} className="font-display text-2xl font-medium">
        Host settings
      </h2>
      <p className="text-ink-muted mt-1 text-base leading-snug">
        Merlin and the Assassin always play. Add more roles if you like.
      </p>

      <ul className="mt-2">
        {OPTIONAL_ROLES.map((role) => (
          <li
            key={role}
            className="border-line border-t border-dashed first:border-t-0"
          >
            <Switch
              checked={view.settings.optionalRoles.includes(role)}
              onToggle={() => onToggleRole(role)}
              label={ROLES[role].name}
              tag={<AlignmentTag alignment={ROLES[role].alignment} />}
              description={ROLE_LINES[role]}
            />
          </li>
        ))}
        <li className="border-line border-t border-dashed">
          <Switch
            checked={view.settings.ladyOfTheLake}
            onToggle={onToggleLady}
            label="Lady of the Lake"
            tag={
              <span className="sl-chip text-accent-cool">
                <IconWaves size={14} />
                Rule
              </span>
            }
            description="After quests 2, 3 and 4, its holder learns one player's loyalty."
          />
        </li>
      </ul>

      {balance && (
        <p className="bg-well border-line mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-md border px-4 py-3 text-base">
          <span className="font-bold">{count} players means</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="font-bold">{balance.good}</span>
            <AlignmentTag alignment="good" />
            <span>and</span>
            <span className="font-bold">{balance.evil}</span>
            <AlignmentTag alignment="evil" />
          </span>
        </p>
      )}
    </section>
  );
}
