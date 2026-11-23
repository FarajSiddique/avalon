import { createFileRoute } from "@tanstack/react-router";
import {
  NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
} from "@/shared/constants";
import { LobbyScreen } from "./-components/lobby/lobby-screen";
import { NoWebGLNotice } from "./-components/no-webgl-notice";
import { useStage } from "@/components/stage/stage-context";

/**
 * How you got here, from the landing: "create" (you host a new room) or
 * "join" (you are a guest in someone else's). Without it, the host's view.
 */
export interface LobbySearch {
  via?: "create" | "join";
  name?: string;
  code?: string;
}

export const Route = createFileRoute("/design/starlit/lobby")({
  head: () => ({ meta: [{ title: "Lobby · Starlit Vale" }] }),
  // The address is untrusted: each field is checked before it is kept.
  validateSearch: (search: {
    via?: unknown;
    name?: unknown;
    code?: unknown;
  }): LobbySearch => {
    const out: LobbySearch = {};

    if (search.via === "create" || search.via === "join") {
      out.via = search.via;
    }

    if (typeof search.name === "string" && search.name.trim()) {
      out.name = search.name.trim().slice(0, NAME_MAX_LENGTH);
    }

    if (typeof search.code === "string") {
      const code = normalizeRoomCode(search.code);

      if (code.length === ROOM_CODE_LENGTH) {
        out.code = code;
      }
    }

    return out;
  },
  component: LobbyPage,
});

function LobbyPage() {
  const search = Route.useSearch();
  const { status } = useStage();

  // Without WebGL (a failed stage stays failed) the game cannot be shown.
  return status === "failed" ? <NoWebGLNotice /> : <LobbyScreen {...search} />;
}
