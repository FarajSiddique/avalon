/**
 * The one long-running process: Next.js and Socket.IO on the same HTTP server
 * and the same port. This file is why the app cannot run on Vercel functions
 * and must be deployed as a single always-on service. See docs/architecture.md.
 */

import { createServer } from "node:http";
import next from "next";
import { attachRealtime } from "@/server/realtime/attach";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

async function main(): Promise<void> {
  const app = next({ dev, hostname, port });
  const handleRequest = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handleRequest(req, res).catch((error: unknown) => {
      console.error("[server] request failed", error);
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    });
  });

  const realtime = attachRealtime(httpServer);

  httpServer.listen(port, hostname, () => {
    console.log(
      `> Avalon ready on http://localhost:${port} (${dev ? "development" : "production"})`,
    );
  });

  const shutdown = (): void => {
    void realtime.close().finally(() => {
      httpServer.close(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 5_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
