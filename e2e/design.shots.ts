import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { withoutWebGL } from "./no-webgl";
import { TABLE_STEPS, designPaths } from "../src/design/directions";

/**
 * Regenerates docs/design/screenshots/starlit/<screen>-<width>.jpg for the
 * Starlit Vale screens on the 3D stage, at phone and desktop width, plus the
 * notice shown without WebGL. Run with `pnpm build && pnpm screenshots`.
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
  "starlit",
);

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
] as const;

const STAGE_TIMEOUT = { timeout: 90_000 };

type Phase = "hero" | "lobby" | "role" | "table";

const paths = designPaths();
const SHOTS: Array<{
  name: string;
  url: string;
  phase: Phase;
  hold?: boolean;
}> = [
  { name: "01-landing", url: paths.landing, phase: "hero" },
  { name: "02-lobby", url: paths.lobby, phase: "lobby" },
  { name: "03-role-hidden", url: paths.role("merlin"), phase: "role" },
  {
    name: "04-role-revealed",
    url: paths.role("merlin"),
    phase: "role",
    hold: true,
  },
  ...TABLE_STEPS.map((step, index) => ({
    name: `${String(5 + index).padStart(2, "0")}-table-${step}`,
    url: paths.table(step),
    phase: "table" as const,
  })),
];

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
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({
    path: path.join(OUT, `${name}-${width}.jpg`),
    type: "jpeg",
    quality: 82,
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`starlit ${viewport.width}`, () => {
    test.use({
      viewport,
      deviceScaleFactor: viewport.width < 600 ? 2 : 1,
      hasTouch: false,
    });

    for (const shot of SHOTS) {
      test(shot.name, async ({ page }) => {
        test.setTimeout(180_000);
        const errors = watchErrors(page);

        await page.goto(shot.url);
        const stage = page.locator("[data-stage-host]");

        await expect(stage.locator("canvas")).toHaveCount(1, STAGE_TIMEOUT);
        await expect(stage).toHaveAttribute(
          "data-stage",
          shot.phase,
          STAGE_TIMEOUT,
        );
        await page.evaluate(() => document.fonts.ready);

        if (shot.hold) {
          const card = page.locator("main button.sl-skycard");
          const box = await card.boundingBox();

          if (!box) {
            throw new Error("No role card");
          }

          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await expect(card).toHaveAttribute("aria-pressed", "true");
        }

        // Let entrance motion settle so captures are comparable.
        await page.waitForTimeout(1500);
        await capture(page, shot.name, viewport.width);
        expect(errors, "console errors").toEqual([]);
      });
    }

    test("12-no-webgl", async ({ page }) => {
      await withoutWebGL(page);
      await page.goto(paths.table("propose"));
      await expect(
        page.getByRole("heading", { name: "This game needs 3D graphics" }),
      ).toBeVisible({ timeout: 30_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(700);
      await capture(page, "12-no-webgl", viewport.width);
    });
  });
}
