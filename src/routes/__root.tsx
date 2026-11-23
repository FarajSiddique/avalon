import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles/app.css?url";

const description =
  "Play The Resistance: Avalon together, each on your own phone. 5 to 10 players.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      // HTML's canonical label. The rule is about Node's Buffer encodings.
      // oxlint-disable-next-line unicorn/text-encoding-identifier-case -- HTML meta charset
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#15131d" },
      { name: "description", content: description },
      { title: "Avalon" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-5 py-10">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <p className="text-ink-muted">There is nothing at this address.</p>
      <Link to="/" className="text-accent-strong underline underline-offset-4">
        Back to the start
      </Link>
    </main>
  );
}
