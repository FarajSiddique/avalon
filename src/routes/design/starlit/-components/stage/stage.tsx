import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { TABLE_STEPS } from "@/design/directions";
import type { Mounted, Rect, StageTarget } from "../three/engine";
import type { FlightPath } from "../three/types";
import { NameTag } from "../three/hero-3d";
import { useStage } from "./stage-context";

/**
 * The live Star Table behind the landing and the lobby. Mounted while a
 * screen has claimed it (or a flight is on its way to one), so moving
 * between the two keeps one scene and flies its camera.
 */
export function Stage() {
  const { slot, pending } = useStage();
  if (!slot && !pending) return null;
  return <LiveStage />;
}

function LiveStage() {
  const stage = useStage();
  const { slot, pending, players, takePending, setStatus, setPhase } = stage;
  const { play, tagLayer, picker } = stage;
  const latestPlay = useRef(play);
  const latestTagLayer = useRef(tagLayer);
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const mounted = useRef<Mounted | null>(null);
  const latestPlayers = useRef(players);
  const [height, setHeight] = useState<number | null>(null);
  // Whether the last move between screens was the game's next step (the
  // camera moves) or a jump (it cuts). Read at the time of each change.
  const lastPath = useRef<string | null>(null);
  const flow = useRef(false);
  const inFlow = useCallback((): boolean => {
    const now = window.location.pathname;
    if (lastPath.current === null) lastPath.current = now;
    else if (now !== lastPath.current) {
      flow.current = isNextInFlow(lastPath.current, now);
      lastPath.current = now;
    }
    return flow.current;
  }, []);
  // The way this flight is going. Kept after the pending flight is taken,
  // since the engine may still be loading when the lobby mounts.
  const path = useRef<FlightPath | null>(pending);
  useEffect(() => {
    if (pending) path.current = pending;
    else if (slot?.mode === "hero") path.current = null;
  }, [pending, slot]);

  // Where the stage should be now, measured from the claiming screen.
  const mode = pending ? "lobby" : (slot?.mode ?? "hero");
  const measure = useCallback((): StageTarget | null => {
    const el = host.current;
    if (!el) return null;
    const box = el.getBoundingClientRect();
    // On the way out of the landing, the lobby is not there to measure yet:
    // aim for the whole screen and correct when it mounts.
    const live = slot && slot.mode === mode ? slot : null;
    const focusEl = live?.focus.current;
    let focus: Rect | null = null;
    if (focusEl) {
      const r = focusEl.getBoundingClientRect();
      focus = {
        x: r.left - box.left,
        y: r.top - box.top,
        w: r.width,
        h: r.height,
      };
    }
    return {
      mode,
      path: pending ?? path.current ?? undefined,
      focus,
      reveal: live?.reveal === "focus" ? focus : null,
      fade: live && focus ? focus.h * live.fade : 0,
      animate: true,
      move: inFlow(),
    };
  }, [slot, mode, pending, inFlow]);

  const push = useCallback(() => {
    const target = measure();
    if (!target) return;
    // A band lower than the screen is tall (a short landscape phone).
    const bottom = target.focus ? target.focus.y + target.focus.h : 0;
    setHeight(bottom > window.innerHeight ? bottom : null);
    mounted.current?.setTarget(target);
  }, [measure]);

  // Mount once, starting where the first screen wants it, or at the landing
  // when a flight from it is pending.
  const initial = useRef(pending ? 0 : slot && slot.mode !== "hero" ? 1 : 0);
  const pushRef = useRef(push);
  useLayoutEffect(() => {
    pushRef.current = push;
  });
  useEffect(() => {
    const el = host.current;
    if (!el || import.meta.env.SSR) return;
    let cancelled = false;
    setStatus("loading");
    void import("../three/engine")
      .then(({ mountConcept }) =>
        mountConcept(el, "table", {
          interactive: true,
          backdrop: true,
          players: latestPlayers.current,
          overlay: overlay.current,
          stage: {
            blend: initial.current === 1 ? 1 : 0,
            onPhase: (phase) => {
              if (!cancelled) setPhase(phase);
            },
          },
          onLost: () => {
            if (!cancelled) setStatus("failed");
          },
        }),
      )
      .then((controls) => {
        if (cancelled) {
          controls?.stop();
          return;
        }
        if (!controls) {
          setStatus("failed");
          return;
        }
        mounted.current = controls;
        controls.setPlayers(latestPlayers.current);
        controls.setPlay(latestPlay.current);
        controls.setTagLayer(latestTagLayer.current);
        picker.current = controls.pickAt;
        pushRef.current();
        setStatus("running");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
      mounted.current?.stop();
      mounted.current = null;
      picker.current = null;
      // A failure sticks: the screens show their drawings from then on,
      // rather than claiming the stage again and failing again.
      setStatus((status) => (status === "failed" ? status : "idle"));
      setPhase(null);
    };
  }, [setStatus, setPhase, picker]);

  useEffect(() => {
    latestPlayers.current = players;
    mounted.current?.setPlayers(players);
  }, [players]);

  useEffect(() => {
    latestPlay.current = play;
    mounted.current?.setPlay(play, inFlow());
  }, [play, inFlow]);

  useEffect(() => {
    latestTagLayer.current = tagLayer;
    mounted.current?.setTagLayer(tagLayer);
  }, [tagLayer]);

  // Re-aim whenever the claiming screen or its layout changes. Fonts and
  // late layout move the landing band, so keep measuring for a moment.
  useEffect(() => {
    if (slot?.mode === "lobby" && pending) takePending();
    const focusEl = slot?.focus.current;
    const observer = new ResizeObserver(() => push());
    if (focusEl) observer.observe(focusEl);
    observer.observe(document.documentElement);
    window.addEventListener("resize", push);
    let frames = 0;
    let raf = 0;
    const settle = () => {
      push();
      if (++frames < 40) raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    void document.fonts?.ready.then(() => push());
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", push);
      cancelAnimationFrame(raf);
    };
  }, [push, slot, pending, takePending]);

  return (
    <div
      className="sl-backstage"
      style={height ? { height: `${height}px` } : undefined}
      aria-hidden="true"
    >
      <div
        ref={host}
        data-stage-host=""
        data-concept="table"
        className="sl-backstage__canvas"
      />
      <div ref={overlay} className="sl-backstage__tags">
        {/* A screen with its own tag layer draws its own tags. */}
        {tagLayer
          ? null
          : players.map((player) => (
              <NameTag key={player.id} player={player} />
            ))}
      </div>
    </div>
  );
}

/**
 * Is going from one prototype screen to the other the game's next step
 * (lobby, role card, then the table's steps in order, round again)? Then
 * the camera moves; any other jump cuts.
 */
function isNextInFlow(from: string, to: string): boolean {
  const a = screenOf(from);
  const b = screenOf(to);
  if (!a || !b) return false;
  if (a === "lobby") return b.startsWith("role/");
  // Your own card continues to the table. The Assassin's card is another
  // seat (a prototype detour), so its Continue cuts.
  if (a === "role/merlin") return b === "table/propose";
  if (a.startsWith("table/") && b.startsWith("table/")) {
    const i = TABLE_STEPS.indexOf(a.slice(6) as (typeof TABLE_STEPS)[number]);
    return i >= 0 && b.slice(6) === TABLE_STEPS[(i + 1) % TABLE_STEPS.length];
  }
  return false;
}

function screenOf(path: string): string | null {
  const match = /\/design\/starlit\/(lobby|role\/[^/]+|table\/[^/]+)\/?$/.exec(
    path,
  );
  return match?.[1] ?? null;
}
