import { ClientOnly } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NightSky } from "@/components/art/night-sky";
import { Stage } from "@/components/stage/stage";
import {
  StageProvider,
  type IsNextInFlow,
} from "@/components/stage/stage-context";
import { SoundToggle } from "@/components/ui/sound-toggle";

/**
 * The frame every Starlit page sits in: the night sky, the shared stage and
 * the sound switch. The sky and the stage render in the browser only, so
 * the Worker sends a light page (see "Rendering" in docs/design-system.md).
 * `data-app-shell` is where overlays such as the role card open, so they
 * sit over the scene and outside any panel that could clip them.
 */
export function AppShell({
  children,
  bar,
  isNextInFlow,
}: {
  children: ReactNode;
  bar?: ReactNode;
  isNextInFlow?: IsNextInFlow;
}) {
  return (
    <div
      data-app-shell=""
      className="bg-canvas font-body text-ink relative isolate flex min-h-dvh flex-1 flex-col"
    >
      {bar}
      {/* A fixed backdrop: it reserves no space, so it needs no fallback. */}
      <ClientOnly fallback={null}>
        <NightSky />
      </ClientOnly>
      <StageProvider isNextInFlow={isNextInFlow}>
        <Stage />
        {children}
      </StageProvider>
      <SoundToggle />
    </div>
  );
}
