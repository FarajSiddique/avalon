import { useHoldToReveal } from "@/client/use-hold-to-reveal";
import type { Alignment } from "@/shared/roles";
import { DaggerIcon, HandIcon, ShieldIcon } from "../art/icons";
import { RuneCircle } from "../art/rune-circle";
import { WaxSeal } from "../art/wax-seal";
import type { RoleKnowledge } from "./role-knowledge";

export interface RoleCardContent {
  name: string;
  alignment: Alignment;
  summary: string;
  knowledge: RoleKnowledge;
}

/** The back of the card: a seal over a rune circle. Shows nothing secret. */
function CardBack() {
  return (
    <div className="ember-cardback flex h-full w-full flex-col items-center justify-between px-6 py-8">
      <p className="ember-label text-accent-strong">Your role</p>
      <div className="relative w-[78%]">
        <RuneCircle bare />
        <WaxSeal
          size={72}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <svg
            viewBox="-12 -12 24 24"
            width={36}
            height={36}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            <path d="M0-9V9M-5-4 0-9 5-4M-4 3h8" />
          </svg>
        </WaxSeal>
      </div>
      <p className="ember-pulse text-accent-strong flex flex-col items-center gap-1.5 text-center">
        <HandIcon size={26} />
        <span className="ember-label">Press and hold to turn</span>
      </p>
    </div>
  );
}

/** The face of the card: the secret. Dark ink on parchment. */
function CardFace({ content }: { content: RoleCardContent }) {
  const good = content.alignment === "good";
  const { knowledge } = content;
  return (
    <div className="ember-parchment flex h-full w-full flex-col px-6 pt-6 pb-5 text-left">
      <p
        className={`flex items-center gap-2.5 ${
          good ? "text-(--paper-good)" : "text-(--paper-evil)"
        }`}
      >
        <WaxSeal tone={good ? "arcane" : "wax"} size={38}>
          {good ? <ShieldIcon size={22} /> : <DaggerIcon size={22} />}
        </WaxSeal>
        <span className="ember-label text-base">
          {good ? "Good" : "Evil"}
          <span className="ember-paper-muted block text-[0.6875rem] tracking-[0.14em]">
            {good ? "Loyal to Arthur" : "Sworn to Mordred"}
          </span>
        </span>
      </p>

      <p className="font-display mt-3 text-[2rem] leading-[1.05] font-bold tracking-[0.08em] uppercase">
        {content.name}
      </p>
      <div className="ember-paper-rule mt-3 mb-3" />
      <p className="text-[1.0625rem] leading-snug font-medium">
        {content.summary}
      </p>

      {/* A faint watermark of the allegiance fills whatever room is left. */}
      <div
        className={`grid min-h-0 flex-1 place-items-center overflow-hidden opacity-[0.14] ${
          good ? "text-(--paper-good)" : "text-(--paper-evil)"
        }`}
        aria-hidden="true"
      >
        {good ? <ShieldIcon size={84} /> : <DaggerIcon size={84} />}
      </div>

      <div>
        <p className="ember-label ember-paper-muted text-[0.75rem]">
          What you know
        </p>
        <p className="mt-1 text-[1.0625rem] leading-snug font-medium">
          {knowledge.lead}
        </p>
        {knowledge.names ? (
          <p
            className={`font-display mt-1 flex items-center gap-2 text-[1.1875rem] leading-tight font-bold tracking-[0.06em] uppercase ${
              knowledge.tone === "evil" ? "text-(--paper-evil)" : ""
            }`}
          >
            {knowledge.tone === "evil" ? <DaggerIcon size={20} /> : null}
            {knowledge.names}
          </p>
        ) : null}
        {knowledge.note ? (
          <p className="ember-paper-muted mt-2 text-[1.0625rem] leading-snug italic">
            {knowledge.note}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The role card. It lies face down. While a finger (or Space or Enter) is
 * held on it, it lifts off the table and turns over; on release it drops
 * face down again. See `useHoldToReveal` for the hiding rules.
 */
export function RoleCard({ content }: { content: RoleCardContent }) {
  const { revealed, holdProps } = useHoldToReveal();
  const { style, ...hold } = holdProps;

  return (
    <button
      type="button"
      {...hold}
      style={style}
      className="ember-flip block aspect-[5/7] w-[min(76vw,19rem)] shrink-0 cursor-pointer rounded-lg lg:w-[23rem]"
    >
      <span className="ember-flip-inner block">
        <span
          className="ember-flip-face block"
          aria-hidden={revealed ? "true" : undefined}
        >
          <CardBack />
        </span>
        <span
          className="ember-flip-face ember-flip-face--front block"
          aria-hidden={revealed ? undefined : "true"}
        >
          <CardFace content={content} />
        </span>
      </span>
    </button>
  );
}
