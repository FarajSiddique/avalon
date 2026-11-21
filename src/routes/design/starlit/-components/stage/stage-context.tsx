import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  type RefObject,
} from "react";
import type { StagePhase } from "../three/engine";
import type { FlightPath, TablePlayer } from "../three/types";

/**
 * The stage: one live Star Table behind the landing and the lobby, so going
 * from one to the other is a camera flight, not a page change. A screen
 * claims it with a slot; the lobby also says who is at the table.
 */
export interface StageSlot {
  mode: "hero" | "lobby";
  /** The open space the table is framed in. */
  focus: RefObject<HTMLElement | null>;
  /** "focus": show only the focus box (the landing band); "whole": all of it. */
  reveal: "focus" | "whole";
  /** Soft fade at the top of the focus box, as a fraction of its height. */
  fade: number;
}

export type StageStatus = "idle" | "loading" | "running" | "failed";

interface StageValue {
  slot: StageSlot | null;
  players: readonly TablePlayer[];
  /** A flight asked for before the next screen has mounted. */
  pending: FlightPath | null;
  /** The landing is fading out on its way to the lobby. */
  leaving: boolean;
  status: StageStatus;
  /** Settled on a framing, or flying. Null until the scene runs. */
  phase: StagePhase | null;
  setSlot: (update: (slot: StageSlot | null) => StageSlot | null) => void;
  setPlayers: (players: readonly TablePlayer[]) => void;
  /** Start the flight to the lobby now; the caller navigates shortly after. */
  depart: (path: FlightPath) => void;
  /** The stage has taken the pending flight. */
  takePending: () => void;
  setStatus: Dispatch<SetStateAction<StageStatus>>;
  setPhase: (phase: StagePhase | null) => void;
}

const StageContext = createContext<StageValue | null>(null);

export function StageProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<StageSlot | null>(null);
  const [players, setPlayers] = useState<readonly TablePlayer[]>([]);
  const [pending, setPending] = useState<FlightPath | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [status, setStatus] = useState<StageStatus>("idle");
  const [phase, setPhase] = useState<StagePhase | null>(null);

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
    }),
    [slot, players, pending, leaving, status, phase, depart, takePending],
  );
  return (
    <StageContext.Provider value={value}>{children}</StageContext.Provider>
  );
}

export function useStage(): StageValue {
  const value = useContext(StageContext);
  if (!value) throw new Error("useStage needs a StageProvider");
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
    if (!mode || !reveal || fade === undefined) return;
    const slot: StageSlot = { mode, reveal, fade, focus };
    setSlot(() => slot);
    return () => setSlot((current) => (current === slot ? null : current));
  }, [mode, reveal, fade, focus, setSlot]);
}

/** Who stands at the table while this screen is mounted. */
export function useStagePlayers(players: readonly TablePlayer[]): void {
  const { setPlayers } = useStage();
  useEffect(() => {
    setPlayers(players);
  }, [players, setPlayers]);
  useEffect(() => () => setPlayers([]), [setPlayers]);
}
