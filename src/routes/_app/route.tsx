import { Outlet, createFileRoute } from "@tanstack/react-router";
import { isAppNextInFlow } from "@/client/app-flow";
import { AppShell } from "@/components/ui/app-shell";

/**
 * The real app's layout. It owns the stage, so the landing and the lobby
 * share one scene and the camera flies from one to the other.
 */
export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  return (
    <AppShell isNextInFlow={isAppNextInFlow}>
      <Outlet />
    </AppShell>
  );
}
