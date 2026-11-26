import { expect, test, type Page } from "@playwright/test";
import { STAGE_TIMEOUT, field, onStage, openLanding } from "./room-helpers";

/**
 * The camera flies from the landing into the room: one stage the whole
 * way (never remounted), passing through "flying" and settling on the
 * lobby. With reduced motion it cuts.
 */

test.use({ viewport: { width: 1440, height: 900 } });

/** Record every phase the stage passes through, and mark its host element. */
async function watchStage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    new MutationObserver(() => {
      const root = document.documentElement;
      const phase = document
        .querySelector("[data-stage-host]")
        ?.getAttribute("data-stage");

      if (phase && !root.dataset.phases?.endsWith(` ${phase}`)) {
        root.dataset.phases = `${root.dataset.phases ?? ""} ${phase}`;
      }
    }).observe(document, {
      attributes: true,
      attributeFilter: ["data-stage"],
      subtree: true,
    });
  });
}

/** Tag the stage's host element, to tell later whether it is the same one. */
async function markHost(page: Page): Promise<void> {
  await page
    .locator("[data-stage-host]")
    .evaluate((el) => el.setAttribute("data-test-mark", "landing"));
}

const phases = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.phases ?? "");

async function expectSameStage(page: Page): Promise<void> {
  await expect(page.locator("[data-stage-host] canvas")).toHaveCount(1);
  await expect(page.locator("[data-stage-host]")).toHaveAttribute(
    "data-test-mark",
    "landing",
  );
}

test.describe("with full motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("creating a room flies into the lobby on one stage", async ({
    page,
  }) => {
    await watchStage(page);
    await openLanding(page);
    await markHost(page);
    await field(page, "Your name").fill("Wren");
    await page.getByRole("button", { name: "Create a room" }).click();
    await expect(page.getByTestId("room-code")).toHaveText(/^[A-Z]{4}$/);
    await onStage(page, "lobby");
    expect(await phases(page)).toMatch(/hero.* flying.* lobby$/);
    await expectSameStage(page);
  });

  test("joining by code flies to the join form with the table behind", async ({
    browser,
    page,
  }) => {
    // A room to join, made in another browser.
    const other = await browser.newContext({ reducedMotion: "reduce" });
    const host = await other.newPage();

    await openLanding(host);
    await field(host, "Your name").fill("Wren");
    await host.getByRole("button", { name: "Create a room" }).click();
    await onStage(host, "lobby");
    const code = await host.getByTestId("room-code").innerText();

    await watchStage(page);
    await openLanding(page);
    await markHost(page);
    await field(page, "Have a room code?").fill(code);
    await page.getByRole("button", { name: "Join", exact: true }).click();
    await expect(field(page, "Your name")).toBeVisible(STAGE_TIMEOUT);
    await onStage(page, "lobby");
    expect(await phases(page)).toMatch(/hero.* flying.* lobby$/);
    await expectSameStage(page);
    await other.close();
  });
});

test("with reduced motion the camera cuts to the lobby", async ({ page }) => {
  await watchStage(page);
  await openLanding(page);
  await markHost(page);
  await field(page, "Your name").fill("Wren");
  await page.getByRole("button", { name: "Create a room" }).click();
  await onStage(page, "lobby");
  expect(await phases(page)).not.toContain("flying");
  await expectSameStage(page);
});
