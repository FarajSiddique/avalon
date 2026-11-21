import { createFileRoute } from "@tanstack/react-router";
import { setTweaks } from "@/design/tweaks/store";
import { useSceneTweak } from "@/design/tweaks/use-starlit-tweaks";
import { CampScene } from "./-components/art/camp-scene";
import {
  SCENE_PARTS,
  type SceneOptions,
} from "./-components/art/scene-options";
import { IconCheck } from "./-components/icons";

export const Route = createFileRoute("/design/starlit/artwork")({
  head: () => ({ meta: [{ title: "Artwork variants · Starlit Vale" }] }),
  component: ArtworkPage,
});

/** Where each part sits in the 1440 by 700 camp drawing, for the close-ups. */
const CROPS: Record<keyof SceneOptions, { viewBox: string; aspect: string }> = {
  tent: { viewBox: "960 270 290 250", aspect: "aspect-[29/25]" },
  fire: { viewBox: "730 410 240 170", aspect: "aspect-[24/17]" },
  castle: { viewBox: "684 236 176 120", aspect: "aspect-[22/15]" },
};

function choose(part: keyof SceneOptions, style: string): void {
  setTweaks((s) => ({ ...s, scene: { ...s.scene, [part]: style } }));
}

/**
 * Prototype-only contact sheet: every version of the tent, the campfire and
 * the castle, drawn in place and cropped close. Choosing one applies it to
 * every Starlit screen through the tweak studio's dial.
 */
function ArtworkPage() {
  const scene = useSceneTweak();
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-[72rem] flex-1 flex-col gap-8 px-4 pt-6 pb-16 lg:px-8">
      <header className="max-w-[40rem]">
        <p className="sl-eyebrow">Artwork variants</p>
        <h1 className="font-display mt-1 text-4xl font-medium">
          Tent, campfire and castle
        </h1>
        <p className="text-ink-muted mt-2 text-[1.0625rem] leading-relaxed">
          Every version, drawn in place. Choose one and it is used on every
          Starlit screen: the landing scene, the fire in the seat ring and the
          motion gallery. The tweak studio shows the same choice under Artwork.
        </p>
      </header>

      <section
        aria-label="The current combination"
        className="sl-panel overflow-hidden"
      >
        <CampScene
          className="block aspect-[1440/700] w-full"
          preserveAspectRatio="xMidYMid slice"
        />
      </section>

      {SCENE_PARTS.map((part) => (
        <section key={part.key} aria-labelledby={`art-${part.key}`}>
          <h2
            id={`art-${part.key}`}
            className="font-display mb-3 text-2xl font-medium"
          >
            {part.title}
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {part.styles.map((style) => {
              const [name, blurb] = (
                part.labels as Record<string, readonly [string, string]>
              )[style] ?? [style, ""];
              const active = scene[part.key] === style;
              return (
                <li key={style}>
                  <button
                    type="button"
                    aria-pressed={active}
                    data-variant={`${part.key}:${style}`}
                    onClick={() => choose(part.key, style)}
                    className={`sl-panel flex h-full w-full flex-col overflow-hidden text-left transition-[border-color] ${
                      active
                        ? "border-accent! border-2"
                        : "hover:border-line-strong!"
                    }`}
                  >
                    <CampScene
                      scene={{ [part.key]: style }}
                      viewBox={CROPS[part.key].viewBox}
                      preserveAspectRatio="xMidYMid slice"
                      className={`block w-full bg-[var(--art-sky-mid)] ${CROPS[part.key].aspect}`}
                    />
                    <span className="flex flex-1 flex-col gap-1 p-3">
                      <span className="flex flex-wrap items-center gap-x-1.5 font-bold">
                        {name}
                        {active ? (
                          <span className="text-success ml-auto inline-flex items-center gap-1 text-sm whitespace-nowrap">
                            <IconCheck className="size-4" />
                            In use
                          </span>
                        ) : null}
                      </span>
                      <span className="text-ink-muted text-sm leading-snug">
                        {blurb}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
