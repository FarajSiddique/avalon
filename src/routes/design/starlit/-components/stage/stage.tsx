import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Mounted, Rect, StageTarget } from "../three/engine";
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
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const mounted = useRef<Mounted | null>(null);
  const latestPlayers = useRef(players);
  const [height, setHeight] = useState<number | null>(null);

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
      path: pending ?? undefined,
      focus,
      reveal: live?.reveal === "focus" ? focus : null,
      fade: live && focus ? focus.h * live.fade : 0,
      animate: true,
    };
  }, [slot, mode, pending]);

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
  const initial = useRef(pending ? 0 : slot?.mode === "lobby" ? 1 : 0);
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
      setStatus("idle");
      setPhase(null);
    };
  }, [setStatus, setPhase]);

  useEffect(() => {
    latestPlayers.current = players;
    mounted.current?.setPlayers(players);
  }, [players]);

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
        {players.map((player) => (
          <NameTag key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
