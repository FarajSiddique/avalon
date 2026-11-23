import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DesignNav } from "@/design/design-nav";
import { NightSky } from "./-components/art/night-sky";
import { SoundToggle } from "./-components/sound-toggle";
import { Stage } from "./-components/stage/stage";
import { StageProvider } from "./-components/stage/stage-context";

export const Route = createFileRoute("/design/starlit")({
  head: () => ({ meta: [{ title: "Starlit Vale" }] }),
  component: Layout,
});

function Layout() {
  return (
    <div
      data-app-shell=""
      className="bg-canvas font-body text-ink relative isolate flex min-h-dvh flex-1 flex-col"
    >
      <DesignNav />
      <NightSky />
      <StageProvider>
        <Stage />
        <Outlet />
      </StageProvider>
      <SoundToggle />
    </div>
  );
}
