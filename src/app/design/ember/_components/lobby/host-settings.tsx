"use client";

import { TEAM_BALANCE, isPlayerCount } from "@/shared/constants";
import { OPTIONAL_ROLES, ROLES, type OptionalRole } from "@/shared/roles";
import type { LobbyView } from "@/shared/views";
import { DaggerIcon, LakeIcon, ShieldIcon } from "../art/icons";
import { Frame, FrameTitle } from "../ui/frame";
import { SwitchRow } from "../ui/switch";

/** One line per optional role, written for the host choosing the mix. */
const ROLE_LINES: Record<OptionalRole, string> = {
  percival: "Sees Merlin and Morgana, and cannot tell them apart.",
  morgana: "Appears as Merlin to Percival.",
  mordred: "Stays hidden from Merlin.",
  oberon: "Unknown to the other Evil players, and they to him.",
};

function AlignmentBadge({ role }: { role: OptionalRole }) {
  const good = ROLES[role].alignment === "good";
  return (
    <span
      className={`ember-well grid h-10 w-10 shrink-0 place-items-center ${
        good ? "text-good" : "text-evil"
      }`}
      aria-hidden="true"
    >
      {good ? <ShieldIcon size={22} /> : <DaggerIcon size={22} />}
    </span>
  );
}

export function HostSettings({
  view,
  onToggleRole,
  onToggleLady,
  className,
}: {
  view: LobbyView;
  onToggleRole: (role: OptionalRole) => void;
  onToggleLady: () => void;
  className?: string;
}) {
  const count = view.players.length;
  const balance = isPlayerCount(count) ? TEAM_BALANCE[count] : null;

  return (
    <Frame
      aria-label="Host settings"
      className={`px-5 pt-6 pb-4 lg:px-7 ${className ?? ""}`}
    >
      <FrameTitle aside="Host">Roles in play</FrameTitle>

      {balance ? (
        <p className="ember-well flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5">
          <span>{count} players:</span>
          <span className="text-good flex items-center gap-1.5 font-semibold">
            <ShieldIcon size={18} />
            {balance.good} Good
          </span>
          <span>and</span>
          <span className="text-evil flex items-center gap-1.5 font-semibold">
            <DaggerIcon size={18} />
            {balance.evil} Evil
          </span>
        </p>
      ) : null}
      <p className="text-ink-muted mt-2 text-[1.0625rem]">
        Merlin and the Assassin always play. Add to them:
      </p>

      <div className="mt-1 -ml-2 flex flex-col">
        {OPTIONAL_ROLES.map((role) => (
          <SwitchRow
            key={role}
            checked={view.settings.optionalRoles.includes(role)}
            onToggle={() => onToggleRole(role)}
            label={ROLES[role].name}
            description={
              <>
                <span
                  className={
                    ROLES[role].alignment === "good" ? "text-good" : "text-evil"
                  }
                >
                  {ROLES[role].alignment === "good" ? "Good." : "Evil."}
                </span>{" "}
                {ROLE_LINES[role]}
              </>
            }
            icon={<AlignmentBadge role={role} />}
          />
        ))}
      </div>

      <div className="ember-divider my-2" role="presentation">
        <span className="ember-label">Optional rule</span>
      </div>

      <div className="-ml-2">
        <SwitchRow
          checked={view.settings.ladyOfTheLake}
          onToggle={onToggleLady}
          label="Lady of the Lake"
          description="After quests 2, 3 and 4, her holder learns one player's loyalty."
          icon={
            <span
              className="ember-well text-accent-cool grid h-10 w-10 shrink-0 place-items-center"
              aria-hidden="true"
            >
              <LakeIcon size={22} />
            </span>
          }
        />
      </div>
    </Frame>
  );
}
