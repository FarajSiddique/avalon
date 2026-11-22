import { createFileRoute, redirect } from "@tanstack/react-router";

/** One design is left, so /design opens it. */
export const Route = createFileRoute("/design/")({
  beforeLoad: () => {
    throw redirect({ to: "/design/starlit" });
  },
});
