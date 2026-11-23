import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/ui/app-shell";
import { DesignNav } from "@/design/design-nav";
import { isPrototypeNextInFlow } from "@/design/flow";

export const Route = createFileRoute("/design/starlit")({
  head: () => ({ meta: [{ title: "Starlit Vale" }] }),
  component: Layout,
});

function Layout() {
  return (
    <AppShell bar={<DesignNav />} isNextInFlow={isPrototypeNextInFlow}>
      <Outlet />
    </AppShell>
  );
}
