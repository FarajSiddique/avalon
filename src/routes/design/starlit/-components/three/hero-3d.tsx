import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconCheck, IconCrown, IconMoon, IconRing } from "../icons";
import type { ConceptName, Mounted } from "./engine";
import type { TablePlayer } from "./types";

/**
 * A live 3D concept. Three.js and the scene load only when this mounts, in
 * the browser. Without WebGL it shows `fallback` (the drawn scene) instead.
 *
 * With `players` it is the lobby table: everyone stands at a seat, with a
 * name tag over their head. Changing `players` never remounts the scene.
 */
export function Hero3D({
  concept,
  className,
  interactive = true,
  backdrop = true,
  snapshot = false,
  players,
  fallback,
}: {
  concept: ConceptName;
  className?: string;
  interactive?: boolean;
  /** A wide canvas with the title on its left: frame the subject right. */
  backdrop?: boolean;
  /** One still frame as an image, with no live WebGL context (thumbnails). */
  snapshot?: boolean;
  /** Lobby: who is at the table. */
  players?: readonly TablePlayer[];
  fallback: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const mounted = useRef<Mounted | null>(null);
  const latest = useRef(players);
  const [failed, setFailed] = useState(false);
  const lobby = players !== undefined;

  useEffect(() => {
    latest.current = players;
    mounted.current?.setPlayers(players ?? []);
  }, [players]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    // The server never draws this, so keep three.js out of the Worker bundle.
    if (import.meta.env.SSR) return;
    void import("./engine")
      .then(({ mountConcept }) =>
        mountConcept(el, concept, {
          interactive,
          backdrop,
          snapshot,
          variant: lobby ? "lobby" : "hero",
          players: latest.current,
          overlay: overlay.current,
          onLost: () => {
            if (!cancelled) setFailed(true);
          },
        }),
      )
      .then((controls) => {
        if (cancelled) controls?.stop();
        else if (controls) {
          mounted.current = controls;
          // Catch up with anyone who arrived while three.js was loading.
          if (latest.current) controls.setPlayers(latest.current);
        } else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      mounted.current?.stop();
      mounted.current = null;
    };
  }, [concept, interactive, backdrop, snapshot, lobby]);

  if (failed) return <>{fallback}</>;
  if (!lobby)
    return (
      <div
        ref={host}
        data-concept={concept}
        className={`sl-hero-3d ${className ?? ""}`}
        aria-hidden="true"
      />
    );
  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={host}
        data-concept={concept}
        className="sl-hero-3d sl-hero-3d--flush absolute inset-0"
        aria-hidden="true"
      />
      <div
        ref={overlay}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {players?.map((player) => (
          <NameTag key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}

/**
 * A name over a figure's head. Positioned by the engine every frame. The
 * state is an icon, never colour alone; the player list says it in words.
 */
export function NameTag({ player }: { player: TablePlayer }) {
  const icon = !player.connected ? (
    <IconMoon size={13} className="text-ink-muted shrink-0" />
  ) : player.ready ? (
    <IconCheck size={13} className="text-success shrink-0" />
  ) : (
    <IconRing size={13} className="text-warning shrink-0" />
  );
  return (
    <div
      data-tag={player.id}
      className="sl-name-tag absolute top-0 left-0 opacity-0"
    >
      {icon}
      <span className="min-w-0 truncate">{player.name}</span>
      {player.isHost ? (
        <IconCrown size={13} className="text-accent shrink-0" />
      ) : null}
      {player.isYou ? <span className="sl-name-tag__you">You</span> : null}
    </div>
  );
}
