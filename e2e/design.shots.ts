import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  DIRECTIONS,
  ROLE_VARIANTS,
  TABLE_STEPS,
  designPaths,
} from "../src/design/directions";

/**
 * Regenerates docs/design/screenshots/<direction>/<screen>-<width>.png for
 * every prototype screen at phone and desktop width. Run with
 * `pnpm build && pnpm screenshots`.
 */

const OUT = path.join(__dirname, "..", "docs", "design", "screenshots");

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

interface Shot {
  name: string;
  url: string;
  /** Put the page in the state to capture. */
  prepare?: (page: Page) => Promise<void>;
  /** Capture only the viewport (for states that need a finger held down). */
  viewportOnly?: boolean;
}

/** Press and hold the role card so the secret side is showing. */
async function holdRoleCard(page: Page): Promise<void> {
  const card = page.locator("button[aria-pressed]:visible").first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  if (!box) throw new Error("No hold-to-reveal control found");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(card).toHaveAttribute("aria-pressed", "true");
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
          await page.evaluate(() => document.fonts.ready);
          await shot.prepare?.(page);
          // Let entrance animations settle so captures are comparable.
          await page.waitForTimeout(700);

          const dir = path.join(OUT, direction.slug);
          mkdirSync(dir, { recursive: true });
          await page.screenshot({
            path: path.join(dir, `${shot.name}-${viewport.width}.png`),
            fullPage: !shot.viewportOnly,
          });

          // No page may scroll sideways.
          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );
          expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
          expect(errors, "console errors").toEqual([]);
        });
      }
    });
  }
}
