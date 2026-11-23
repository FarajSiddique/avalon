import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  type RefObject,
} from "react";
import { useStore } from "zustand";
import { noSnapshot, noop } from "@/client/no-subscription";
import type { StoreApi } from "zustand/vanilla";
import { createDevStore } from "@/client/dev-store";
import type { StageMode, StagePhase } from "../three/engine";
import type { FlightPath, TablePlay, TablePlayer } from "../three/types";

/**
 * The stage: one live Star Table behind the landing and the lobby, so going
 * from one to the other is a camera flight, not a page change. A screen
 * claims it with a slot; the lobby also says who is at the table.
 */
export interface StageSlot {
  mode: StageMode;
  /** The open space the table is framed in. */
  focus: RefObject<HTMLElement | null>;
  /** "focus": show only the focus box (the landing band); "whole": all of it. */
  reveal: "focus" | "whole";
  /** Soft fade at the top of the focus box, as a fraction of its height. */
  fade: number;
}

type StageStatus = "idle" | "loading" | "running" | "failed";

type Picker = (clientX: number, clientY: number) => string | null;

export interface StageValue {
  slot: StageSlot | null;
  players: ReadonlyArray<TablePlayer>;
  /** A flight asked for before the next screen has mounted. */
  pending: FlightPath | null;
  /**
   * The way the last flight went. Kept after the lobby takes the pending
   * flight, since the engine may still be loading when the lobby mounts.
   * Cleared when the landing claims the stage with no flight on its way.
   */
  flight: FlightPath | null;
  /** The landing is fading out on its way to the lobby. */
  leaving: boolean;
  status: StageStatus;
  /** Settled on a framing, or flying. Null until the scene runs. */
  phase: StagePhase | null;
  /** Claiming the lobby also takes the pending flight. */
  setSlot: (update: (slot: StageSlot | null) => StageSlot | null) => void;
  setPlayers: (players: ReadonlyArray<TablePlayer>) => void;
  /** Start the flight to the lobby now; the caller navigates shortly after. */
  depart: (path: FlightPath) => void;
  setStatus: Dispatch<SetStateAction<StageStatus>>;
  setPhase: (phase: StagePhase | null) => void;
  /** Role and table: the game's state in the scene. */
  play: TablePlay | null;
  setPlay: (play: TablePlay | null) => void;
  /**
   * Role and table: the element the screen positions its own name tags in
   * (so they can be buttons). Null: the stage draws plain tags itself.
   */
  tagLayer: HTMLElement | null;
  setTagLayer: (el: HTMLElement | null) => void;
  /** The live scene answers "whose figure is here"; the stage sets this. */
  picker: RefObject<Picker | null>;
  /**
   * Is going from one address to the other the game's next step? Then the
   * camera moves; otherwise it cuts. Read by the stage when the address
   * changes. The app's default: every change of screen cuts.
   */
  isNextInFlow: IsNextInFlow;
}

/** Whether a change of address is the game's next step (see StageValue). */
export type IsNextInFlow = (from: string, to: string) => boolean;

const neverInFlow: IsNextInFlow = () => false;

export type StageStore = StoreApi<StageValue>;

/**
 * Every setter leaves the state object alone when nothing changes, so (as
 * with React state) readers do not re-render for a value they already have.
 */
function createStageStore(isNextInFlow: IsNextInFlow): StageStore {
  return createDevStore<StageValue>("stage", (set) => ({
    isNextInFlow,
    slot: null,
    players: [],
    pending: null,
    flight: null,
    leaving: false,
    status: "idle",
    phase: null,
    play: null,
    tagLayer: null,
    picker: { current: null },
    setSlot: (update) =>
      set((s) => {
        const slot = update(s.slot);

        if (slot === s.slot) {
          return s;
        }

        // The lobby has the stage: the landing is gone and done leaving.
        if (slot?.mode === "lobby" && s.pending) {
          return { slot, pending: null, leaving: false };
        }

        if (slot?.mode === "hero" && !s.pending) {
          return { slot, flight: null };
        }

        return { slot };
      }),
    setPlayers: (players) =>
      set((s) => (players === s.players ? s : { players })),
    depart: (path) => set({ pending: path, flight: path, leaving: true }),
    setStatus: (next) =>
      set((s) => {
        const status = typeof next === "function" ? next(s.status) : next;

        return status === s.status ? s : { status };
      }),
    setPhase: (phase) => set((s) => (phase === s.phase ? s : { phase })),
    setPlay: (play) => set((s) => (play === s.play ? s : { play })),
    setTagLayer: (tagLayer) =>
      set((s) => (tagLayer === s.tagLayer ? s : { tagLayer })),
  }));
}

const StageContext = createContext<StageStore | null>(null);

export function StageProvider({
  children,
  isNextInFlow = neverInFlow,
}: {
  children: ReactNode;
  isNextInFlow?: IsNextInFlow;
}) {
  // The rule is read once: a layout passes a module-level function.
  const [store] = useState(() => createStageStore(isNextInFlow));

  return (
    <StageContext.Provider value={store}>{children}</StageContext.Provider>
  );
}

/** The stage's store itself, for code that reads it outside rendering. */
export function useStageStore(): StageStore {
  const store = useContext(StageContext);

  if (!store) {
    throw new Error("useStage needs a StageProvider");
  }

  return store;
}

export function useStage(): StageValue {
  return useStore(useStageStore());
}

/*
 * Holding the stage. Each hook below claims part of the stage while its
 * screen is mounted: useSyncExternalStore subscribes (claims) after the
 * screen commits and unsubscribes (lets go) when it unmounts, or before
 * claiming again when the subscribe function changes with its inputs. Old
 * screens let go before new ones claim, in the same commit, as effects did.
 */

/** Claim the stage for this screen while it is mounted. Null: don't. */
export function useStageSlot(
  options: Omit<StageSlot, "focus"> | null,
  focus: RefObject<HTMLElement | null>,
): void {
  const store = useStageStore();
  const mode = options?.mode;
  const reveal = options?.reveal;
  const fade = options?.fade;

  const hold = useCallback(() => {
    if (!mode || !reveal || fade === undefined) {
      return noop;
    }

    const { setSlot } = store.getState();
    const slot: StageSlot = { mode, reveal, fade, focus };

    setSlot(() => slot);

    return () => setSlot((current) => (current === slot ? null : current));
  }, [mode, reveal, fade, focus, store]);

  useSyncExternalStore(hold, noSnapshot, noSnapshot);
}

/**
 * The game's state in the scene while this screen is mounted. Pass a stable
 * (memoised) object. On unmount it is cleared, but a screen mounting in the
 * same commit (the next step) sets its own, so the scene never blinks.
 */
export function useStagePlay(play: TablePlay | null): void {
  const store = useStageStore();
  const hold = useCallback(() => {
    store.getState().setPlay(play);

    return () => {
      const now = store.getState();

      if (now.play === play) {
        now.setPlay(null);
      }
    };
  }, [play, store]);

  useSyncExternalStore(hold, noSnapshot, noSnapshot);
}

/** Give the stage this screen's tag layer while it is mounted. */
export function useTagLayer(layer: RefObject<HTMLElement | null>): void {
  const store = useStageStore();
  const hold = useCallback(() => {
    const { setTagLayer } = store.getState();

    setTagLayer(layer.current);

    return () => setTagLayer(null);
  }, [layer, store]);

  useSyncExternalStore(hold, noSnapshot, noSnapshot);
}

/**
 * "Whose figure is under this point?" for a click on the open space. Null
 * when nobody's is, or the scene is not running. React owns the click (on
 * the focus area), so taps on panels never reach figures behind them.
 */
export function usePickAt(): (
  clientX: number,
  clientY: number,
) => string | null {
  const store = useStageStore();

  return useCallback(
    (clientX: number, clientY: number) =>
      store.getState().picker.current?.(clientX, clientY) ?? null,
    [store],
  );
}

/** Who stands at the table while this screen is mounted. */
export function useStagePlayers(players: ReadonlyArray<TablePlayer>): void {
  const store = useStageStore();
  const hold = useCallback(() => {
    store.getState().setPlayers(players);

    return () => {
      const now = store.getState();

      if (now.players === players) {
        now.setPlayers([]);
      }
    };
  }, [players, store]);

  useSyncExternalStore(hold, noSnapshot, noSnapshot);
}
