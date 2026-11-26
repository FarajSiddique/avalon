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
 *
 * Then the host goes away and the server restarts while the host hand-over
 * is pending. The guest must become host about 60 seconds after the host
 * left, counted from before the restart: the deadline is in storage, not in
 * memory.
 */

import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import { HOST_AWAY_MS } from "../src/shared/constants.ts";

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

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** How long the server stays down while the hand-over is pending. */
const HELD_DOWN_MS = 20_000;

function check(condition, message) {
  if (!condition) {
    throw new Error(`Restart check failed: ${message}`);
  }
}

// The server must come back well before the hand-over is due, or the check
// cannot tell a clock kept in storage from one restarted at boot (the last
// assertion needs HOST_AWAY_MS - HELD_DOWN_MS to be more than 5 s, with room
// for the restart itself).
check(
  HOST_AWAY_MS - HELD_DOWN_MS >= 30_000,
  `HELD_DOWN_MS (${HELD_DOWN_MS}) is too close to HOST_AWAY_MS (${HOST_AWAY_MS})`,
);

const names = (page) => page.getByTestId("player").allTextContents();
const online = (page, value) =>
  page
    .locator(`[data-testid="connection"][data-online="${value}"]`)
    .waitFor({ timeout: 20_000 });

let server = await startServer();
// Software WebGL: a browser without it may not take a seat (the 3D gate).
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
/** The stage has settled, so the page is interactive (see e2e/room-helpers.ts). */
const onStage = (page) =>
  page.locator("[data-stage-host][data-stage]").waitFor({ timeout: 60_000 });

try {
  const host = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();

  await host.goto(base);
  await onStage(host);
  await host.getByRole("textbox", { name: "Your name" }).fill("Wren");
  await host.getByRole("button", { name: "Create a room" }).click();
  await host.getByTestId("room-code").waitFor();
  const code = await host.getByTestId("room-code").innerText();

  await guest.goto(`${base}/room/${code}`);
  await onStage(guest);
  await guest.getByRole("textbox", { name: "Your name" }).fill("Ansel");
  await guest.getByRole("button", { name: "Join room" }).click();
  await host.getByTestId("player").nth(1).waitFor();
  console.log(`Room ${code}: two players seated.`);

  // The guest readies up and picks a look; both must outlive the restart.
  const tag = host.locator("[data-tag]", { hasText: "Ansel" });
  const lookBefore = await tag.getAttribute("data-look", { timeout: 60_000 });
  const cloakBefore = lookBefore?.split("/")[2];
  const cloak = ["rose", "moss"].find((c) => c !== cloakBefore);

  await guest.getByRole("button", { name: "I'm ready" }).click();
  await guest.getByRole("button", { name: /^Your look/ }).click();
  await guest
    .getByRole("dialog", { name: "Your look" })
    .locator(`[data-look="cloak:${cloak}"]`)
    .click();
  await guest.getByRole("button", { name: "Done" }).click();
  await host
    .locator(`[data-tag][data-look*="/${cloak}/"]`, { hasText: "Ansel" })
    .waitFor({ timeout: 20_000 });
  await host
    .getByRole("status", { name: "Before the game starts" })
    .filter({ hasNotText: "Ansel" })
    .waitFor({ timeout: 20_000 });
  console.log(`The guest is ready and wears a ${cloak} cloak.`);

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

  const blockers = await host
    .getByRole("status", { name: "Before the game starts" })
    .innerText();
  const lookAfter = await tag.getAttribute("data-look");

  check(!blockers.includes("Ansel"), "the guest lost their ready");
  check(
    lookAfter?.split("/")[2] === cloak,
    `the guest's look is ${lookAfter}, not the ${cloak} cloak`,
  );
  console.log("The guest is still ready, in the same look. OK.");

  // Part two: a pending host hand-over survives a restart.
  const hostLeftAt = Date.now();

  await host.context().close();
  await guest
    .locator('[data-testid="player"][data-connected="false"]')
    .waitFor({ timeout: 10_000 });
  console.log("The host closed their page. The guest sees them as away.");

  await stopServer(server);
  // Stopping can take a while; never sleep a negative time.
  await sleep(Math.max(0, HELD_DOWN_MS - (Date.now() - hostLeftAt)));
  server = await startServer();
  const restartedAt = Date.now();

  console.log(
    `Server restarted ${Math.round((restartedAt - hostLeftAt) / 1000)} s after the host left.`,
  );
  await online(guest, true);
  // A clock restarted at boot would need the full 60 s from here.
  await guest
    .getByTestId("player")
    .filter({ hasText: "Ansel (you)" })
    .filter({ hasText: "Host" })
    .waitFor({ timeout: HOST_AWAY_MS - HELD_DOWN_MS + 10_000 });

  const handedAt = Date.now();
  const rows = await names(guest);

  check(
    handedAt - hostLeftAt >= HOST_AWAY_MS - 1000,
    `the host role passed after only ${handedAt - hostLeftAt} ms`,
  );
  check(
    handedAt - restartedAt < HOST_AWAY_MS - 5000,
    "the hand-over clock restarted with the server",
  );
  check(!rows[0]?.includes("Host"), "the old host kept the host role");
  console.log(
    `The guest became host ${Math.round((handedAt - hostLeftAt) / 1000)} s after the host left, ${Math.round((handedAt - restartedAt) / 1000)} s after the restart. OK.`,
  );
} finally {
  await browser.close();
  await stopServer(server);
}
