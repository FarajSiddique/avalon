import type { ReactNode } from "react";
import {
  BODY_LABELS,
  CLOAK_LABELS,
  CLOAK_TOKENS,
  EMBLEM_LABELS,
  HEADWEAR_LABELS,
  SKIN_LABELS,
  SKIN_TOKENS,
} from "@/client/avatar";
import {
  BODIES,
  CLOAKS,
  EMBLEMS,
  FIRST_FANCY_SKIN,
  HEADWEAR,
  SKINS,
  type Avatar,
  type Emblem,
  type Skin,
} from "@/shared/avatar";
import { setAvatar, useAvatar } from "@/client/use-avatar";
import { sparklePath } from "@/components/art/seeded";
import { IconCheck, IconMoon, IconSun } from "@/components/ui/icons";

/**
 * "Your look": pick a body, a skin, a cloak, headwear and an emblem. Your figure at the
 * table changes as you choose. Saved in this browser.
 */
export function AvatarMaker() {
  const look = useAvatar();

  return (
    <div>
      <p className="text-ink-muted text-base leading-snug">
        How you appear at the table. Nobody can tell anything about your role
        from it.
      </p>

      <Picker label="Body" value={BODY_LABELS[look.body]}>
        {BODIES.map((body) => (
          <button
            key={body}
            type="button"
            aria-pressed={look.body === body}
            data-look={`body:${body}`}
            onClick={() => choose({ body })}
            className="sl-toggle"
          >
            {BODY_LABELS[body]}
          </button>
        ))}
      </Picker>

      <Picker label="Skin" value={SKIN_LABELS[look.skin]}>
        <SkinRow
          label="Everyday"
          skins={SKINS.slice(0, FIRST_FANCY_SKIN)}
          chosen={look.skin}
        />
        <SkinRow
          label="Fantastical"
          skins={SKINS.slice(FIRST_FANCY_SKIN)}
          chosen={look.skin}
        />
      </Picker>

      <Picker label="Cloak" value={CLOAK_LABELS[look.cloak]}>
        {CLOAKS.map((cloak) => (
          <button
            key={cloak}
            type="button"
            aria-pressed={look.cloak === cloak}
            aria-label={CLOAK_LABELS[cloak]}
            title={CLOAK_LABELS[cloak]}
            data-look={`cloak:${cloak}`}
            onClick={() => choose({ cloak })}
            className="sl-swatch"
            style={{ background: `var(${CLOAK_TOKENS[cloak]})` }}
          >
            {look.cloak === cloak ? <SwatchCheck /> : null}
          </button>
        ))}
      </Picker>

      <Picker label="Headwear" value={HEADWEAR_LABELS[look.headwear]}>
        {HEADWEAR.map((headwear) => (
          <button
            key={headwear}
            type="button"
            aria-pressed={look.headwear === headwear}
            data-look={`headwear:${headwear}`}
            onClick={() => choose({ headwear })}
            className="sl-toggle"
          >
            {HEADWEAR_LABELS[headwear]}
          </button>
        ))}
      </Picker>

      <Picker label="Emblem" value={EMBLEM_LABELS[look.emblem]}>
        {EMBLEMS.map((emblem) => (
          <button
            key={emblem}
            type="button"
            aria-pressed={look.emblem === emblem}
            data-look={`emblem:${emblem}`}
            onClick={() => choose({ emblem })}
            className="sl-toggle"
          >
            <EmblemIcon emblem={emblem} />
            {EMBLEM_LABELS[emblem]}
          </button>
        ))}
      </Picker>
    </div>
  );
}

function choose(change: Partial<Avatar>): void {
  setAvatar(change);
}

/** One labelled row of skin swatches inside the Skin picker. */
function SkinRow({
  label,
  skins,
  chosen,
}: {
  label: string;
  skins: ReadonlyArray<Skin>;
  chosen: Skin;
}) {
  return (
    <div role="group" aria-label={`${label} skins`} className="w-full">
      <p className="text-ink-muted mb-1.5 text-sm">{label}</p>
      <div className="flex flex-wrap gap-2">
        {skins.map((skin) => (
          <button
            key={skin}
            type="button"
            aria-pressed={chosen === skin}
            aria-label={SKIN_LABELS[skin]}
            title={SKIN_LABELS[skin]}
            data-look={`skin:${skin}`}
            onClick={() => choose({ skin })}
            className="sl-swatch"
            style={{ background: `var(${SKIN_TOKENS[skin]})` }}
          >
            {chosen === skin ? <SwatchCheck /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The tick on a chosen swatch, on its own dark disc with a light ring so it
 * reads on pale swatches (ghost, porcelain) and dark ones (ebony, starborn).
 */
function SwatchCheck() {
  return (
    <span className="sl-swatch__check" aria-hidden="true">
      <IconCheck size={16} />
    </span>
  );
}

function Picker({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="mt-4">
      <p className="mb-2 text-base">
        <span className="font-bold">{label}</span>
        <span className="text-ink-muted">: {value}</span>
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function EmblemIcon({ emblem }: { emblem: Emblem }) {
  switch (emblem) {
    case "moon":
      return <IconMoon size={16} />;
    case "sun":
      return <IconSun size={16} />;
    default:
      return (
        <svg viewBox="-12 -12 24 24" width={16} height={16} aria-hidden="true">
          {emblem === "star" ? (
            <path d={sparklePath(11)} fill="currentColor" />
          ) : emblem === "leaf" ? (
            <path
              d="M-8 8C-9 -4 0 -9 9 -9C9 0 4 9 -8 8ZM-8 8L3 -3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M-4 -6A4 4 0 1 0 -4 2A4 4 0 1 0 -4 -6M-1 0L9 10M5 6L8 3M7 8L9 6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
        </svg>
      );
  }
}
