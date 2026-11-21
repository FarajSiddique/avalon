import type { ReactNode } from "react";
import { TEAM_BALANCE, isPlayerCount } from "@/shared/constants";
import { OPTIONAL_ROLES, ROLES, type OptionalRole } from "@/shared/roles";
import type { LobbyView } from "@/shared/views";
import { AlignmentTag } from "../alignment-tag";
import { IconCheck, IconRing, IconWaves } from "../icons";
import { Switch } from "../switch";

/** One line per optional role, written for the host choosing the mix. */
const ROLE_LINES: Record<OptionalRole, string> = {
  percival: "Knows who Merlin is, unless Morgana muddies it.",
  morgana: "Looks like Merlin to Percival.",
  mordred: "Stays hidden from Merlin.",
  oberon: "Evil, but unknown to the other Evil players.",
};

const LADY_LINE =
  "After quests 2, 3 and 4, its holder learns one player's loyalty.";

/**
 * The game's settings. The host switches roles and rules on and off; a
 * guest (`readOnly`) sees the same list, with each setting's state in words.
 */
export function HostSettings({
  view,
  onToggleRole,
  onToggleLady,
  readOnly = false,
}: {
  view: LobbyView;
  onToggleRole: (role: OptionalRole) => void;
  onToggleLady: () => void;
  readOnly?: boolean;
}) {
  const count = view.players.length;
  const balance = isPlayerCount(count) ? TEAM_BALANCE[count] : null;
  const ladyTag = (
    <span className="sl-chip text-accent-cool">
      <IconWaves size={14} />
      Rule
    </span>
  );

  return (
    <div>
      <p className="text-ink-muted text-base leading-snug">
        {readOnly
          ? "The host chooses these. Merlin and the Assassin always play."
          : "Merlin and the Assassin always play. Add more roles if you like."}
      </p>

      <ul className="mt-2">
        {OPTIONAL_ROLES.map((role) => {
          const on = view.settings.optionalRoles.includes(role);
          const tag = <AlignmentTag alignment={ROLES[role].alignment} />;
          return (
            <li
              key={role}
              className="border-line border-t border-dashed first:border-t-0"
            >
              {readOnly ? (
                <Setting
                  on={on}
                  label={ROLES[role].name}
                  tag={tag}
                  description={ROLE_LINES[role]}
                />
              ) : (
                <Switch
                  checked={on}
                  onToggle={() => onToggleRole(role)}
                  label={ROLES[role].name}
                  tag={tag}
                  description={ROLE_LINES[role]}
                />
              )}
            </li>
          );
        })}
        <li className="border-line border-t border-dashed">
          {readOnly ? (
            <Setting
              on={view.settings.ladyOfTheLake}
              label="Lady of the Lake"
              tag={ladyTag}
              description={LADY_LINE}
            />
          ) : (
            <Switch
              checked={view.settings.ladyOfTheLake}
              onToggle={onToggleLady}
              label="Lady of the Lake"
              tag={ladyTag}
              description={LADY_LINE}
            />
          )}
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
    </div>
  );
}

/** A setting a guest can read but not change. */
function Setting({
  on,
  label,
  tag,
  description,
}: {
  on: boolean;
  label: string;
  tag: ReactNode;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-ink text-[1.0625rem] font-bold">{label}</span>
          {tag}
        </span>
        <span className="text-ink-muted mt-0.5 block text-base leading-snug">
          {description}
        </span>
      </span>
      <span
        className={`inline-flex flex-none items-center gap-1 text-base font-bold ${on ? "text-accent" : "text-ink-muted"}`}
      >
        {on ? <IconCheck size={16} /> : <IconRing size={16} />}
        {on ? "In play" : "Off"}
      </span>
    </div>
  );
}
