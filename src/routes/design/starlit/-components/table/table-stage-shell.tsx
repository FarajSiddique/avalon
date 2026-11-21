import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { TABLE_STEP_LABELS, type TableStep } from "@/design/directions";
import type { GameView, ProposalRecord } from "@/shared/views";
import { Disclosure } from "../lobby/disclosure";
import { RolePeek } from "../role/role-peek";
import {
  usePickAt,
  useStage,
  useStagePlay,
  useStageSlot,
} from "../stage/stage-context";
import { StageTags, type SeatMark } from "../stage/stage-tags";
import type { TablePlay, TablePlayer } from "../three/types";
import { QuestTrack } from "./quest-track";
import { Scoreboard } from "./scoreboard";
import { headingFor } from "./table-screen";
import { historySummary, questsSummary } from "./table-summaries";
import { VoteHistory } from "./vote-history";
import "./table-stage.css";

const WIDE = "(min-width: 1024px)";

/** A wide screen, read after hydration (the server renders the phone's). */
function useWide(): boolean {
  return useSyncExternalStore(
    (change) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener("change", change);
      return () => query.removeEventListener("change", change);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/** A press that moved further than this is a drag, not a tap. */
const TAP_SLOP_PX = 8;

/**
 * The open space follows the phone's header and the sheet's fixed part (the
 * step and the action bar, plus the two closed sections), so the table sits
 * between them. Opening a section lets the sheet cover the table instead of
 * re-aiming the camera.
 */
function useOverlayInsets(): {
  head: React.RefObject<HTMLElement | null>;
  pinned: React.RefObject<HTMLDivElement | null>;
  style: CSSProperties;
} {
  const head = useRef<HTMLElement>(null);
  const pinned = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState({ head: 128, pinned: 200 });
  useLayoutEffect(() => {
    const read = () => {
      const h = head.current?.getBoundingClientRect().height ?? 0;
      const p = pinned.current?.getBoundingClientRect().height ?? 0;
      setSizes((s) =>
        Math.round(s.head) === Math.round(h) &&
        Math.round(s.pinned) === Math.round(p)
          ? s
          : { head: h, pinned: p },
      );
    };
    read();
    const observer = new ResizeObserver(read);
    if (head.current) observer.observe(head.current);
    if (pinned.current) observer.observe(pinned.current);
    return () => observer.disconnect();
  }, []);
  return {
    head,
    pinned,
    style: {
      "--head-h": `${Math.round(sizes.head)}px`,
      "--pinned-h": `${Math.round(sizes.pinned)}px`,
    } as CSSProperties,
  };
}

type Section = "quests" | "history";

/**
 * One step of the round over the 3D Star Table. The scene acts it out (the
 * shot, the glowing team, the cards); the tags over heads carry each
 * player's state; the header, the step panel and the action bar say the
 * rest in words. Same overlay layout as the lobby: a bottom sheet on a
 * phone, a 26rem rail on a wide screen.
 */
export function TableShell({
  step,
  view,
  players,
  play,
  marks,
  pickable = false,
  onPick,
  quests,
  proposals,
  bumped,
  settled,
  panel,
  actions,
  rootProps,
}: {
  step: TableStep;
  view: GameView;
  players: readonly TablePlayer[];
  /** Memoised by the step. */
  play: TablePlay;
  marks: Readonly<Record<string, SeatMark>>;
  /** You lead: tags, figures and the Team list toggle picks. */
  pickable?: boolean;
  onPick?: (id: string) => void;
  /** What the closed Quests section says (held back during a reveal). */
  quests?: Pick<GameView, "score" | "questIndex" | "quests" | "rejections">;
  /** What the closed Vote history says (held back during a reveal). */
  proposals?: readonly ProposalRecord[];
  bumped?: "good" | "evil";
  settled?: number;
  panel: ReactNode;
  actions: ReactNode;
  rootProps?: {
    style?: CSSProperties;
    onPointerDown?: () => void;
    "data-skip"?: boolean;
  };
}) {
  const heading = headingFor(step, view);
  const stage = useStage();
  const focus = useRef<HTMLDivElement>(null);
  useStageSlot({ mode: "table", reveal: "whole", fade: 0 }, focus);
  useStagePlay(play);
  // The panels rise in only when the table is new (from the role card),
  // not on every step.
  const [arrive] = useState(() => stage.phase !== "table");
  const { head, pinned, style: insetStyle } = useOverlayInsets();

  // Quests opens on a wide screen; on a phone both stay closed so the
  // table shows. A section you open or close stays that way.
  const wide = useWide();
  const [chosen, setChosen] = useState<Partial<Record<Section, boolean>>>({});
  const open: Record<Section, boolean> = {
    quests: chosen.quests ?? wide,
    history: chosen.history ?? false,
  };
  const toggle = (section: Section) => () =>
    setChosen((o) => ({ ...o, [section]: !open[section] }));

  // A tap on a figure picks it; a press that moves (a drag) never does.
  const pickAt = usePickAt();
  const press = useRef<{ x: number; y: number; id: number } | null>(null);
  const onFocusDown = (e: ReactPointerEvent) => {
    press.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onFocusUp = (e: ReactPointerEvent) => {
    const down = press.current;
    press.current = null;
    if (!pickable || !onPick || !down || down.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved > TAP_SLOP_PX) return;
    const id = pickAt(e.clientX, e.clientY);
    if (id) onPick(id);
  };

  const inClass = arrive ? "sl-overlay-in" : "";
  return (
    <main
      className="relative z-10 flex h-[calc(100dvh-2.75rem)] flex-col overflow-hidden"
      data-step={step}
      data-skip={rootProps?.["data-skip"] ? "true" : undefined}
      style={{ ...insetStyle, ...rootProps?.style }}
      onPointerDown={rootProps?.onPointerDown}
    >
      {/* The table's place: the stage frames it here. Lowest layer. */}
      <div
        ref={focus}
        data-stage-slot="table"
        data-pickable={pickable}
        className="sl-table-focus absolute inset-x-0 top-[var(--head-h)] bottom-[calc(var(--pinned-h)+7.25rem)] z-0 lg:top-[calc(var(--head-h)+2.75rem)] lg:right-[28rem] lg:bottom-0"
        onPointerDown={onFocusDown}
        onPointerUp={onFocusUp}
        onPointerCancel={() => {
          press.current = null;
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-10">
        <StageTags
          players={players}
          marks={marks}
          pickable={pickable}
          onPick={onPick}
        />
      </div>

      <header
        ref={head}
        className={`${inClass} relative z-20 px-4 pt-3 pb-2 lg:absolute lg:top-8 lg:left-8 lg:max-w-[30rem] lg:p-0`}
        style={{ "--arrive-at": "0ms" } as CSSProperties}
      >
        <div className="sl-over-scene min-w-0">
          <p className="sl-eyebrow pr-28 lg:pr-0">
            Quest {heading.quest} · {TABLE_STEP_LABELS[step]}
          </p>
          <h1 className="font-display mt-0.5 text-[1.625rem] leading-tight font-medium lg:text-5xl">
            {heading.title}
          </h1>
        </div>
        <div className="mt-1 flex items-end gap-3 lg:mt-2 lg:flex-col lg:items-start lg:gap-4">
          <p className="sl-over-scene text-ink line-clamp-2 min-w-0 flex-1 text-base leading-snug lg:line-clamp-none lg:text-lg lg:leading-relaxed">
            {heading.line}
          </p>
          <div className="flex-none">
            <RolePeek view={view} />
          </div>
        </div>
      </header>

      <section
        aria-label="The round"
        className={`sl-panel ${inClass} absolute inset-x-0 bottom-0 z-20 flex max-h-[72%] flex-col rounded-b-none border-b-0 lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-6 lg:max-h-none lg:w-[26rem] lg:rounded-b-[var(--corner-lg)] lg:border-b`}
        style={{ "--arrive-at": "140ms" } as CSSProperties}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 lg:px-5 lg:pt-3">
          <Disclosure
            name="quests"
            title="Quests"
            summary={questsSummary(quests ?? view)}
            open={open.quests}
            onToggle={toggle("quests")}
          >
            <div className="flex flex-col gap-4">
              <Scoreboard view={view} bumped={bumped} />
              <div className="border-line border-t border-dashed" />
              <QuestTrack view={view} settled={settled} />
            </div>
          </Disclosure>
          <Disclosure
            name="history"
            title="Vote history"
            summary={historySummary(proposals ?? view.proposals)}
            open={open.history}
            onToggle={toggle("history")}
          >
            <VoteHistory
              view={proposals ? { ...view, proposals: [...proposals] } : view}
              bare
            />
          </Disclosure>
        </div>

        <div ref={pinned} className="border-line flex-none border-t">
          <div className="px-4 pt-3 lg:px-5 lg:pt-4" data-step-panel="">
            {panel}
          </div>
          <div className="flex flex-col gap-2.5 px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] lg:px-5 lg:pb-5">
            {actions}
          </div>
        </div>
      </section>
    </main>
  );
}
