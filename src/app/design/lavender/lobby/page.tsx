import type { Metadata } from "next";
import { LobbyScreen } from "../_components/lobby/lobby-screen";

export const metadata: Metadata = { title: "Lobby" };

export default function LobbyPage() {
  return <LobbyScreen />;
}
