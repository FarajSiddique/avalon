import { expect, test, type FrameLocator, type Page } from "@playwright/test";

/**
 * The Starlit tweak studio: a dial change reaches the real prototype screens
 * in the preview iframes, survives a reload, travels in a share link and
 * resets cleanly.
 */

test.use({ viewport: { width: 1440, height: 900 } });

const phone = (page: Page): FrameLocator =>
  page.frameLocator('iframe[data-device="phone"]');

/** A custom property as the prototype's theme element computes it. */
async function themeVar(page: Page, name: string): Promise<string> {
  const frame = page.frame({ url: /\/design\/starlit/ });
  if (!frame) throw new Error("No preview frame");
  return frame.evaluate(
    (n) =>
      getComputedStyle(document.querySelector(".theme-starlit")!)
        .getPropertyValue(n)
        .trim(),
    name,
  );
}

async function openStudio(page: Page): Promise<void> {
  await page.goto("/design/studio");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("searchbox", { name: "Search tokens" }),
  ).toBeVisible();
  await expect(phone(page).locator("main").first()).toBeVisible();
}

test("a primitive change flows to the semantic tokens of the preview", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await openStudio(page);
  expect(await themeVar(page, "--canvas")).toBe("#0a1030");

  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("night-900");
  const hex = page
    .locator('[data-token="--starlit-night-900"]')
    .getByRole("textbox", { name: /hex/ });
  await hex.fill("#301040");
  await hex.press("Enter");

  await expect.poll(() => themeVar(page, "--canvas")).toBe("#301040");
  await expect(page.getByTestId("change-count")).toHaveText("1 change");

  // Holding compare shows the original, letting go brings the dial back.
  const compare = page.getByRole("button", { name: /compare with original/ });
  await compare.hover();
  await page.mouse.down();
  await expect.poll(() => themeVar(page, "--canvas")).toBe("#0a1030");
  await page.mouse.up();
  await expect.poll(() => themeVar(page, "--canvas")).toBe("#301040");

  // The dial survives a reload of the studio.
  await page.reload();
  await expect(page.getByTestId("change-count")).toHaveText("1 change");
  await expect.poll(() => themeVar(page, "--canvas")).toBe("#301040");

  // Undo takes it back to the defaults.
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("night-900");
  const again = page
    .locator('[data-token="--starlit-night-900"]')
    .getByRole("textbox", { name: /hex/ });
  await again.fill("#123456");
  await again.press("Enter");
  await expect.poll(() => themeVar(page, "--canvas")).toBe("#123456");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(() => themeVar(page, "--canvas")).toBe("#301040");

  await page.getByRole("button", { name: "Reset all" }).click();
  await expect.poll(() => themeVar(page, "--canvas")).toBe("#0a1030");
  await expect(page.getByTestId("change-count")).toHaveText("0 changes");
  expect(errors).toEqual([]);
});

test("a proposed dial applies, keeps wide values separate, and travels in a link", async ({
  page,
  context,
}) => {
  await openStudio(page);
  await page
    .getByRole("combobox", { name: "Load a preset" })
    .selectOption({ label: "Storybook bold" });
  await expect(page.getByTestId("change-count")).not.toHaveText("0 changes");

  // Storybook bold only enlarges seats at the wide breakpoint.
  await expect.poll(() => themeVar(page, "--seat-size")).toBe("52px");
  const wide = page.frame({ url: /\/design\/starlit/ });
  const frames = page
    .frames()
    .filter((f) => f.url().includes("/design/starlit"));
  const wideSeat = await Promise.all(
    frames.map((f) =>
      f.evaluate(() =>
        getComputedStyle(document.querySelector(".theme-starlit")!)
          .getPropertyValue("--seat-size")
          .trim(),
      ),
    ),
  );
  expect(wide).toBeTruthy();
  expect(wideSeat.sort()).toEqual(["52px", "76px"]);

  // A share link opens the dial in a fresh browser profile.
  await page.getByRole("tab", { name: "Share" }).click();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy share link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("/design/starlit?tweaks=");

  const fresh = await context
    .browser()!
    .newContext({ viewport: { width: 1440, height: 900 } });
  const other = await fresh.newPage();
  await other.goto(new URL(link).pathname + new URL(link).search);
  await expect(other.locator("main").first()).toBeVisible();
  await expect
    .poll(() =>
      other.evaluate(() =>
        getComputedStyle(document.querySelector(".theme-starlit")!)
          .getPropertyValue("--button-height")
          .trim(),
      ),
    )
    .toBe("56px");
  await fresh.close();
});

test("the prototype is plain Starlit when the studio was never used", async ({
  page,
}) => {
  await page.goto("/design/starlit");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.locator("style[data-starlit-tweaks]")).toHaveCount(0);
});
