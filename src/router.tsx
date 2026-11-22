import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setYourName } from "./design/your-name";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  // Prototype: the game seats you under the name in the lobby's address (or
  // as Wren, with none, so the lobby and the table always agree). Each time
  // a lobby has been drawn, on a direct load (hydration) or after a
  // navigation, its validated `?name=` is kept for the rest of the visit.
  // Browser only: on the Worker the name store would be shared by requests.
  if (typeof window !== "undefined") {
    router.subscribe("onRendered", () => {
      for (const match of router.state.matches) {
        if (match.routeId === "/design/starlit/lobby") {
          setYourName(match.search.name);
        }
      }
    });
  }

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
