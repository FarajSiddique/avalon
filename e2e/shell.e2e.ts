import { expect, test } from "@playwright/test";
import { withoutWebGL } from "./no-webgl";

// Software WebGL, as in game.e2e.ts, so the scene runs headless. Playwright
// allows launch options only at the top of a file.
test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});

// The e2e project defaults to reduced motion (see playwright.config.ts).
// This file tests the running scene, so it starts with full motion.
test.use({ reducedMotion: "no-preference" });

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

/** The scene draws in software WebGL, which is slow on a busy CI runner. */
const STAGE = { timeout: 60_000 };

test.describe("with the scene", () => {
  test("the landing settles on the Star Table hero", async ({ page }) => {
    await page.goto("/");
    const stage = page.locator("[data-stage-host]");

    await expect(stage.locator("canvas")).toHaveCount(1, STAGE);
    await expect(stage).toHaveAttribute("data-stage", "hero", STAGE);
  });

  // On a phone the hero is a band in the flow between the title and the
  // form (on a wide screen it is a backdrop and cannot push anything). The
  // panel rises 8px into place as it appears; reduced motion skips that, so
  // the boxes below measure layout only, and a jump means the band's space
  // was not reserved.
  test.describe("measuring layout on a phone", () => {
    test.use({
      reducedMotion: "reduce",
      viewport: { width: 390, height: 844 },
    });

    test("the form does not move when the stage appears", async ({ page }) => {
      // Hold back the three.js chunk, so the first box is measured before
      // the scene can appear, however fast this machine is. The page is
      // hydrated and its fonts are in by then.
      let release: (() => void) | undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });

      await page.route(/\/assets\/engine-[^/]+\.js$/, async (route) => {
        await held;
        await route.continue();
      });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const button = page.getByRole("button", { name: "Create a room" });

      await expect(button).toBeEnabled(STAGE);
      await expect(page.locator("[data-stage-host] canvas")).toHaveCount(0);
      const before = await button.boundingBox(STAGE);

      release?.();
      await expect(page.locator("[data-stage-host]")).toHaveAttribute(
        "data-stage",
        "hero",
        STAGE,
      );
      const after = await button.boundingBox(STAGE);

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
      STAGE,
    );
    const sound = page.getByRole("button", { name: "Sound" });

    await expect(sound).toHaveAttribute("aria-pressed", "false");
    expect(audio).toEqual([]);
    await sound.click(STAGE);
    await expect(sound).toHaveAttribute("aria-pressed", "true", STAGE);
    expect(
      await page.evaluate(() => localStorage.getItem("avalon:sound")),
    ).toBe("on");
  });

  test("creating a room from the landing keeps one stage into the lobby", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-stage-host]")).toHaveAttribute(
      "data-stage",
      "hero",
      STAGE,
    );
    await page.getByLabel("Your name").fill("Wren");
    await page.getByRole("button", { name: "Create a room" }).click(STAGE);
    await expect(page.getByTestId("room-code")).toBeVisible(STAGE);
    await expect(page.locator("[data-stage-host]")).toHaveAttribute(
      "data-stage",
      "lobby",
      STAGE,
    );
    await expect(page.locator("[data-stage-host] canvas")).toHaveCount(1);
  });
});

// BCDF is a well-formed code (ABCD is not: A is not in the alphabet).
test("the room page is rendered in the browser only", async ({
  request,
  page,
}) => {
  const html = await (await request.get("/room/BCDF")).text();

  expect(html).not.toContain('data-testid="connection"');
  expect(html).not.toContain("data-art=");
  expect(html.length).toBeLessThan(30_000);
  await page.goto("/room/BCDF");
  await expect(page.locator('[data-art="night-sky"]')).toBeAttached();
  await expect(page.getByTestId("connection")).toBeAttached();
  await expect(page.locator("[data-stage-host]")).toHaveCount(0);
});

// getAnimations() sees CSS animations only, not the scene's render loop, so
// the scene is checked by what the engine writes on its host (`data-stage`,
// which reads "flying" during a camera move): it must settle on the hero
// without ever flying.
test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const path of ["/", "/room/BCDF"]) {
    test(`nothing is still animating on ${path}`, async ({ page }) => {
      // Every phase the stage host passes through, kept on <html>.
      await page.addInitScript(() => {
        new MutationObserver(() => {
          const root = document.documentElement;
          const phase = document
            .querySelector("[data-stage-host]")
            ?.getAttribute("data-stage");

          if (phase) {
            root.dataset.phases = `${root.dataset.phases ?? ""} ${phase}`;
          }
        }).observe(document, {
          attributes: true,
          attributeFilter: ["data-stage"],
          subtree: true,
        });
      });
      await page.goto(path);
      await expect(page.locator('[data-art="night-sky"]')).toBeAttached();

      if (path === "/") {
        const stage = page.locator("[data-stage-host]");

        await expect(stage).toHaveAttribute("data-stage", "hero", {
          timeout: 60_000,
        });
        await page.waitForTimeout(400);
        await expect(stage).toHaveAttribute("data-stage", "hero");
        await expect(page.locator("html")).toHaveAttribute(
          "data-phases",
          /hero/,
        );
        await expect(page.locator("html")).not.toHaveAttribute(
          "data-phases",
          /flying/,
        );
      } else {
        // The room answers "not found" a moment after load.
        await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
      }

      // Under reduced motion every animation lasts 0.01 ms, but a page
      // that has just started software WebGL can hold its first frames for
      // a moment. An animation that is still running after that never ends.
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                document
                  .getAnimations()
                  .filter((animation) => animation.playState === "running")
                  .length,
            ),
          { timeout: 5000 },
        )
        .toBe(0);
    });
  }
});

// The sound switch draws a slim pill, but the button around it is the
// touch target and must stay at least 44 by 44 (see CLAUDE.md). On a phone
// it sits beside the eyebrow, so it must not cover the page's title.
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test.describe(`the sound switch at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const path of ["/", "/room/BCDF", "/design/starlit"]) {
      test(`is a 44px touch target on ${path} clear of the title`, async ({
        page,
      }) => {
        await withoutWebGL(page);
        await page.goto(path);
        const sound = page.getByRole("button", { name: "Sound" });

        await expect(sound).toBeVisible();
        const box = await sound.boundingBox();

        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
        // The title is a full-width block, so measure its text, not its box.
        const heading = await page
          .locator("h1")
          .first()
          .evaluate((h1) => {
            const range = document.createRange();

            range.selectNodeContents(h1);
            const { x, y, width, height } = range.getBoundingClientRect();

            return { x, y, width, height };
          });

        expect(box).not.toBeNull();
        const overlaps =
          box !== null &&
          box.x < heading.x + heading.width &&
          heading.x < box.x + box.width &&
          box.y < heading.y + heading.height &&
          heading.y < box.y + box.height;

        expect(overlaps).toBe(false);
      });
    }
  });
}
