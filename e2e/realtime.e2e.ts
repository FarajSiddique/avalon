import { expect, test, type Page } from "@playwright/test";

/**
 * The real-time proof for this checkpoint: two separate browsers (separate
 * storage, like two phones) join one room through the real Worker and its room
 * object, and see each other arrive, leave and come back.
 */

const players = (page: Page) => page.getByTestId("player");

const field = (page: Page, name: string) => page.getByRole("textbox", { name });

/** The page's own WebSocket to the room is open. */
async function expectConnected(page: Page) {
  await expect(page.getByTestId("connection")).toHaveAttribute(
    "data-online",
    "true",
  );
}

test("two players see each other join, drop and return", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  // Host creates a room from the landing page.
  await host.goto("/");
  await field(host, "Your name").fill("Wren");
  await host.getByRole("button", { name: "Create a room" }).click();
  await expect(host.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
  const code = await host.getByTestId("room-code").innerText();
  await expect(host).toHaveURL(new RegExp(`/room/${code}$`));
  await expect(players(host)).toHaveCount(1);
  await expect(players(host).first()).toContainText("Wren (you)");
  await expectConnected(host);

  // Guest joins with the code from the landing page.
  await guest.goto("/");
  await field(guest, "Have a room code?").fill(code.toLowerCase());
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  // The address changes before the new screen is drawn, so wait for the screen.
  await expect(guest.getByTestId("room-code")).toHaveText(code);
  await field(guest, "Your name").fill("Ansel");
  await guest.getByRole("button", { name: "Join room" }).click();

  // Both browsers now show both players, without a reload.
  for (const page of [host, guest]) {
    await expect(players(page)).toHaveCount(2);
    await expect(players(page).nth(0)).toContainText("Wren");
    await expect(players(page).nth(1)).toContainText("Ansel");
  }
  await expect(players(guest).nth(1)).toContainText("Ansel (you)");
  await expect(players(host).nth(0)).toContainText("Host");
  await expectConnected(guest);

  // A name that is already taken is refused with a message.
  const strangerContext = await browser.newContext();
  const stranger = await strangerContext.newPage();
  await stranger.goto(`/room/${code}`);
  await field(stranger, "Your name").fill("wren");
  await stranger.getByRole("button", { name: "Join room" }).click();
  await expect(
    stranger.getByRole("main").getByRole("alert").filter({ hasText: /./ }),
  ).toContainText("has that name");
  await strangerContext.close();

  // Guest's phone drops: the host sees them as away, and the seat is kept.
  await guest.close();
  await expect(players(host).nth(1)).toHaveAttribute("data-connected", "false");
  await expect(players(host)).toHaveCount(2);

  // Guest comes back in a new tab of the same browser: same seat, no name form.
  const guestAgain = await guestContext.newPage();
  await guestAgain.goto(`/room/${code}`);
  await expect(players(guestAgain)).toHaveCount(2);
  await expect(players(guestAgain).nth(1)).toContainText("Ansel (you)");
  await expect(players(host).nth(1)).toHaveAttribute("data-connected", "true");

  // A reload keeps the host's seat too.
  await host.reload();
  await expect(players(host).nth(0)).toContainText("Wren (you)");
  await expect(players(host)).toHaveCount(2);

  await hostContext.close();
  await guestContext.close();
});

test("each browser is only ever sent its own view", async ({ browser }) => {
  /** Record the `you.id` of every state message a page receives. */
  const watch = (page: Page): string[] => {
    const seen: string[] = [];
    page.on("websocket", (socket) => {
      if (!socket.url().includes("/api/socket/")) return;
      socket.on("framereceived", (frame) => {
        if (typeof frame.payload !== "string" || frame.payload === "pong") {
          return;
        }
        const message = JSON.parse(frame.payload) as {
          type: string;
          view?: { you: { id: string } };
        };
        if (message.type === "state" && message.view) {
          seen.push(message.view.you.id);
        }
      });
    });
    return seen;
  };

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const hostSaw = watch(host);
  const guestSaw = watch(guest);

  await host.goto("/");
  await field(host, "Your name").fill("Wren");
  await host.getByRole("button", { name: "Create a room" }).click();
  await expect(host.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
  const code = await host.getByTestId("room-code").innerText();

  await guest.goto(`/room/${code}`);
  await field(guest, "Your name").fill("Ansel");
  await guest.getByRole("button", { name: "Join room" }).click();
  await expect(players(host)).toHaveCount(2);
  await expect(players(guest)).toHaveCount(2);

  expect(hostSaw.length).toBeGreaterThan(1);
  expect(guestSaw.length).toBeGreaterThan(0);
  expect(new Set(hostSaw).size).toBe(1);
  expect(new Set(guestSaw).size).toBe(1);
  expect(hostSaw[0]).not.toBe(guestSaw[0]);

  await hostContext.close();
  await guestContext.close();
});

test("an unknown room code says so", async ({ page }) => {
  await page.goto("/room/ZZZZ");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "does not exist",
  );
  await expect(field(page, "Your name")).toHaveCount(0);
});

test("a malformed room code shows the not-found page", async ({ page }) => {
  await page.goto("/room/not-a-code");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(page.getByTestId("room-code")).toHaveCount(0);
});
