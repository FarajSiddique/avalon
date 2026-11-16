import type { Metadata } from "next";
import { FreshOnReturn } from "../_components/fresh-on-return";
import { LobbyScreen } from "../_components/lobby/lobby-screen";

export const metadata: Metadata = {
  title: "Starlit Vale: lobby",
};

export default function StarlitLobbyPage() {
  return (
    <FreshOnReturn>
      <LobbyScreen />
    </FreshOnReturn>
  );
}
