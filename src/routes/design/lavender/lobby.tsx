import { createFileRoute } from "@tanstack/react-router";
import { LobbyScreen } from "./-components/lobby/lobby-screen";

function LobbyPage() {
  return <LobbyScreen />;
}

export const Route = createFileRoute("/design/lavender/lobby")({
  head: () => ({ meta: [{ title: "Lobby · Lavender Vigil" }] }),
  component: LobbyPage,
});
