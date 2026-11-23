import { expect, test } from "@playwright/test";
import { withoutWebGL } from "./no-webgl";

// Software WebGL, as in game.e2e.ts, so the scene runs headless. Playwright
// allows launch options only at the top of a file.
test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});

/*
 * What the Worker sends, and what appears once the page runs in the
 * browser. The sky and the stage are drawn in the browser only, so the
 * Worker's page stays light (see "Rendering" in docs/design-system.md).
 */

for (const path of ["/", "/design/starlit"]) {
  test(`the Worker sends ${path} without the sky or the stage`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();

    expect(html).not.toContain("data-art=");
    expect(html).not.toContain("data-stage-host");
    expect(html).toContain("Create a room");
  });

  test(`the sky appears once ${path} is running`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('[data-art="night-sky"]')).toBeAttached();
  });
}

test("the Worker sends a light, readable landing page", async ({ request }) => {
  const html = await (await request.get("/")).text();

  expect(html).toContain('data-stage-slot="hero"');
  expect(html).toContain("Create a room");
  expect(html.length).toBeLessThan(30_000);
});

test.describe("with the scene", () => {
  test("the landing settles on the Star Table hero", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator("[data-stage-host]");

    await expect(stage.locator("canvas")).toHaveCount(1, { timeout: 60_000 });
    await expect(stage).toHaveAttribute("data-stage", "hero", {
      timeout: 60_000,
    });
  });

  // The panel rises 8px into place as it appears. Reduced motion skips that,
  // so the boxes below measure layout only: a jump would be the band's
  // space not being reserved.
  test.describe("measuring layout", () => {
    test.use({ reducedMotion: "reduce" });

    test("the form does not move when the stage appears", async ({ page }) => {
      await page.goto("/", { waitUntil: "commit" });
      const button = page.getByRole("button", { name: "Create a room" });

      await button.waitFor();
      const before = await button.boundingBox();

      await expect(page.locator("[data-stage-host]")).toHaveAttribute(
        "data-stage",
        "hero",
        { timeout: 60_000 },
      );
      await expect(button).toBeEnabled();
      const after = await button.boundingBox();

      expect(after?.y).toBe(before?.y);
      expect(after?.x).toBe(before?.x);
    });
  });

  test("no sound and no audio warning before the player presses anything", async ({
    page,
  }) => {
    const audio: Array<string> = [];

    page.on("console", (message) => {
      if (/audio/i.test(message.text())) {
        audio.push(message.text());
      }
    });
    await page.goto("/");
    await expect(page.locator("[data-stage-host]")).toHaveAttribute(
      "data-stage",
      "hero",
      { timeout: 60_000 },
    );
    const sound = page.getByRole("button", { name: "Sound" });

    await expect(sound).toHaveAttribute("aria-pressed", "false");
    expect(audio).toEqual([]);
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate(() => localStorage.getItem("avalon:sound")),
    ).toBe("on");
  });

  test("creating a room from the landing lets go of the stage", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-stage-host]")).toHaveAttribute(
      "data-stage",
      "hero",
      { timeout: 60_000 },
    );
    await page.getByLabel("Your name").fill("Wren");
    await page.getByRole("button", { name: "Create a room" }).click();
    await expect(page.getByTestId("room-code")).toBeVisible();
    await expect(page.locator("[data-stage-host]")).toHaveCount(0);
  });
});

test("without WebGL the landing still creates a room", async ({ page }) => {
  await withoutWebGL(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "This game needs 3D graphics" }),
  ).toHaveCount(0);
  await page.getByLabel("Your name").fill("Wren");
  await page.getByRole("button", { name: "Create a room" }).click();
  await expect(page.getByTestId("room-code")).toBeVisible();
});
