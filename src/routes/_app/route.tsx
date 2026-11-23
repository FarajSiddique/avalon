import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ui/app-shell";

/**
 * The real app's layout. It owns the stage, so the landing and (from Phase
 * 1) the lobby share one scene and the camera can fly between them.
 */
export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
