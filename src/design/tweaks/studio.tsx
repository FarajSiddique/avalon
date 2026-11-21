/**
 * The Starlit tweak studio: every token of the theme on a dial, previewed live
 * at phone and wide width in iframes of the real prototype screens. The dial
 * lives in localStorage, so the previews (and any other Starlit tab) follow
 * it. Prototype-only.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { NO_SHIFT, shiftHex, type ColorShift } from "./color";
import {
  GROUPS,
  familyOf,
  type Catalog,
  type GroupId,
  type TokenDef,
} from "./catalog";
import { Swatch, TokenRow } from "./controls";
import { PROPOSED_DIALS } from "./presets";
import {
  DEFAULT_SKY,
  DEFAULT_STATE,
  buildBrief,
  buildCssDiff,
  checkContrast,
  compactState,
  decodeState,
  encodeState,
  listChanges,
  sanitizeState,
  DEFAULT_SCENE,
  sceneChanges,
  skyChanges,
  type SkyOptions,
  type TweakState,
} from "./state";
import {
  deleteDial,
  redo,
  saveDial,
  setBypass,
  setTweaks,
  undo,
  useBypass,
  useHistory,
  useSavedDials,
  useTweaks,
} from "./store";
import { SCENE_PARTS } from "@/routes/design/starlit/-components/art/scene-options";
import { SHARE_PARAM, useCatalog } from "./use-starlit-tweaks";
import {
  ROLE_VARIANTS,
  STARLIT_ARTWORK_PATH,
  STARLIT_MOTION_PATH,
  TABLE_STEPS,
  TABLE_STEP_LABELS,
  designPaths,
} from "../directions";

const paths = designPaths("starlit");

const SCREENS: { label: string; href: string }[] = [
  { label: "Landing", href: paths.landing },
  { label: "Lobby", href: paths.lobby },
  ...ROLE_VARIANTS.map((v) => ({ label: `Role: ${v}`, href: paths.role(v) })),
  ...TABLE_STEPS.map((s) => ({
    label: `Table: ${TABLE_STEP_LABELS[s]}`,
    href: paths.table(s),
  })),
  { label: "Artwork variants", href: STARLIT_ARTWORK_PATH },
  { label: "Motion gallery", href: STARLIT_MOTION_PATH },
];

/** Pick a version of each piece of artwork. */
function SceneEditor({
  state,
  onShowAll,
}: {
  state: TweakState;
  onShowAll: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {SCENE_PARTS.map((part) => (
        <div key={part.key} role="group" aria-label={part.title}>
          <div className="mb-1 text-[12px] font-semibold text-white">
            {part.title}
          </div>
          <div className="flex flex-wrap gap-1">
            {part.styles.map((style) => {
              const [name, blurb] = (
                part.labels as Record<string, readonly [string, string]>
              )[style] ?? [style, ""];
              const active = state.scene[part.key] === style;
              return (
                <button
                  key={style}
                  type="button"
                  title={blurb}
                  aria-pressed={active}
                  className={`${btn} ${active ? "border-white/70 bg-white/20 text-white" : ""}`}
                  onClick={() =>
                    setTweaks((s) => ({
                      ...s,
                      scene: { ...s.scene, [part.key]: style },
                    }))
                  }
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" className={btn} onClick={onShowAll}>
          Preview every version side by side
        </button>
        <button
          type="button"
          className={btn}
          disabled={sceneChanges(state).length === 0}
          onClick={() => setTweaks((s) => ({ ...s, scene: DEFAULT_SCENE }))}
        >
          reset
        </button>
      </div>
    </div>
  );
}

const DEVICES = {
  phone: { width: 390, height: 844 },
  wide: { width: 1440, height: 900 },
} as const;

type Layout = "both" | "phone" | "wide";
type Tab = "tune" | "checks" | "share";

const btn =
  "inline-flex h-8 items-center justify-center gap-1 rounded border border-white/15 bg-white/5 px-2.5 text-[12px] text-white/85 hover:border-white/40 hover:bg-white/10 disabled:opacity-35";

// ---------------------------------------------------------------- pieces

/** A pasted dial: JSON, a share link, or the bare code from one. */
function readDial(text: string): TweakState | null {
  try {
    return sanitizeState(JSON.parse(text));
  } catch {
    const code = text.includes(`${SHARE_PARAM}=`)
      ? new URL(text, window.location.origin).searchParams.get(SHARE_PARAM)
      : text;
    return code ? decodeState(code) : null;
  }
}

function Section({
  title,
  blurb,
  badge,
  defaultOpen = false,
  forceOpen = false,
  children,
}: {
  title: string;
  blurb?: string;
  badge?: number;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = open || forceOpen;
  return (
    <section className="border-b border-white/10">
      <button
        type="button"
        aria-expanded={shown}
        className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="w-3 text-white/40">{shown ? "▾" : "▸"}</span>
        <span className="flex-1">
          <span className="block text-[13px] font-semibold text-white">
            {title}
          </span>
          {blurb ? (
            <span className="block text-[11px] text-white/45">{blurb}</span>
          ) : null}
        </span>
        {badge ? (
          <span className="rounded-full bg-amber-300/20 px-1.5 text-[11px] text-amber-200 tabular-nums">
            {badge}
          </span>
        ) : null}
      </button>
      {shown ? <div className="px-3 pb-3">{children}</div> : null}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-2 py-1 text-[12px] text-white/80">
      <span className="w-24 shrink-0">{label}</span>
      <input
        type="range"
        className="min-w-0 flex-1 accent-white"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        aria-label={`${label} value`}
        className="h-7 w-16 rounded border border-white/15 bg-black/40 px-1.5 text-right text-[12px] text-white tabular-nums"
        step={step}
        value={value}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      <span className="w-5 text-[11px] text-white/45">{suffix}</span>
    </label>
  );
}

function ShiftEditor({
  id,
  label,
  catalog,
  state,
}: {
  id: string;
  label: string;
  catalog: Catalog;
  state: TweakState;
}) {
  const shift = state.shifts[id] ?? NO_SHIFT;
  const set = (patch: Partial<ColorShift>) =>
    setTweaks((s) => ({
      ...s,
      shifts: {
        ...s.shifts,
        [id]: { ...(s.shifts[id] ?? NO_SHIFT), ...patch },
      },
    }));
  const members = [...catalog.values()].filter(
    (t) =>
      familyOf(t.name) !== null && (id === "all" || familyOf(t.name) === id),
  );
  const changed =
    shift.hue !== 0 || shift.chroma !== 1 || shift.lightness !== 0;
  return (
    <div className="mb-2 rounded border border-white/10 p-2" data-shift={id}>
      <div className="mb-1 flex items-center gap-2">
        <span className="flex-1 text-[12px] font-semibold text-white capitalize">
          {label}
        </span>
        <button
          type="button"
          className={btn}
          disabled={!changed}
          onClick={() => set(NO_SHIFT)}
        >
          reset
        </button>
      </div>
      <div className="mb-1 flex flex-wrap gap-0.5">
        {members.slice(0, 60).map((t) => {
          const shifts =
            id === "all" ? [shift] : [state.shifts.all ?? NO_SHIFT, shift];
          return (
            <Swatch
              key={t.name}
              color={shiftHex(state.vars[t.name] ?? t.base, shifts)}
              size={14}
            />
          );
        })}
      </div>
      <Slider
        label="Hue"
        value={shift.hue}
        min={-180}
        max={180}
        step={1}
        suffix="°"
        onChange={(hue) => set({ hue })}
      />
      <Slider
        label="Chroma"
        value={shift.chroma}
        min={0}
        max={2}
        step={0.01}
        suffix="×"
        onChange={(chroma) => set({ chroma })}
      />
      <Slider
        label="Lightness"
        value={shift.lightness}
        min={-40}
        max={40}
        step={0.5}
        onChange={(lightness) => set({ lightness })}
      />
    </div>
  );
}

function SkyEditor({ state }: { state: TweakState }) {
  const set = (patch: Partial<SkyOptions>) =>
    setTweaks((s) => ({ ...s, sky: { ...s.sky, ...patch } }));
  const reroll = () => Math.floor(Math.random() * 100_000);
  return (
    <div>
      <Slider
        label="Stars"
        value={state.sky.starCount}
        min={0}
        max={2000}
        step={10}
        onChange={(starCount) => set({ starCount })}
      />
      <Slider
        label="Crowd to top"
        value={state.sky.starTopBias}
        min={0.5}
        max={4}
        step={0.05}
        onChange={(starTopBias) => set({ starTopBias })}
      />
      <Slider
        label="1 in N twinkle"
        value={state.sky.twinkleEvery}
        min={1}
        max={30}
        step={1}
        onChange={(twinkleEvery) => set({ twinkleEvery })}
      />
      <Slider
        label="Village lights"
        value={state.sky.lightsDensity}
        min={0}
        max={4}
        step={0.05}
        suffix="×"
        onChange={(lightsDensity) => set({ lightsDensity })}
      />
      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => set({ starSeed: reroll() })}
        >
          New star pattern ({state.sky.starSeed})
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => set({ lightsSeed: reroll() })}
        >
          New lights ({state.sky.lightsSeed})
        </button>
        <button
          type="button"
          className={btn}
          disabled={skyChanges(state).length === 0}
          onClick={() => set(DEFAULT_SKY)}
        >
          reset
        </button>
      </div>
    </div>
  );
}

function ContrastTable({
  catalog,
  state,
}: {
  catalog: Catalog;
  state: TweakState;
}) {
  const results = checkContrast(catalog, state);
  const failing = results.filter((r) => !r.pass).length;
  return (
    <div className="p-3">
      <p className="mb-2 text-[12px] text-white/60">
        WCAG ratios for the pairs the design relies on, computed from the dial.
        Text needs 4.5:1, UI shapes 3:1. Panels are see-through, so a panel pair
        is measured on the surface at the current panel opacity over the canvas.
      </p>
      <p
        className={`mb-3 text-[13px] font-semibold ${failing ? "text-rose-300" : "text-emerald-300"}`}
        data-testid="contrast-summary"
      >
        {failing
          ? `✕ ${failing} pair${failing === 1 ? "" : "s"} below target`
          : "✓ Every pair meets its target"}
      </p>
      <ul className="flex flex-col gap-1.5">
        {results.map((r) => (
          <li
            key={r.label}
            className="flex items-center gap-2 rounded border border-white/10 p-1.5 text-[12px]"
          >
            <span
              className="flex h-8 w-12 shrink-0 items-center justify-center rounded text-[13px] font-semibold"
              style={{ background: r.bgHex, color: r.fgHex }}
            >
              Aa
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-white/90">{r.label}</span>
              <span className="block font-mono text-[10px] text-white/40">
                {r.fg} on {r.bg}
              </span>
            </span>
            <span
              className={`w-20 text-right tabular-nums ${r.pass ? "text-emerald-300" : "text-rose-300"}`}
            >
              {r.pass ? "✓" : "✕"} {r.ratio?.toFixed(2) ?? "?"}:1
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SharePanel({
  catalog,
  state,
  screen,
  flash,
}: {
  catalog: Catalog;
  state: TweakState;
  screen: string;
  flash: (m: string) => void;
}) {
  const saved = useSavedDials();
  const [importText, setImportText] = useState("");
  const shareUrl = `${typeof window === "undefined" ? "" : window.location.origin}${screen}?${SHARE_PARAM}=${encodeState(state)}`;
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`Copied ${what}`);
    } catch {
      flash("Clipboard blocked: select the text below instead");
    }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(compactState(state), null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `starlit-dial-${state.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = () => {
    const next = readDial(importText.trim());
    if (!next) {
      flash("Could not read that: paste JSON, a share link or a code");
      return;
    }
    setTweaks(next);
    setImportText("");
    flash(`Loaded “${next.name}”`);
  };
  const brief = buildBrief(catalog, state, shareUrl);

  return (
    <div className="flex flex-col gap-4 p-3">
      <div>
        <label
          className="mb-1 block text-[12px] font-semibold text-white"
          htmlFor="dial-notes"
        >
          Notes on this dial
        </label>
        <textarea
          id="dial-notes"
          rows={4}
          placeholder="What are you going for? What feels off? Claude reads this first."
          className="w-full rounded border border-white/15 bg-black/40 p-2 text-[12px] text-white outline-none focus:border-white/60"
          value={state.notes}
          onChange={(e) => setTweaks((s) => ({ ...s, notes: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold text-white">
          Hand it to Claude
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => void copy(brief, "the brief for Claude")}
        >
          Copy brief for Claude (Markdown)
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={btn}
            onClick={() =>
              void copy(buildCssDiff(catalog, state), "the CSS diff")
            }
          >
            Copy CSS diff
          </button>
          <button
            type="button"
            className={btn}
            onClick={() =>
              void copy(
                JSON.stringify(compactState(state), null, 2),
                "the JSON",
              )
            }
          >
            Copy JSON
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => void copy(shareUrl, "the share link")}
          >
            Copy share link
          </button>
          <button type="button" className={btn} onClick={download}>
            Download JSON
          </button>
        </div>
        <p className="text-[11px] text-white/45">
          The share link opens this screen with the dial applied, on any device,
          phones included. The brief carries your notes, every change with its
          per-token note, contrast failures and the JSON to reload it.
        </p>
        <details className="text-[11px] text-white/60">
          <summary className="cursor-pointer">Preview the brief</summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded bg-black/50 p-2 whitespace-pre-wrap">
            {brief}
          </pre>
        </details>
      </div>
      <div className="flex flex-col gap-2">
        <label
          className="text-[12px] font-semibold text-white"
          htmlFor="dial-import"
        >
          Load a dial
        </label>
        <textarea
          id="dial-import"
          rows={3}
          placeholder="Paste JSON, a share link or a code"
          className="w-full rounded border border-white/15 bg-black/40 p-2 font-mono text-[11px] text-white outline-none focus:border-white/60"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <button
          type="button"
          className={btn}
          disabled={!importText.trim()}
          onClick={doImport}
        >
          Load
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold text-white">
          Saved in this browser
        </span>
        {saved.length === 0 ? (
          <p className="text-[11px] text-white/45">
            Nothing yet. Use Save in the header.
          </p>
        ) : null}
        {saved.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-[12px]">
            <button
              type="button"
              className={`${btn} flex-1 justify-start`}
              onClick={() => setTweaks(d)}
            >
              {d.name}
            </button>
            <button
              type="button"
              className={btn}
              aria-label={`Delete ${d.name}`}
              onClick={() => deleteDial(d.name)}
            >
              delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- previews

function Frame({
  device,
  src,
  scale,
  onDoc,
}: {
  device: keyof typeof DEVICES;
  src: string;
  scale: number;
  onDoc?: (doc: Document | null) => void;
}) {
  const size = DEVICES[device];
  return (
    <figure className="flex shrink-0 flex-col items-center gap-1.5">
      <div
        className="overflow-hidden rounded-[10px] border border-white/15 bg-black shadow-2xl"
        style={{ width: size.width * scale, height: size.height * scale }}
      >
        <iframe
          title={`${device === "phone" ? "Phone" : "Wide"} preview`}
          src={src}
          data-device={device}
          width={size.width}
          height={size.height}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            border: 0,
            display: "block",
          }}
          onLoad={(e) => onDoc?.(e.currentTarget.contentDocument)}
        />
      </div>
      <figcaption className="text-[11px] text-white/45">
        {device === "phone" ? "Phone" : "Wide"} · {size.width}×{size.height} ·{" "}
        {Math.round(scale * 100)}%
      </figcaption>
    </figure>
  );
}

function usePreviewScale(layout: Layout) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1000, h: 800 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry)
        setBox({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pad = 48;
  const w = box.w - pad;
  const h = box.h - pad - 20;
  let scale: number;
  if (layout === "phone")
    scale = Math.min(1, h / DEVICES.phone.height, w / DEVICES.phone.width);
  else if (layout === "wide")
    scale = Math.min(1, h / DEVICES.wide.height, w / DEVICES.wide.width);
  else
    scale = Math.min(
      1,
      h / DEVICES.wide.height,
      (w - 24) / (DEVICES.phone.width + DEVICES.wide.width),
    );
  return { ref, scale: Math.max(0.2, scale) };
}

// ---------------------------------------------------------------- studio

export function TweakStudio() {
  const state = useTweaks();
  const bypass = useBypass();
  const history = useHistory();
  const savedDials = useSavedDials();
  const [tab, setTab] = useState<Tab>("tune");
  const [layout, setLayout] = useState<Layout>("both");
  const [screen, setScreen] = useState<string>(paths.landing);
  const [query, setQuery] = useState("");
  const [changedOnly, setChangedOnly] = useState(false);
  const [doc, setDoc] = useState<Document | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const catalog = useCatalog(doc);
  const { ref: previewRef, scale } = usePreviewScale(layout);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 2200);
  };

  // Keyboard: undo, redo, and hold backslash to compare with the original.
  useEffect(() => {
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === "TEXTAREA" ||
        (t.tagName === "INPUT" && (t as HTMLInputElement).type === "text"));
    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "\\" && !e.repeat) setBypass(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "\\") setBypass(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  // Never leave the previews stuck on the original if the studio closes mid-hold.
  useEffect(() => () => setBypass(false), []);

  const changes = useMemo(
    () => (catalog.size ? listChanges(catalog, state) : []),
    [catalog, state],
  );
  const changedTokens = useMemo(
    () => new Set(changes.map((c) => c.token)),
    [changes],
  );
  const contrastFails = useMemo(
    () =>
      catalog.size
        ? checkContrast(catalog, state).filter((r) => !r.pass).length
        : 0,
    [catalog, state],
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = new Map<GroupId, TokenDef[]>();
    for (const def of catalog.values()) {
      if (def.name.startsWith("--font-")) continue; // font family names, not a dial
      if (changedOnly && !changedTokens.has(def.name)) continue;
      if (
        q &&
        !`${def.name} ${def.label} ${def.base} ${state.vars[def.name] ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        continue;
      out.set(def.group, [...(out.get(def.group) ?? []), def]);
    }
    return out;
  }, [catalog, query, changedOnly, changedTokens, state.vars]);

  const families = useMemo(() => {
    const set = new Set<string>();
    for (const t of catalog.values()) {
      const f = familyOf(t.name);
      if (f) set.add(f);
    }
    return [...set];
  }, [catalog]);

  const allDials = [...PROPOSED_DIALS, ...savedDials];
  const totalChanges =
    changes.length +
    skyChanges(state).length +
    sceneChanges(state).length +
    (state.typeScale !== 100 ? 1 : 0);
  const searching = query.trim() !== "" || changedOnly;

  return (
    <div
      className="fixed inset-0 flex flex-col bg-neutral-900 text-white lg:flex-row"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
    >
      <aside
        className="flex min-h-0 w-full flex-1 flex-col border-r border-white/10 bg-neutral-950 lg:w-[400px] lg:flex-none lg:shrink-0"
        aria-label="Tweak controls"
      >
        <header className="flex flex-col gap-2 border-b border-white/10 p-3">
          <div className="flex items-center gap-2">
            <Link
              to="/design"
              className="text-[12px] text-white/50 hover:text-white"
            >
              ← Design
            </Link>
            <h1 className="flex-1 text-[14px] font-semibold">
              Starlit tweak studio
            </h1>
            <span
              className="text-[11px] text-white/50 tabular-nums"
              data-testid="change-count"
            >
              {totalChanges} change{totalChanges === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              aria-label="Dial name"
              className="h-8 min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-2 text-[12px]"
              value={state.name}
              onChange={(e) =>
                setTweaks((s) => ({ ...s, name: e.target.value }))
              }
            />
            <button
              type="button"
              className={btn}
              onClick={() => {
                saveDial(state);
                flash(`Saved “${state.name}”`);
              }}
            >
              Save
            </button>
          </div>
          <div className="flex gap-2">
            <select
              aria-label="Load a preset"
              className="h-8 min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-1.5 text-[12px]"
              value=""
              onChange={(e) => {
                const dial = allDials[Number(e.target.value)];
                if (dial) {
                  setTweaks(dial);
                  flash(`Loaded “${dial.name}”`);
                }
              }}
            >
              <option value="">Load a dial…</option>
              <optgroup label="Proposed by Claude">
                {PROPOSED_DIALS.map((d, i) => (
                  <option key={d.name} value={i}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
              {savedDials.length ? (
                <optgroup label="Saved in this browser">
                  {savedDials.map((d, i) => (
                    <option key={d.name} value={PROPOSED_DIALS.length + i}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <button
              type="button"
              className={btn}
              aria-label="Undo"
              title="Undo (⌘Z)"
              disabled={!history.canUndo}
              onClick={undo}
            >
              Undo
            </button>
            <button
              type="button"
              className={btn}
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
              disabled={!history.canRedo}
              onClick={redo}
            >
              Redo
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={bypass}
              className={`${btn} flex-1 ${bypass ? "border-amber-300 text-amber-200" : ""}`}
              title="Hold, or hold the \ key"
              onPointerDown={() => setBypass(true)}
              onPointerUp={() => setBypass(false)}
              onPointerLeave={() => bypass && setBypass(false)}
              onPointerCancel={() => setBypass(false)}
            >
              {bypass
                ? "Showing the original"
                : "Hold to compare with original"}
            </button>
            <button
              type="button"
              className={btn}
              disabled={totalChanges === 0}
              onClick={() => {
                setTweaks({
                  ...DEFAULT_STATE,
                  name: state.name,
                  notes: state.notes,
                  comments: state.comments,
                });
                flash("Reset every dial (notes kept)");
              }}
            >
              Reset all
            </button>
          </div>
        </header>

        <div
          role="tablist"
          aria-label="Studio sections"
          className="flex border-b border-white/10"
        >
          {(
            [
              ["tune", "Tune"],
              [
                "checks",
                contrastFails ? `Checks (${contrastFails} ✕)` : "Checks ✓",
              ],
              ["share", "Share"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`min-h-11 flex-1 text-[12px] ${tab === id ? "border-b-2 border-white font-semibold text-white" : "text-white/55 hover:text-white"}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {catalog.size === 0 ? (
            <p className="p-4 text-[12px] text-white/50">
              Reading the theme from the preview…
            </p>
          ) : tab === "checks" ? (
            <ContrastTable catalog={catalog} state={state} />
          ) : tab === "share" ? (
            <SharePanel
              catalog={catalog}
              state={state}
              screen={screen}
              flash={flash}
            />
          ) : (
            <>
              <div className="sticky top-0 z-10 flex gap-2 border-b border-white/10 bg-neutral-950 p-3">
                <input
                  type="search"
                  aria-label="Search tokens"
                  placeholder={`Search ${catalog.size} tokens`}
                  className="h-8 min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-2 text-[12px]"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <label className="flex items-center gap-1.5 text-[12px] text-white/70">
                  <input
                    type="checkbox"
                    checked={changedOnly}
                    onChange={(e) => setChangedOnly(e.target.checked)}
                  />
                  Changed
                </label>
              </div>
              {searching ? null : (
                <>
                  <Section
                    title="Palette shifts"
                    blurb="Move whole families in OKLCH: hue, chroma, lightness"
                    defaultOpen
                  >
                    <ShiftEditor
                      id="all"
                      label="Everything"
                      catalog={catalog}
                      state={state}
                    />
                    {families.map((f) => (
                      <ShiftEditor
                        key={f}
                        id={f}
                        label={f}
                        catalog={catalog}
                        state={state}
                      />
                    ))}
                  </Section>
                  <Section
                    title="Artwork"
                    blurb="Which tent, campfire and castle the scene draws"
                    badge={sceneChanges(state).length}
                    defaultOpen
                  >
                    <SceneEditor
                      state={state}
                      onShowAll={() => setScreen(STARLIT_ARTWORK_PATH)}
                    />
                  </Section>
                  <Section
                    title="Sky drawing"
                    blurb="Star count, pattern, twinkle, village lights"
                    badge={skyChanges(state).length}
                  >
                    <SkyEditor state={state} />
                  </Section>
                  <Section
                    title="Type scale"
                    blurb="The root font size: every rem in the design follows"
                    badge={state.typeScale !== 100 ? 1 : 0}
                  >
                    <Slider
                      label="Root size"
                      value={state.typeScale}
                      min={80}
                      max={130}
                      step={1}
                      suffix="%"
                      onChange={(typeScale) =>
                        setTweaks((s) => ({ ...s, typeScale }))
                      }
                    />
                  </Section>
                </>
              )}
              {GROUPS.map((g) => {
                const defs = grouped.get(g.id);
                if (!defs?.length) return null;
                const badge = defs.filter((d) =>
                  changedTokens.has(d.name),
                ).length;
                return (
                  <Section
                    key={g.id}
                    title={g.title}
                    blurb={g.blurb}
                    badge={badge}
                    forceOpen={searching}
                  >
                    {defs.map((def) => (
                      <TokenRow
                        key={def.name}
                        def={def}
                        catalog={catalog}
                        state={state}
                      />
                    ))}
                  </Section>
                );
              })}
            </>
          )}
        </div>
      </aside>

      <main className="hidden min-w-0 flex-1 flex-col lg:flex">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-2">
          <select
            aria-label="Screen to preview"
            className="h-8 rounded border border-white/15 bg-black/40 px-1.5 text-[12px]"
            value={screen}
            onChange={(e) => setScreen(e.target.value)}
          >
            {SCREENS.map((s) => (
              <option key={s.href} value={s.href}>
                {s.label}
              </option>
            ))}
          </select>
          <div role="group" aria-label="Preview layout" className="flex gap-1">
            {(["both", "phone", "wide"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={layout === l}
                className={`${btn} ${layout === l ? "border-white/60 bg-white/15" : ""}`}
                onClick={() => setLayout(l)}
              >
                {l === "both" ? "Both" : l === "phone" ? "Phone" : "Wide"}
              </button>
            ))}
          </div>
          <a className={btn} href={screen} target="_blank" rel="noreferrer">
            Open in a tab ↗
          </a>
          <span className="ml-auto text-[11px] text-white/40">
            Hold \ to compare · ⌘Z undo
          </span>
        </div>
        <div
          ref={previewRef}
          className="flex min-h-0 flex-1 items-center justify-center gap-6 overflow-hidden p-6"
        >
          {layout !== "wide" ? (
            <Frame device="phone" src={screen} scale={scale} onDoc={setDoc} />
          ) : null}
          {layout !== "phone" ? (
            <Frame
              device="wide"
              src={screen}
              scale={scale}
              onDoc={layout === "wide" ? setDoc : undefined}
            />
          ) : null}
        </div>
      </main>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded bg-white px-3 py-1.5 text-[12px] text-black shadow-xl"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
