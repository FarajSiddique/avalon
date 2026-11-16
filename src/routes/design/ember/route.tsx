import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DesignNav } from "@/design/design-nav";
import "./-fonts.css";
import "./-theme.css";

export const Route = createFileRoute("/design/ember")({
  head: () => ({ meta: [{ title: "Ember & Rune" }] }),
  component: Layout,
});

function Layout() {
  return (
    <div className="theme-ember ember-room flex min-h-dvh flex-1 flex-col overflow-x-clip">
      <DesignNav direction="ember" />
      <Outlet />
    </div>
  );
}
