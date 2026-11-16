import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DesignNav } from "@/design/design-nav";
import { STARLIT_MOTION_PATH } from "@/design/directions";
import { NightSky } from "./-components/art/night-sky";
import { SoundToggle } from "./-components/sound-toggle";
import "./-fonts.css";
import "./-theme.css";
import "./-motion.css";

export const Route = createFileRoute("/design/starlit")({
  head: () => ({ meta: [{ title: "Starlit Vale" }] }),
  component: Layout,
});

/** Starlit Vale is the only direction with a motion and sound gallery. */
const EXTRA_SCREENS = [{ label: "Motion", href: STARLIT_MOTION_PATH }];

function Layout() {
  return (
    <div className="theme-starlit bg-canvas font-body text-ink relative isolate flex min-h-dvh flex-1 flex-col">
      <DesignNav direction="starlit" extra={EXTRA_SCREENS} />
      <NightSky />
      <Outlet />
      <SoundToggle />
    </div>
  );
}
