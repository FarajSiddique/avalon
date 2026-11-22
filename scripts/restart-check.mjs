#!/usr/bin/env node
/**
 * Proves that a room outlives the server process.
 *
 *   pnpm build && pnpm test:restart
 *
 * Two browsers join a room. The server is stopped and started again (so its
 * memory is gone). Without a reload, both pages must reconnect and still be
 * in their seats. This is the property a Durable Object room has to keep:
 * nothing about a room may live only in memory.
 */

import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const port = Number.parseInt(process.env.PORT ?? "3110", 10);
const base = `http://localhost:${port}`;

async function startServer() {
  const child = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--port", String(port), "--strictPort"],
    { stdio: "ignore", detached: true },
  );

  for (let i = 0; i < 150; i += 1) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        return child;
      }
    } catch {
      // Not up yet.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
  }

  throw new Error("The server did not start. Run `pnpm build` first.");
}

function stopServer(child) {
  return new Promise((resolve) => {
    child.on("exit", resolve);
    process.kill(-child.pid, "SIGTERM");
  });
}

function check(condition, message) {
  if (!condition) {
    throw new Error(`Restart check failed: ${message}`);
  }
}

const names = (page) => page.getByTestId("player").allInnerTexts();
const online = (page, value) =>
  page
    .locator(`[data-testid="connection"][data-online="${value}"]`)
    .waitFor({ timeout: 20_000 });

let server = await startServer();
const browser = await chromium.launch();

try {
  const host = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();

  await host.goto(base);
  await host.getByRole("textbox", { name: "Your name" }).fill("Wren");
  await host.getByRole("button", { name: "Create a room" }).click();
  await host.getByTestId("room-code").waitFor();
  const code = await host.getByTestId("room-code").innerText();

  await guest.goto(`${base}/room/${code}`);
  await guest.getByRole("textbox", { name: "Your name" }).fill("Ansel");
  await guest.getByRole("button", { name: "Join room" }).click();
  await host.getByTestId("player").nth(1).waitFor();
  console.log(`Room ${code}: two players seated.`);

  await stopServer(server);
  await online(host, false);
  await online(guest, false);
  console.log("Server stopped. Both pages show that they are reconnecting.");

  server = await startServer();
  console.log("Server started again as a new process.");
  await online(host, true);
  await online(guest, true);
  await host
    .locator('[data-testid="player"][data-connected="true"]')
    .nth(1)
    .waitFor({ timeout: 10_000 });

  const hostSees = await names(host);
  const guestSees = await names(guest);

  check(hostSees.length === 2, `host sees ${hostSees.length} players`);
  check(hostSees[0]?.includes("Wren (you)"), "host lost their seat");
  check(hostSees[0]?.includes("Host"), "host lost the host role");
  check(guestSees[1]?.includes("Ansel (you)"), "guest lost their seat");
  console.log("Both players are back in their seats without a reload. OK.");
} finally {
  await browser.close();
  await stopServer(server);
}
