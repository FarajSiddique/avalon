/**
 * The studio's controls, one per token kind. Deliberately plain tool chrome
 * (like DesignNav) so it is never mistaken for part of the design.
 * Prototype-only.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { normalizeHex } from "./color";
import { WIDE_SUFFIX, familyOf, type Catalog, type TokenDef } from "./catalog";
import { declaredValue, resolveValue, type TweakState } from "./state";
import { setTweaks } from "./store";

export function setVar(
  key: string,
  value: string | undefined,
  fallback: string,
): void {
  setTweaks((s) => {
    const vars = { ...s.vars };
    if (value === undefined || value.trim() === fallback) delete vars[key];
    else vars[key] = value.trim();
    return { ...s, vars };
  });
}

export function setComment(token: string, text: string): void {
  setTweaks((s) => {
    const comments = { ...s.comments };
    if (text.trim()) comments[token] = text;
    else delete comments[token];
    return { ...s, comments };
  });
}

export function Swatch({
  color,
  size = 18,
}: {
  color: string | undefined;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded border border-white/25"
      style={{
        width: size,
        height: size,
        background:
          color && normalizeHex(color)
            ? color
            : "repeating-conic-gradient(#666 0 25%, #333 0 50%) 0 0 / 8px 8px",
      }}
    />
  );
}

const inputClass =
  "h-8 min-w-0 rounded border border-white/15 bg-black/40 px-2 text-[12px] text-white outline-none focus:border-white/60";

function splitNumber(value: string): { n: number; unit: string } | null {
  const match = /^(-?[\d.]+)([a-z%]*)$/i.exec(value.trim());
  if (!match?.[1]) return null;
  return { n: Number.parseFloat(match[1]), unit: match[2] ?? "" };
}

function RangeControl({
  def,
  value,
  onChange,
}: {
  def: TokenDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const parsed = splitNumber(value);
  const unit = parsed?.unit ?? splitNumber(def.base)?.unit ?? "";
  const range = def.range ?? { min: 0, max: 100, step: 1 };
  if (!parsed) return <TextControl value={value} onChange={onChange} />;
  const max = Math.max(range.max, parsed.n);
  const min = Math.min(range.min, parsed.n);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        type="range"
        aria-label={def.label}
        className="min-w-0 flex-1 accent-white"
        min={min}
        max={max}
        step={range.step}
        value={parsed.n}
        onChange={(e) => onChange(`${e.target.value}${unit}`)}
      />
      <input
        type="number"
        aria-label={`${def.label} value`}
        className={`${inputClass} w-[72px] text-right tabular-nums`}
        step={range.step}
        value={parsed.n}
        onChange={(e) => {
          // An emptied or half-typed box is not a value yet: keep the last one.
          const n = e.target.valueAsNumber;
          if (Number.isFinite(n)) onChange(`${n}${unit}`);
        }}
      />
      <span className="w-6 text-[11px] text-white/50">{unit}</span>
    </div>
  );
}

/**
 * A text field that commits on blur or Enter, so typing does not thrash. It
 * is uncontrolled and keyed by the value, so an outside change resets it.
 */
function TextControl({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <input
      key={value}
      aria-label={label}
      className={`${inputClass} flex-1 font-mono`}
      defaultValue={value}
      onBlur={(e) => onChange(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onChange(e.currentTarget.value);
      }}
    />
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = normalizeHex(value) ?? "#000000";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        type="color"
        aria-label={label}
        className="h-8 w-10 shrink-0 cursor-pointer rounded border border-white/15 bg-transparent p-0.5"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
      />
      <TextControl label={`${label} hex`} value={value} onChange={onChange} />
    </div>
  );
}

function bezierPoints(value: string): [number, number, number, number] | null {
  if (value.trim() === "linear") return [0, 0, 1, 1];
  const m = /cubic-bezier\(([^)]+)\)/.exec(value);
  if (!m?.[1]) return null;
  const parts = m[1].split(",").map((p) => Number.parseFloat(p));
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
  return parts as [number, number, number, number];
}

function EasingControl({
  def,
  value,
  onChange,
}: {
  def: TokenDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const pts = bezierPoints(value);
  const known = def.options?.some((o) => o.value === value);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <svg
          viewBox="-0.1 -0.6 1.2 2.2"
          className="h-10 w-10 shrink-0 rounded bg-black/40"
          aria-hidden
        >
          <g transform="translate(0 1) scale(1 -1)">
            <path
              d="M0 0L1 1"
              stroke="rgb(255 255 255 / 0.15)"
              strokeWidth={0.02}
            />
            {pts ? (
              <path
                d={`M0 0C${pts[0]} ${pts[1]} ${pts[2]} ${pts[3]} 1 1`}
                fill="none"
                stroke="white"
                strokeWidth={0.05}
              />
            ) : null}
          </g>
        </svg>
        <select
          aria-label={`${def.label} preset`}
          className={`${inputClass} flex-1`}
          value={known ? value : ""}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        >
          <option value="">Custom</option>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <TextControl label={def.label} value={value} onChange={onChange} />
    </div>
  );
}

function OptionControl({
  def,
  value,
  onChange,
}: {
  def: TokenDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const known = def.options?.some((o) => o.value === value);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <select
        aria-label={def.label}
        className={`${inputClass} w-full`}
        value={known ? value : ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      >
        <option value="">Custom</option>
        {def.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {known ? null : (
        <TextControl
          label={`${def.label} value`}
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  );
}

/**
 * Points a token at a palette primitive (or another token), with a custom
 * colour as the escape hatch. The popover shows every primitive as a swatch,
 * grouped by family.
 */
function RefControl({
  def,
  value,
  catalog,
  state,
  onChange,
}: {
  def: TokenDef;
  value: string;
  catalog: Catalog;
  state: TweakState;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const resolved = resolveValue(catalog, state, def.name);
  const ref = /^var\((--[\w-]+)\)$/.exec(value)?.[1];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const families = new Map<string, TokenDef[]>();
  for (const t of catalog.values()) {
    const fam = familyOf(t.name);
    if (!fam) continue;
    families.set(fam, [...(families.get(fam) ?? []), t]);
  }

  return (
    <div ref={box} className="relative flex min-w-0 flex-1 items-center gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${def.label}: choose a colour`}
        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded border border-white/15 bg-black/40 px-2 text-left text-[12px] hover:border-white/50"
        onClick={() => setOpen((o) => !o)}
      >
        <Swatch color={resolved} />
        <span className="truncate font-mono">
          {ref ? ref.replace("--starlit-", "") : value}
        </span>
      </button>
      {open ? (
        <div className="absolute top-9 right-0 z-30 max-h-[360px] w-[300px] overflow-y-auto rounded-md border border-white/20 bg-neutral-950 p-2 shadow-2xl">
          {[...families].map(([fam, tokens]) => (
            <div key={fam} className="mb-2">
              <div className="mb-1 text-[10px] tracking-wider text-white/50 uppercase">
                {fam}
              </div>
              <div className="flex flex-wrap gap-1">
                {tokens.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    title={t.name}
                    aria-label={t.name}
                    aria-pressed={ref === t.name}
                    className={`rounded p-0.5 ${ref === t.name ? "ring-2 ring-white" : "hover:ring-1 hover:ring-white/60"}`}
                    onClick={() => {
                      onChange(`var(${t.name})`);
                      setOpen(false);
                    }}
                  >
                    <Swatch
                      color={declaredValue(catalog, state, t.name)}
                      size={22}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="mb-1 text-[10px] tracking-wider text-white/50 uppercase">
              Custom colour
            </div>
            <ColorControl
              label={`${def.label} custom`}
              value={resolved ?? "#000000"}
              onChange={onChange}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TokenControl({
  def,
  catalog,
  state,
  wide = false,
}: {
  def: TokenDef;
  catalog: Catalog;
  state: TweakState;
  wide?: boolean;
}) {
  const key = wide ? def.name + WIDE_SUFFIX : def.name;
  const fallback = wide ? (def.wide ?? def.base) : def.base;
  const value = state.vars[key] ?? fallback;
  const onChange = (v: string) => setVar(key, v, fallback);
  switch (def.kind) {
    case "color":
      return (
        <ColorControl label={def.label} value={value} onChange={onChange} />
      );
    case "ref":
      return (
        <RefControl
          def={def}
          value={value}
          catalog={catalog}
          state={state}
          onChange={onChange}
        />
      );
    case "length":
    case "time":
    case "percent":
    case "number":
      return <RangeControl def={def} value={value} onChange={onChange} />;
    case "easing":
      return <EasingControl def={def} value={value} onChange={onChange} />;
    case "font":
      return <OptionControl def={def} value={value} onChange={onChange} />;
    default:
      return (
        <TextControl label={def.label} value={value} onChange={onChange} />
      );
  }
}

function SmallButton({ children, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className="flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30"
      {...rest}
    >
      {children}
    </button>
  );
}

/** One token: label, control (twice for tokens with a wide value), reset, note. */
export function TokenRow({
  def,
  catalog,
  state,
}: {
  def: TokenDef;
  catalog: Catalog;
  state: TweakState;
}) {
  const [noting, setNoting] = useState(false);
  const noteId = useId();
  const changed =
    state.vars[def.name] !== undefined ||
    state.vars[def.name + WIDE_SUFFIX] !== undefined ||
    (familyOf(def.name) !== null &&
      declaredValue(catalog, state, def.name) !== def.base);
  const comment = state.comments[def.name] ?? "";
  const reset = () =>
    setTweaks((s) => {
      const vars = { ...s.vars };
      delete vars[def.name];
      delete vars[def.name + WIDE_SUFFIX];
      return { ...s, vars };
    });
  const shifted =
    familyOf(def.name) !== null &&
    declaredValue(catalog, state, def.name) !==
      (state.vars[def.name] ?? def.base);

  return (
    <div className="border-b border-white/5 py-2" data-token={def.name}>
      <div className="mb-1 flex items-center gap-1.5">
        <span
          aria-label={changed ? "Changed" : undefined}
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${changed ? "bg-amber-300" : "bg-transparent"}`}
        />
        <span
          className="min-w-0 flex-1 truncate text-[12px] text-white/90"
          title={def.name}
        >
          {def.label}
          <span className="ml-1.5 font-mono text-[10px] text-white/35">
            {def.name}
          </span>
        </span>
        {shifted ? (
          <span
            className="flex items-center gap-1 text-[10px] text-white/50"
            title="After palette shifts"
          >
            →{" "}
            <Swatch color={declaredValue(catalog, state, def.name)} size={12} />
          </span>
        ) : null}
        <SmallButton
          aria-label={`Note on ${def.name}`}
          aria-expanded={noting}
          aria-controls={noteId}
          onClick={() => setNoting((n) => !n)}
          className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-[11px] hover:bg-white/10 ${comment ? "text-sky-300" : "text-white/40"}`}
        >
          note
        </SmallButton>
        <SmallButton
          aria-label={`Reset ${def.name}`}
          disabled={!changed}
          onClick={reset}
        >
          reset
        </SmallButton>
      </div>
      {def.hint ? (
        <p className="mb-1 text-[11px] text-white/45">{def.hint}</p>
      ) : null}
      {def.wide === undefined ? (
        <TokenControl def={def} catalog={catalog} state={state} />
      ) : (
        <div className="flex flex-col gap-1.5">
          <Labelled label="Phone">
            <TokenControl def={def} catalog={catalog} state={state} />
          </Labelled>
          <Labelled label="≥1024">
            <TokenControl def={def} catalog={catalog} state={state} wide />
          </Labelled>
        </div>
      )}
      {noting || comment ? (
        <textarea
          id={noteId}
          aria-label={`Note for Claude on ${def.name}`}
          placeholder="A note for Claude: what you want from this token"
          className="mt-1.5 w-full rounded border border-white/15 bg-black/40 p-1.5 text-[12px] text-white outline-none focus:border-white/60"
          rows={2}
          value={comment}
          onChange={(e) => setComment(def.name, e.target.value)}
        />
      ) : null}
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-11 shrink-0 pt-2 text-[10px] text-white/45">
        {label}
      </span>
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}
