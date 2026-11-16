import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  DIRECTIONS,
  ROLE_VARIANTS,
  STARLIT_MOTION_PATH,
  TABLE_STEPS,
  designPaths,
} from "../src/design/directions";

/**
 * Regenerates docs/design/screenshots/<direction>/<screen>-<width>.jpg for
 * every prototype screen at phone and desktop width. Run with
 * `pnpm build && pnpm screenshots`.
 *
 * Whole pages are captured by growing the viewport to the page's height, so
 * a bar fixed to the bottom of the screen lands at the bottom of the image
 * instead of covering the middle of it. The press-and-hold states are
 * captured at the normal viewport size, because a finger is "down".
 */

const OUT = path.join(
  import.meta.dirname,
  "..",
  "docs",
  "design",
  "screenshots",
);

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

interface Shot {
  name: string;
  url: string;
  /** Put the page in the state to capture. */
  prepare?: (page: Page) => Promise<void>;
  /** Keep the normal viewport height (for states that need a finger held down). */
  viewportOnly?: boolean;
}

/** Wait until the screen has rendered, fonts are in and its height is stable. */
async function settle(page: Page): Promise<void> {
  await page.locator("main:visible").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  let previous = -1;
  await expect
    .poll(async () => {
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      const stable = height === previous;
      previous = height;
      return stable;
    })
    .toBe(true);
}

/**
 * Press and hold the role card so the secret side is showing. A press that
 * lands before the page has finished loading its scripts does nothing, so
 * press again until the card reports that it is held.
 */
async function holdRoleCard(page: Page): Promise<void> {
  const card = page.locator("button[aria-pressed]:visible").first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  if (!box) throw new Error("No hold-to-reveal control found");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(async () => {
    await page.mouse.up();
    await page.mouse.down();
    await expect(card).toHaveAttribute("aria-pressed", "true", {
      timeout: 400,
    });
  }).toPass({ timeout: 10_000 });
}

for (const viewport of VIEWPORTS) {
  test.describe(`index ${viewport.width}`, () => {
    test.use({ viewport, deviceScaleFactor: viewport.width < 600 ? 2 : 1 });

    test("00-index", async ({ page }) => {
      await page.goto("/design");
      await settle(page);
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      await page.setViewportSize({ width: viewport.width, height });
      // The three live previews are iframes; give them time to paint.
      for (const frame of page.frames().slice(1)) {
        await frame.waitForLoadState("load");
      }
      await page.waitForTimeout(1500);
      mkdirSync(OUT, { recursive: true });
      await page.screenshot({
        path: path.join(OUT, `00-index-${viewport.width}.jpg`),
        type: "jpeg",
        quality: 82,
        fullPage: true,
      });
    });
  });
}

for (const direction of DIRECTIONS) {
  const paths = designPaths(direction.slug);
  const shots: Shot[] = [
    { name: "01-landing", url: paths.landing },
    { name: "02-lobby", url: paths.lobby },
    { name: "03-role-hidden", url: paths.role("merlin") },
    ...ROLE_VARIANTS.map((role, index) => ({
      name: `0${4 + index}-role-${role}-revealed`,
      url: paths.role(role),
      prepare: holdRoleCard,
      viewportOnly: true,
    })),
    ...TABLE_STEPS.map((step, index) => ({
      name: `${String(6 + index).padStart(2, "0")}-table-${step}`,
      url: paths.table(step),
    })),
    // Only Starlit Vale has the motion and sound gallery. It is tens of
    // screens long, so only the top is captured.
    ...(direction.slug === "starlit"
      ? [
          {
            name: "11-motion-gallery",
            url: STARLIT_MOTION_PATH,
            viewportOnly: true,
          },
        ]
      : []),
  ];

  for (const viewport of VIEWPORTS) {
    test.describe(`${direction.slug} ${viewport.width}`, () => {
      test.use({
        viewport,
        deviceScaleFactor: viewport.width < 600 ? 2 : 1,
        hasTouch: false,
      });

      for (const shot of shots) {
        test(shot.name, async ({ page }) => {
          const errors: string[] = [];
          page.on("pageerror", (error) => errors.push(error.message));
          page.on("console", (message) => {
            if (message.type() === "error") errors.push(message.text());
          });

          await page.goto(shot.url);
          await settle(page);

          // No page may scroll sideways. Checked at the real viewport size.
          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );

          if (shot.viewportOnly) {
            await shot.prepare?.(page);
          } else {
            const height = await page.evaluate(
              () => document.documentElement.scrollHeight,
            );
            await page.setViewportSize({
              width: viewport.width,
              height: Math.max(height, viewport.height),
            });
          }
          // Let entrance animations settle so captures are comparable.
          await page.waitForTimeout(700);

          const dir = path.join(OUT, direction.slug);
          mkdirSync(dir, { recursive: true });
          await page.screenshot({
            path: path.join(dir, `${shot.name}-${viewport.width}.jpg`),
            type: "jpeg",
            quality: 82,
            fullPage: !shot.viewportOnly,
          });

          expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
          expect(errors, "console errors").toEqual([]);
        });
      }
    });
  }
}
