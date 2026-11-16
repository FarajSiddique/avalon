import { createFileRoute } from "@tanstack/react-router";
import { LobbyScreen } from "./-components/lobby/lobby-screen";

function EmberLobbyPage() {
  return <LobbyScreen />;
}

export const Route = createFileRoute("/design/ember/lobby")({
  head: () => ({ meta: [{ title: "Lobby · Ember & Rune" }] }),
  component: EmberLobbyPage,
});
