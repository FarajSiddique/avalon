import { createFileRoute } from "@tanstack/react-router";
import { TweakStudio } from "@/design/tweaks/studio";

export const Route = createFileRoute("/design/studio")({
  head: () => ({ meta: [{ title: "Starlit tweak studio · Avalon" }] }),
  // A tool that lives on localStorage and iframes: nothing to render on the Worker.
  ssr: false,
  component: TweakStudio,
});
