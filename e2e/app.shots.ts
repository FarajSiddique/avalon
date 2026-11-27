import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { withoutWebGL } from "./no-webgl";

/**
 * Regenerates docs/design/screenshots/app/<screen>-<width>.jpg for the real
 * app's screens, at phone and desktop width. Same conventions as
 * design.shots.ts. Run with `pnpm build && pnpm screenshots`.
 */

// Software WebGL, so the 3D Star Table renders in headless runs.
test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});

const OUT = path.join(
  import.meta.dirname,
  "..",
  "docs",
  "design",
  "screenshots",
  "app",
);

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

const STAGE_TIMEOUT = { timeout: 90_000 };

/** Collect page and console errors, to assert none at the end. */
function watchErrors(page: Page): Array<string> {
  const errors: Array<string> = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

async function capture(page: Page, name: string, width: number) {
  // No page may scroll sideways.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
  await page.evaluate(() => document.fonts.ready);
  // Let entrance motion settle so captures are comparable.
  await page.waitForTimeout(1000);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({
    path: path.join(OUT, `${name}-${width}.jpg`),
    type: "jpeg",
    quality: 82,
    fullPage: true,
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`app ${viewport.width}`, () => {
    const options = {
      viewport,
      deviceScaleFactor: viewport.width < 600 ? 2 : 1,
      hasTouch: false,
    };

    test.use(options);

    /** A second player in their own browser context. */
    async function guestPage(browser: Browser): Promise<Page> {
      const context = await browser.newContext({
        ...options,
        reducedMotion: "reduce",
      });

      return context.newPage();
    }

    test("01-landing", async ({ page }) => {
      test.setTimeout(180_000);
      const errors = watchErrors(page);

      await page.goto("/");
      const stage = page.locator("[data-stage-host]");

      await expect(stage.locator("canvas")).toHaveCount(1, STAGE_TIMEOUT);
      await expect(stage).toHaveAttribute("data-stage", "hero", STAGE_TIMEOUT);
      await capture(page, "01-landing", viewport.width);
      expect(errors, "console errors").toEqual([]);
    });

    test("02-landing-no-webgl", async ({ page }) => {
      await withoutWebGL(page);
      await page.goto("/");
      // The 3D gate: the notice takes the form's place.
      await expect(
        page.getByRole("heading", { name: "This game needs 3D graphics" }),
      ).toBeVisible();
      await capture(page, "02-landing-no-webgl", viewport.width);
    });

    test("03 to 05: the room", async ({ page, browser }) => {
      test.setTimeout(180_000);
      const errors = watchErrors(page);
      const players = page.getByTestId("player");

      await page.goto("/");
      await page.getByLabel("Your name").fill("Wren");
      await page.getByRole("button", { name: "Create a room" }).click();
      const code = page.getByTestId("room-code");

      await expect(code).toHaveText(/^[A-Z]{4}$/);
      await expect(players).toHaveCount(1);
      await expect(page.getByTestId("connection")).toHaveAttribute(
        "data-online",
        "true",
      );
      await capture(page, "03-room-one-player", viewport.width);

      const guest = await guestPage(browser);

      await guest.goto(`/room/${await code.innerText()}`);
      await expect(guest.locator("[data-stage-host]")).toHaveAttribute(
        "data-stage",
        "lobby",
        STAGE_TIMEOUT,
      );
      await capture(guest, "06-room-join-form", viewport.width);
      await guest.getByLabel("Your name").fill("Ansel");
      await guest.getByRole("button", { name: "Join room" }).click();
      await expect(players).toHaveCount(2);
      await expect(players.nth(1)).toHaveAttribute("data-connected", "true");
      await capture(page, "04-room-two-players", viewport.width);
      await capture(guest, "07-lobby-guest", viewport.width);

      await guest.getByRole("button", { name: /^Your look/ }).click();
      await expect(guest.locator("[data-stage-host]")).toHaveAttribute(
        "data-shot",
        "portrait",
      );
      await capture(guest, "08-lobby-look-picker", viewport.width);
      await guest.getByRole("button", { name: "Done" }).click();

      await guest.context().close();
      await expect(players.nth(1)).toHaveAttribute("data-connected", "false");
      await capture(page, "05-room-guest-away", viewport.width);
      expect(errors, "console errors").toEqual([]);
    });
  });
}
