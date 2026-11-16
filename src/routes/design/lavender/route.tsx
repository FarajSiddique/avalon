import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DesignNav } from "@/design/design-nav";
import "./-fonts.css";
import "./-theme.css";

export const Route = createFileRoute("/design/lavender")({
  head: () => ({ meta: [{ title: "Lavender Vigil" }] }),
  component: Layout,
});

function Layout() {
  return (
    <div className="theme-lavender bg-canvas font-body text-ink flex min-h-dvh flex-col">
      <DesignNav direction="lavender" />
      <Outlet />
    </div>
  );
}
