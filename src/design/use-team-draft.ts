import { useState } from "react";
import type { PlayerId } from "@/shared/views";

/** The leader's team picks: tap a seat to add it, tap again to remove it. */
export interface TeamDraft {
  draftIds: Array<PlayerId>;
  toggle: (id: PlayerId) => void;
  isPicked: (id: PlayerId) => boolean;
  /** True when the team is the exact size the quest needs. */
  complete: boolean;
  remaining: number;
}

export function useTeamDraft(
  teamSize: number,
  initial: ReadonlyArray<PlayerId> = [],
): TeamDraft {
  const [draftIds, setDraftIds] = useState<Array<PlayerId>>([...initial]);

  return {
    draftIds,
    isPicked: (id) => draftIds.includes(id),
    complete: draftIds.length === teamSize,
    remaining: teamSize - draftIds.length,
    toggle: (id) =>
      setDraftIds((current) => {
        if (current.includes(id)) {
          return current.filter((x) => x !== id);
        }

        if (current.length >= teamSize) {
          return current;
        }

        return [...current, id];
      }),
  };
}
