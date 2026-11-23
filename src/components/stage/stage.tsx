import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { noSnapshot, noop } from "@/client/no-subscription";
import type { Mounted, Rect, StageTarget } from "../three/engine";
import type { FlightPath, TablePlayer } from "../three/types";
import {
  IconCheck,
  IconCrown,
  IconMoon,
  IconRing,
} from "@/components/ui/icons";
import {
  useStageStore,
  type StageSlot,
  type StageStore,
  type StageValue,
} from "./stage-context";

/**
 * The live Star Table behind the landing and the lobby. Mounted while a
 * screen has claimed it (or a flight is on its way to one), so moving
 * between the two keeps one scene and flies its camera.
 */
export function Stage() {
  const store = useStageStore();
  const slot = useStore(store, (s) => s.slot);
  const pending = useStore(store, (s) => s.pending);

  if (!slot && !pending) {
    return null;
  }

  return <LiveStage />;
}

function LiveStage() {
  const store = useStageStore();
  const slot = useStore(store, (s) => s.slot);
  const pending = useStore(store, (s) => s.pending);
  const flight = useStore(store, (s) => s.flight);
  const players = useStore(store, (s) => s.players);
  const tagLayer = useStore(store, (s) => s.tagLayer);
  const overlay = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement | null>(null);
  const mounted = useRef<Mounted | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  // Whether the last move between screens was the game's next step (the
  // camera moves) or a jump (it cuts). Read at the time of each change.
  const lastPath = useRef<string | null>(null);
  const flow = useRef(false);
  const inFlow = useCallback((): boolean => {
    const now = window.location.pathname;

    if (lastPath.current === null) {
      lastPath.current = now;
    } else if (now !== lastPath.current) {
      flow.current = store.getState().isNextInFlow(lastPath.current, now);
      lastPath.current = now;
    }

    return flow.current;
  }, [store]);
  // Aim the scene at the claiming screen, as it is in this slot and flight.
  const push = useCallback(
    (
      slotNow: StageSlot | null,
      pendingNow: FlightPath | null,
      flightNow: FlightPath | null,
    ) => {
      const target = measure(
        canvas.current,
        slotNow,
        pendingNow,
        flightNow,
        inFlow,
      );

      if (!target) {
        return;
      }

      // A band lower than the screen is tall (a short landscape phone).
      const bottom = target.focus ? target.focus.y + target.focus.h : 0;

      setHeight(bottom > window.innerHeight ? bottom : null);
      mounted.current?.setTarget(target);
    },
    [inFlow],
  );

  // Mount the scene with its element, once (every input here is stable),
  // starting where the first screen wants it, or at the landing when a
  // flight from it is pending. React runs the returned clean-up on unmount.
  const host = useCallback(
    (el: HTMLDivElement | null) => {
      canvas.current = el;

      if (!el || import.meta.env.SSR) {
        return;
      }

      const first = store.getState();
      const { setStatus, setPhase, picker } = first;
      const blend = first.pending
        ? 0
        : first.slot && first.slot.mode !== "hero"
          ? 1
          : 0;
      let cancelled = false;
      let unfollow = noop;

      setStatus("loading");
      void import("../three/engine")
        .then(({ mountStarTable }) =>
          mountStarTable(el, {
            interactive: true,
            backdrop: true,
            players: store.getState().players,
            overlay: overlay.current,
            stage: {
              blend,
              onPhase: (phase) => {
                if (!cancelled) {
                  setPhase(phase);
                }
              },
            },
            onLost: () => {
              if (!cancelled) {
                setStatus("failed");
              }
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

          const now = store.getState();

          mounted.current = controls;
          controls.setPlayers(now.players);
          controls.setPlay(now.play);
          controls.setTagLayer(now.tagLayer);
          picker.current = (clientX, clientY) =>
            controls.pickAt(clientX, clientY);
          push(now.slot, now.pending, now.flight);
          unfollow = followScreens(store, controls, now, inFlow);
          setStatus("running");
        })
        .catch(() => {
          if (!cancelled) {
            setStatus("failed");
          }
        });

      return () => {
        cancelled = true;
        unfollow();
        mounted.current?.stop();
        mounted.current = null;
        canvas.current = null;
        picker.current = null;
        // A failure sticks: the screens show the notice from then on,
        // rather than claiming the stage again and failing again.
        setStatus((status) => (status === "failed" ? status : "idle"));
        setPhase(null);
      };
    },
    [store, push, inFlow],
  );

  // Re-aim whenever the claiming screen or its layout changes. Fonts and
  // late layout move the landing band, so keep measuring for a moment.
  // This subscribes to the page's layout; a new slot or flight is a new
  // subscribe function, so React starts it over with them. (Claiming the
  // lobby takes the pending flight in the store, in the same update.)
  const aim = useCallback(() => {
    const reaim = () => push(slot, pending, flight);
    const focusEl = slot?.focus.current;
    const observer = new ResizeObserver(reaim);

    if (focusEl) {
      observer.observe(focusEl);
    }

    observer.observe(document.documentElement);
    window.addEventListener("resize", reaim);
    let frames = 0;
    let raf = 0;

    const settle = () => {
      reaim();

      if (++frames < 40) {
        raf = requestAnimationFrame(settle);
      }
    };

    raf = requestAnimationFrame(settle);
    void document.fonts?.ready.then(reaim);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", reaim);
      cancelAnimationFrame(raf);
    };
  }, [slot, pending, flight, push]);

  useSyncExternalStore(aim, noSnapshot, noSnapshot);

  return (
    <div
      className="sl-backstage"
      style={height ? { height: `${height}px` } : undefined}
      aria-hidden="true"
    >
      <div ref={host} data-stage-host="" className="sl-backstage__canvas" />
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

/** Where the stage should be now, measured from the claiming screen. */
function measure(
  el: HTMLElement | null,
  slot: StageSlot | null,
  pending: FlightPath | null,
  path: FlightPath | null,
  inFlow: () => boolean,
): StageTarget | null {
  if (!el) {
    return null;
  }

  const mode = pending ? "lobby" : (slot?.mode ?? "hero");
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
    path: pending ?? path ?? undefined,
    focus,
    reveal: live?.reveal === "focus" ? focus : null,
    fade: live && focus ? focus.h * live.fade : 0,
    animate: true,
    move: inFlow(),
  };
}

/**
 * Keep the running scene in step with the screens: who is at the table, the
 * game's state and the tag layer. A screen that unmounts clears these and
 * the next one sets its own in the same commit, so changes are gathered and
 * sent once that commit is done. The scene only sees the final values and
 * never blinks empty in between.
 */
function followScreens(
  store: StageStore,
  controls: Mounted,
  start: StageValue,
  inFlow: () => boolean,
): () => void {
  let { players, play, tagLayer } = start;
  let queued = false;
  let live = true;

  const flush = () => {
    queued = false;

    if (!live) {
      return;
    }

    const now = store.getState();

    if (now.players !== players) {
      players = now.players;
      controls.setPlayers(players);
    }

    if (now.play !== play) {
      play = now.play;
      controls.setPlay(play, inFlow());
    }

    if (now.tagLayer !== tagLayer) {
      tagLayer = now.tagLayer;
      controls.setTagLayer(tagLayer);
    }
  };

  const unsubscribe = store.subscribe(() => {
    if (!queued) {
      queued = true;
      queueMicrotask(flush);
    }
  });

  return () => {
    live = false;
    unsubscribe();
  };
}

/**
 * A name over a figure's head. Positioned by the engine every frame. The
 * state is an icon, never colour alone; the player list says it in words.
 */
function NameTag({ player }: { player: TablePlayer }) {
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
