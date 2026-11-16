import { createFileRoute } from "@tanstack/react-router";
import { LobbyScreen } from "./-components/lobby/lobby-screen";

export const Route = createFileRoute("/design/starlit/lobby")({
  head: () => ({ meta: [{ title: "Lobby · Starlit Vale" }] }),
  component: LobbyScreen,
});
