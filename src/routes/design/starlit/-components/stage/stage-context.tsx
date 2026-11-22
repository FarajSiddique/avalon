import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  type RefObject,
} from "react";
import type { StageMode, StagePhase } from "../three/engine";
import type { FlightPath, TablePlay, TablePlayer } from "../three/types";

/**
 * The stage: one live Star Table behind the landing and the lobby, so going
 * from one to the other is a camera flight, not a page change. A screen
 * claims it with a slot; the lobby also says who is at the table.
 */
interface StageSlot {
  mode: StageMode;
  /** The open space the table is framed in. */
  focus: RefObject<HTMLElement | null>;
  /** "focus": show only the focus box (the landing band); "whole": all of it. */
  reveal: "focus" | "whole";
  /** Soft fade at the top of the focus box, as a fraction of its height. */
  fade: number;
}

type StageStatus = "idle" | "loading" | "running" | "failed";

interface StageValue {
  slot: StageSlot | null;
  players: ReadonlyArray<TablePlayer>;
  /** A flight asked for before the next screen has mounted. */
  pending: FlightPath | null;
  /** The landing is fading out on its way to the lobby. */
  leaving: boolean;
  status: StageStatus;
  /** Settled on a framing, or flying. Null until the scene runs. */
  phase: StagePhase | null;
  setSlot: (update: (slot: StageSlot | null) => StageSlot | null) => void;
  setPlayers: (players: ReadonlyArray<TablePlayer>) => void;
  /** Start the flight to the lobby now; the caller navigates shortly after. */
  depart: (path: FlightPath) => void;
  /** The stage has taken the pending flight. */
  takePending: () => void;
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
  picker: RefObject<
    ((clientX: number, clientY: number) => string | null) | null
  >;
}

const StageContext = createContext<StageValue | null>(null);

export function StageProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<StageSlot | null>(null);
  const [players, setPlayers] = useState<ReadonlyArray<TablePlayer>>([]);
  const [pending, setPending] = useState<FlightPath | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [status, setStatus] = useState<StageStatus>("idle");
  const [phase, setPhase] = useState<StagePhase | null>(null);
  const [play, setPlay] = useState<TablePlay | null>(null);
  const [tagLayer, setTagLayer] = useState<HTMLElement | null>(null);
  const picker = useRef<
    ((clientX: number, clientY: number) => string | null) | null
  >(null);

  const depart = useCallback((path: FlightPath) => {
    setPending(path);
    setLeaving(true);
  }, []);
  // The lobby has the stage: the landing is gone and done leaving.
  const takePending = useCallback(() => {
    setPending(null);
    setLeaving(false);
  }, []);
  const value = useMemo<StageValue>(
    () => ({
      slot,
      players,
      pending,
      leaving,
      status,
      phase,
      setSlot,
      setPlayers,
      depart,
      takePending,
      setStatus,
      setPhase,
      play,
      setPlay,
      tagLayer,
      setTagLayer,
      picker,
    }),
    [
      slot,
      players,
      pending,
      leaving,
      status,
      phase,
      depart,
      takePending,
      play,
      tagLayer,
    ],
  );

  return (
    <StageContext.Provider value={value}>{children}</StageContext.Provider>
  );
}

export function useStage(): StageValue {
  const value = useContext(StageContext);

  if (!value) {
    throw new Error("useStage needs a StageProvider");
  }

  return value;
}

/** Claim the stage for this screen while it is mounted. Null: don't. */
export function useStageSlot(
  options: Omit<StageSlot, "focus"> | null,
  focus: RefObject<HTMLElement | null>,
): void {
  const { setSlot } = useStage();
  const mode = options?.mode;
  const reveal = options?.reveal;
  const fade = options?.fade;

  useEffect(() => {
    if (!mode || !reveal || fade === undefined) {
      return;
    }

    const slot: StageSlot = { mode, reveal, fade, focus };

    setSlot(() => slot);

    return () => setSlot((current) => (current === slot ? null : current));
  }, [mode, reveal, fade, focus, setSlot]);
}

/**
 * The game's state in the scene while this screen is mounted. Pass a stable
 * (memoised) object. On unmount it is cleared, but a screen mounting in the
 * same commit (the next step) sets its own, so the scene never blinks.
 */
export function useStagePlay(play: TablePlay | null): void {
  const { setPlay } = useStage();

  useEffect(() => {
    setPlay(play);
  }, [play, setPlay]);
  useEffect(() => () => setPlay(null), [setPlay]);
}

/** Give the stage this screen's tag layer while it is mounted. */
export function useTagLayer(layer: RefObject<HTMLElement | null>): void {
  const { setTagLayer } = useStage();

  useEffect(() => {
    const el = layer.current;

    setTagLayer(el);

    return () => setTagLayer(null);
  }, [layer, setTagLayer]);
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
  const { picker } = useStage();

  return useCallback(
    (clientX: number, clientY: number) =>
      picker.current?.(clientX, clientY) ?? null,
    [picker],
  );
}

/** Who stands at the table while this screen is mounted. */
export function useStagePlayers(players: ReadonlyArray<TablePlayer>): void {
  const { setPlayers } = useStage();

  useEffect(() => {
    setPlayers(players);
  }, [players, setPlayers]);
  useEffect(() => () => setPlayers([]), [setPlayers]);
}
