import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Software WebGL, so the 3D landing concepts render in headless runs. Only
// these files: it slows every other page's painting.
test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});

/**
 * Screenshots of the tweak studio for docs/evidence/tweak-studio. Run with
 * `pnpm build && pnpm screenshots`.
 */

const OUT = path.join(
  import.meta.dirname,
  "..",
  "docs",
  "evidence",
  "tweak-studio",
);

async function open(page: Page): Promise<void> {
  await page.goto("/design/studio");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("searchbox", { name: "Search tokens" }),
  ).toBeVisible();
  // Below 1024px the studio hides its previews; the iframe still loads.
  await expect(
    page.frameLocator('iframe[data-device="phone"]').locator("main").first(),
  ).toBeAttached();
  await page.waitForTimeout(600);
}

async function load(page: Page, dial: string): Promise<void> {
  await page
    .getByRole("combobox", { name: "Load a preset" })
    .selectOption({ label: dial });
  await page.waitForTimeout(800);
}

test.describe("tweak studio", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("studio states", async ({ page }) => {
    await open(page);
    await page.screenshot({
      path: path.join(OUT, "01-studio-default-1440.png"),
    });

    await load(page, "Hearthside");
    await page.screenshot({
      path: path.join(OUT, "02-studio-hearthside-1440.png"),
    });

    await load(page, "Moonlit silver");
    await page.getByRole("button", { name: /Typography/ }).click();
    await page.getByRole("button", { name: /Palette shifts/ }).click();
    await page.screenshot({
      path: path.join(OUT, "03-studio-moonlit-typography-1440.png"),
    });

    await page.getByRole("tab", { name: /Checks/ }).click();
    await page.screenshot({
      path: path.join(OUT, "04-studio-contrast-checks-1440.png"),
    });

    await page.getByRole("tab", { name: "Share" }).click();
    await page.screenshot({ path: path.join(OUT, "05-studio-share-1440.png") });

    await page.getByRole("tab", { name: "Tune" }).click();
    await page.getByRole("searchbox", { name: "Search tokens" }).fill("accent");
    await page
      .locator('[data-token="--accent-cool"]')
      .getByRole("button", { name: /choose a colour/ })
      .click();
    await page.screenshot({
      path: path.join(OUT, "06-studio-swatch-picker-1440.png"),
    });
    await page.keyboard.press("Escape");

    await page
      .getByRole("combobox", { name: "Screen to preview" })
      .selectOption({ label: "Table: Votes revealed" });
    await page.getByRole("button", { name: "Wide", exact: true }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(OUT, "07-studio-table-wide-1440.png"),
    });
  });
});

test.describe("a shared dial on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Hearthside on the landing screen", async ({ page }) => {
    await open(page);
    await page
      .getByRole("combobox", { name: "Load a preset" })
      .selectOption({ label: "Hearthside" });
    const code = await page.evaluate(() =>
      localStorage.getItem("avalon:starlit-tweaks:v1"),
    );
    expect(code).toBeTruthy();
    await page.goto("/design/starlit");
    await expect(page.locator("style[data-starlit-tweaks]")).toHaveCount(1);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUT, "08-prototype-hearthside-390.png"),
    });
  });
});

/**
 * The artwork contact sheet, once its three 3D thumbnails are drawn. In
 * headless runs WebGL is software-rendered and each one takes seconds.
 */
async function openArtwork(page: Page): Promise<void> {
  await page.goto("/design/starlit/artwork");
  await expect(page.locator("[data-concept] img")).toHaveCount(3, {
    timeout: 90_000,
  });
}

/** Every artwork version, then a few combinations on the landing scene. */
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`artwork at ${viewport.width}`, () => {
    test.use({ viewport });

    test("contact sheet and combinations", async ({ page }) => {
      test.setTimeout(600_000);
      await page.goto("/design/starlit/artwork");
      await page.evaluate(() => localStorage.clear());
      await openArtwork(page);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(OUT, `09-artwork-variants-${viewport.width}.png`),
        fullPage: true,
      });

      const combos = [
        ["bell", "tipi", "spires"],
        ["ridge", "brazier", "fortress"],
        ["pavilion", "cauldron", "ruin"],
      ] as const;
      for (const [tent, fire, castle] of combos) {
        await page.locator(`[data-variant="tent:${tent}"]`).click();
        await page.locator(`[data-variant="fire:${fire}"]`).click();
        await page.locator(`[data-variant="castle:${castle}"]`).click();
        await page.goto("/design/starlit");
        await expect(page.locator("main").first()).toBeVisible();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(
            OUT,
            `10-landing-${tent}-${fire}-${castle}-${viewport.width}.png`,
          ),
        });
        await openArtwork(page);
      }

      // Each whole-scene backdrop, with the original tent, fire and castle.
      for (const part of ["tent:pavilion", "fire:crossed", "castle:keep"]) {
        await page.locator(`[data-variant="${part}"]`).click();
      }
      for (const backdrop of ["lake", "coast", "forest", "peaks"]) {
        await page.locator(`[data-variant="backdrop:${backdrop}"]`).click();
        await page.goto("/design/starlit");
        await expect(page.locator("main").first()).toBeVisible();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(OUT, `11-backdrop-${backdrop}-${viewport.width}.png`),
        });
        await openArtwork(page);
      }

      // The three 3D concepts, as the still frame shown under reduced motion.
      for (const hero of ["isle", "lake", "table"]) {
        await page.locator(`[data-variant="hero:${hero}"]`).click();
        await page.goto("/design/starlit");
        await expect(
          page.locator(`[data-concept="${hero}"] canvas`),
        ).toBeVisible();
        await page.waitForTimeout(2500);
        await page.screenshot({
          path: path.join(OUT, `12-hero-${hero}-${viewport.width}.png`),
        });
        await openArtwork(page);
      }
    });
  });
}
