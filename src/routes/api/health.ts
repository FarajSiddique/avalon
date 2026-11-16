import { createFileRoute } from "@tanstack/react-router";

/** Liveness check. Answered by the Worker at request time, never cached. */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { status: "ok" },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});
