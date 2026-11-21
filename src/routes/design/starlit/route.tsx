import { useMemo, type ReactNode } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DesignNav } from "@/design/design-nav";
import {
  STARLIT_ARTWORK_PATH,
  STARLIT_MOTION_PATH,
  STARLIT_STUDIO_PATH,
} from "@/design/directions";
import {
  useSceneTweak,
  useStarlitTweaks,
} from "@/design/tweaks/use-starlit-tweaks";
import { NightSky } from "./-components/art/night-sky";
import { SceneArtContext } from "./-components/art/scene-context";
import { SoundToggle } from "./-components/sound-toggle";
import "./-fonts.css";
import "./-theme.css";
import "./-motion.css";

export const Route = createFileRoute("/design/starlit")({
  head: () => ({ meta: [{ title: "Starlit Vale" }] }),
  component: Layout,
});

/** Starlit Vale is the only direction with a motion gallery and a tweak studio. */
const EXTRA_SCREENS = [
  { label: "Motion", href: STARLIT_MOTION_PATH },
  { label: "Artwork", href: STARLIT_ARTWORK_PATH },
  { label: "Tweak studio", href: STARLIT_STUDIO_PATH },
];

function Layout() {
  return (
    <div className="theme-starlit bg-canvas font-body text-ink relative isolate flex min-h-dvh flex-1 flex-col">
      <DesignNav direction="starlit" extra={EXTRA_SCREENS} />
      <TweakedSky />
      <TweakedArt>
        <Outlet />
      </TweakedArt>
      <SoundToggle />
    </div>
  );
}

/**
 * The sky, plus the tweak studio's live dial: a generated stylesheet and the
 * sky's drawing options. Plain Starlit until the studio is used. Its own
 * component so a dial change does not re-render the screen.
 */
function TweakedSky() {
  const { css, sky } = useStarlitTweaks();
  const skyKey = JSON.stringify(sky);
  // Redraw the stars only when a sky option really changes, not on every dial.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drawn = useMemo(() => <NightSky sky={sky} />, [skyKey]);
  return (
    <>
      {css ? <style data-starlit-tweaks="">{css}</style> : null}
      {drawn}
    </>
  );
}

/** Hands the dial's tent, campfire and castle choice to every drawing. */
function TweakedArt({ children }: { children: ReactNode }) {
  const scene = useSceneTweak();
  const { tent, fire, castle } = scene;
  const value = useMemo(() => ({ tent, fire, castle }), [tent, fire, castle]);
  return (
    <SceneArtContext.Provider value={value}>
      {children}
    </SceneArtContext.Provider>
  );
}
