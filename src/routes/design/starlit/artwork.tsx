import { createFileRoute } from "@tanstack/react-router";
import { setTweaks } from "@/design/tweaks/store";
import { useSceneTweak } from "@/design/tweaks/use-starlit-tweaks";
import { CampScene } from "./-components/art/camp-scene";
import { cropFor } from "./-components/art/backdrop-layout";
import {
  SCENE_PARTS,
  type BackdropStyle,
  type HeroStyle,
  type SceneOptions,
} from "./-components/art/scene-options";
import { IconCheck } from "./-components/icons";
import { Hero3D } from "./-components/three/hero-3d";

export const Route = createFileRoute("/design/starlit/artwork")({
  head: () => ({ meta: [{ title: "Artwork variants · Starlit Vale" }] }),
  component: ArtworkPage,
});

/** How each kind of card frames the drawing. */
function framing(part: keyof SceneOptions, backdrop: BackdropStyle) {
  switch (part) {
    case "hero":
    case "backdrop":
      return { viewBox: "0 0 1440 700", aspect: "aspect-[1440/700]" };
    case "tent":
      return { viewBox: cropFor("tent", backdrop), aspect: "aspect-[29/25]" };
    case "fire":
      return { viewBox: cropFor("fire", backdrop), aspect: "aspect-[24/17]" };
    case "castle":
      return {
        viewBox: cropFor("castle", backdrop),
        aspect: "aspect-[22/15]",
      };
  }
}

const WIDE = "block aspect-[1440/700] w-full";

/** A full-width picture of a hero: the drawing, or a live 3D concept. */
function HeroPicture({ hero, live }: { hero: HeroStyle; live: boolean }) {
  const drawn = (
    <CampScene
      className={`${WIDE} bg-[var(--art-sky-mid)]`}
      preserveAspectRatio="xMidYMid slice"
    />
  );
  if (hero === "drawn") return drawn;
  return (
    <Hero3D
      concept={hero}
      className={`${WIDE} sl-hero-3d--flush`}
      interactive={live}
      snapshot={!live}
      backdrop={false}
      fallback={drawn}
    />
  );
}

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
          Landing hero and drawn scene
        </h1>
        <p className="text-ink-muted mt-2 text-[1.0625rem] leading-relaxed">
          The landing hero is either the drawn scene or one of three live 3D
          concepts (move the pointer over the one at the top). The drawn scene
          is built from a backdrop, a tent, a campfire and a castle, and it is
          also used on the other Starlit screens: the fire in the seat ring and
          the motion gallery. The tweak studio shows the same choices under
          Artwork.
        </p>
      </header>

      <section
        aria-label="The current combination"
        className="sl-panel overflow-hidden"
      >
        <HeroPicture hero={scene.hero} live />
      </section>

      {SCENE_PARTS.map((part) => (
        <section key={part.key} aria-labelledby={`art-${part.key}`}>
          <h2
            id={`art-${part.key}`}
            className="font-display mb-3 text-2xl font-medium"
          >
            {part.title}
          </h2>
          <ul
            className={`grid gap-3 ${
              part.key === "backdrop" || part.key === "hero"
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            }`}
          >
            {part.styles.map((style) => {
              const frame = framing(part.key, scene.backdrop);
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
                    {part.key === "hero" ? (
                      <HeroPicture hero={style as HeroStyle} live={false} />
                    ) : (
                      <CampScene
                        scene={{ [part.key]: style }}
                        viewBox={frame.viewBox}
                        preserveAspectRatio="xMidYMid slice"
                        className={`block w-full bg-[var(--art-sky-mid)] ${frame.aspect}`}
                      />
                    )}
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
