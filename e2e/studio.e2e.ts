import { expect, test, type FrameLocator, type Page } from "@playwright/test";

// Software WebGL, so the 3D landing concepts render in headless runs. Only
// these files: it slows every other page's painting.
test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});

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

/** The generated stylesheet. toContainText cannot see inside a <style>. */
function tweakCss(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      document.querySelector("style[data-starlit-tweaks]")?.textContent ?? "",
  );
}

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

  // Storybook bold only enlarges seats at the wide breakpoint: the phone
  // frame keeps 52px, the wide frame gets 76px.
  const seatSizes = () =>
    Promise.all(
      page
        .frames()
        .filter((f) => f.url().includes("/design/starlit"))
        .map((f) =>
          f.evaluate(() =>
            getComputedStyle(document.querySelector(".theme-starlit")!)
              .getPropertyValue("--seat-size")
              .trim(),
          ),
        ),
    ).then((sizes) => sizes.sort());
  await expect.poll(seatSizes).toEqual(["52px", "76px"]);

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

test("sliders and number boxes write valid values, and an emptied box is ignored", async ({
  page,
}) => {
  await openStudio(page);
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("panel-opacity");
  const row = page.locator('[data-token="--panel-opacity"]');
  await row.getByRole("slider", { name: "Panel opacity" }).fill("60");
  await expect.poll(() => themeVar(page, "--panel-opacity")).toBe("60%");

  const box = row.getByRole("spinbutton", { name: "Panel opacity value" });
  await box.fill("");
  await expect.poll(() => themeVar(page, "--panel-opacity")).toBe("60%");
  await box.fill("75");
  await expect.poll(() => themeVar(page, "--panel-opacity")).toBe("75%");
  await expect(
    row.getByRole("slider", { name: "Panel opacity" }),
  ).toBeVisible();
});

test("ambient motion keeps its durations and follows the tempo dial", async ({
  page,
}) => {
  await openStudio(page);
  const frame = page.frame({ url: /\/design\/starlit/ });
  if (!frame) throw new Error("No preview frame");
  const durations = () =>
    frame.evaluate(() => {
      const of = (selector: string) => {
        const el = document.querySelector(selector);
        return el ? getComputedStyle(el).animationDuration : "missing";
      };
      return {
        shoot: of(".sl-shooting-star"),
        drift: of(".sl-drift:not(.sl-drift--slow)"),
        driftSlow: of(".sl-drift--slow"),
        flame: of(".sl-flame:not(.sl-flame--inner)"),
        glow: of(".sl-fire-glow"),
      };
    });
  const before = await durations();
  expect(before).toMatchObject({
    shoot: "19s",
    drift: "110s",
    driftSlow: "160s",
    flame: "1.3s",
    glow: "3.4s",
  });

  // A twinkling star keeps its own duration (3 to 7.5s) at tempo 1.
  const twinkle = await frame.evaluate(() => {
    const el = document.querySelector<SVGElement>(".sl-twinkle");
    return el
      ? [
          el.style.getPropertyValue("--twinkle-dur"),
          getComputedStyle(el).animationDuration,
        ]
      : null;
  });
  expect(twinkle).not.toBeNull();
  expect(twinkle?.[0]).toBe(twinkle?.[1]);

  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("ambient-tempo");
  await page
    .locator('[data-token="--ambient-tempo"]')
    .getByRole("spinbutton")
    .fill("2");
  await expect.poll(durations).toMatchObject({
    shoot: "38s",
    drift: "220s",
    driftSlow: "320s",
    flame: "2.6s",
    glow: "6.8s",
  });
});

test("a share link keeps the dial it replaces and applies only once", async ({
  page,
  context,
}) => {
  await openStudio(page);
  await page
    .getByRole("combobox", { name: "Load a preset" })
    .selectOption({ label: "Hearthside" });
  await page.getByRole("tab", { name: "Share" }).click();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy share link" }).click();
  const hearthside = await page.evaluate(() => navigator.clipboard.readText());

  // Move on to another dial, then open the Hearthside link in this browser.
  await page
    .getByRole("combobox", { name: "Load a preset" })
    .selectOption({ label: "Moonlit silver" });
  const target = new URL(hearthside);
  await page.goto(target.pathname + target.search);
  await expect(page.locator("main").first()).toBeVisible();
  await expect.poll(() => tweakCss(page)).toContain("--display-wonk: 1");
  await expect.poll(() => page.url()).not.toContain("tweaks=");

  const saved = await page.evaluate(() =>
    localStorage.getItem("avalon:starlit-tweaks:saved"),
  );
  expect(saved).toContain("Moonlit silver (before a shared link");
});

test("unsafe values in a share link are dropped", async ({ page }) => {
  await page.goto("/design/starlit");
  await page.evaluate(() => localStorage.clear());
  const evil = {
    version: 1,
    name: "x",
    vars: { "--accent": "red;} body{display:none", "--ink": "#ff0000" },
  };
  const code = Buffer.from(JSON.stringify(evil)).toString("base64url");
  await page.goto(`/design/starlit?tweaks=${code}`);
  await expect.poll(() => tweakCss(page)).toContain("--ink: #ff0000");
  expect(await tweakCss(page)).not.toContain("display");
});

test("an artwork version chosen on the contact sheet sticks and reaches the studio", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/design/starlit/artwork");
  await page.evaluate(() => localStorage.clear());
  await openArtwork(page);
  const bell = page.locator('[data-variant="tent:bell"]');
  const pavilion = page.locator('[data-variant="tent:pavilion"]');
  await expect(pavilion).toHaveAttribute("aria-pressed", "true");
  await bell.click();
  await expect(bell).toHaveAttribute("aria-pressed", "true");
  await expect(pavilion).toHaveAttribute("aria-pressed", "false");
  await page.locator('[data-variant="fire:cauldron"]').click();
  const forest = page.locator('[data-variant="backdrop:forest"]');
  await forest.click();

  await openArtwork(page);
  await expect(bell).toHaveAttribute("aria-pressed", "true");
  await expect(forest).toHaveAttribute("aria-pressed", "true");

  await page.goto("/design/studio");
  await expect(page.getByTestId("change-count")).toHaveText("3 changes");
  await expect(
    page
      .getByRole("group", { name: "Backdrop" })
      .getByRole("button", { name: "Standing stones" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("group", { name: "Tent" })
      .getByRole("button", { name: "Bell tent" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("a 3D landing hero mounts its canvas without errors", async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/design/starlit");
  await page.evaluate(() =>
    localStorage.setItem(
      "avalon:starlit-tweaks:v1",
      JSON.stringify({ version: 1, name: "x", scene: { hero: "lake" } }),
    ),
  );
  await page.reload();
  await expect(page.locator('[data-concept="lake"] canvas')).toBeVisible({
    timeout: 60_000,
  });
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

/** Open a collapsible lobby section if it is closed. */
async function openSection(page: Page, name: string): Promise<void> {
  const summary = page.locator(
    `[data-section="${name}"] button[aria-expanded]`,
  );
  if ((await summary.getAttribute("aria-expanded")) !== "true")
    await summary.click();
  await expect(summary).toHaveAttribute("aria-expanded", "true");
}

const TABLE_HERO = JSON.stringify({
  version: 1,
  name: "x",
  scene: { hero: "table" },
});

test("the lobby table seats everyone, takes newcomers and keeps your look", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/design/starlit/lobby");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const stage = page.locator("[data-stage-host]");
  await expect(stage.locator("canvas")).toBeVisible({ timeout: 60_000 });
  // Opened directly, the lobby is already settled: no flight.
  await expect(stage).toHaveAttribute("data-stage", "lobby");
  // The mock lobby has seven players; the engine reports who is standing.
  await expect(stage).toHaveAttribute("data-seated", "7", { timeout: 60_000 });
  await expect(page.locator("[data-tag]")).toHaveCount(7);
  await expect(page.locator('[data-tag="p-wren"]')).toContainText("You");

  await openSection(page, "players");
  await page.getByRole("button", { name: "Prototype: someone joins" }).click();
  await expect(stage).toHaveAttribute("data-seated", "8", { timeout: 60_000 });
  await page.getByRole("button", { name: "Prototype: someone leaves" }).click();
  await expect(stage).toHaveAttribute("data-seated", "7", { timeout: 60_000 });

  // A look chosen in "Your look" is kept for next time.
  await openSection(page, "look");
  const helm = page.locator('[data-look="headwear:helm"]');
  await helm.click();
  await page.locator('[data-look="cloak:moss"]').click();
  await expect(helm).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator('[data-section="look"] button[aria-expanded]'),
  ).toContainText("Moss cloak, helm");
  await page.reload();
  await openSection(page, "look");
  await expect(helm).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-look="cloak:moss"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("lobby sections open and close, and say their state when closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design/starlit/lobby");
  const players = page.locator('[data-section="players"]');
  const summary = players.locator("button[aria-expanded]");
  // On a phone every section starts closed, so the table shows.
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await expect(summary).toContainText("7 of 10, 5 ready, 1 away");
  await expect(
    players.getByRole("button", { name: "Prototype: someone joins" }),
  ).toBeHidden();
  await summary.click();
  await expect(summary).toHaveAttribute("aria-expanded", "true");
  await expect(
    players.getByRole("button", { name: "Prototype: someone joins" }),
  ).toBeVisible();
  await summary.click();
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  // The room code, the blockers and the actions are always in view.
  await expect(
    page.locator('section[aria-label="Room code"]:visible'),
  ).toHaveCount(1);
  await expect(page.getByRole("button", { name: "I'm ready" })).toBeVisible();
});

test("creating a room flies the camera from the landing into a new lobby", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/design/starlit");
  await page.evaluate((t) => {
    localStorage.clear();
    localStorage.setItem("avalon:starlit-tweaks:v1", t);
  }, TABLE_HERO);
  await page.reload();
  const stage = page.locator("[data-stage-host]");
  await expect(stage).toHaveAttribute("data-stage", "hero", {
    timeout: 60_000,
  });
  await page.getByLabel("Your name").fill("Faraj");
  await page.getByRole("link", { name: "Create a room" }).click();
  // The same scene flies on: it never unmounts on the way.
  await expect(stage).toHaveAttribute("data-stage", "flying");
  await expect(
    page.getByRole("heading", { name: "Gather at the fire" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/via=create/);
  await expect(stage).toHaveAttribute("data-stage", "lobby", {
    timeout: 60_000,
  });
  // You host a new room; friends arrive one by one.
  await expect(page.locator('[data-tag="p-wren"]')).toContainText("Faraj");
  await expect(page.getByText("4 more players are needed.")).toBeVisible();
  await expect(page.locator("[data-tag]")).toHaveCount(2, { timeout: 30_000 });

  // Back to the landing: the camera flies back out.
  await page.getByRole("link", { name: "Landing", exact: true }).click();
  await expect(stage).toHaveAttribute("data-stage", "hero", {
    timeout: 60_000,
  });
  await expect(page.getByRole("link", { name: "Create a room" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("joining a room flies in to someone else's table as a guest", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/design/starlit");
  await page.evaluate((t) => {
    localStorage.clear();
    localStorage.setItem("avalon:starlit-tweaks:v1", t);
  }, TABLE_HERO);
  await page.reload();
  const stage = page.locator("[data-stage-host]");
  await expect(stage).toHaveAttribute("data-stage", "hero", {
    timeout: 60_000,
  });
  await page.getByLabel("Room code").fill("rose");
  await page.getByRole("link", { name: "Join" }).click();
  await expect(page).toHaveURL(/via=join/, { timeout: 30_000 });
  await expect(stage).toHaveAttribute("data-stage", "lobby", {
    timeout: 60_000,
  });
  await expect(page.getByText("You joined")).toBeVisible();
  await expect(page.getByLabel("R O S E").first()).toBeAttached();
  // A guest sees the settings but cannot change them, and cannot start.
  await openSection(page, "settings");
  await expect(page.getByRole("switch")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start" })).toHaveCount(0);
  await expect(page.getByText("Ansel starts the game.").first()).toBeVisible();
  // You arrive last, once the camera has landed.
  await expect(stage).toHaveAttribute("data-seated", "7", { timeout: 60_000 });
  expect(errors).toEqual([]);
});

test("without WebGL, a 3D hero falls back to the drawn scene", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type.startsWith("webgl")) return null;
      return (original as (...a: unknown[]) => unknown).call(
        this,
        type,
        ...rest,
      );
    } as typeof original;
  });
  await page.goto("/design/starlit");
  await page.evaluate(() =>
    localStorage.setItem(
      "avalon:starlit-tweaks:v1",
      JSON.stringify({ version: 1, name: "x", scene: { hero: "isle" } }),
    ),
  );
  await page.reload();
  await expect(
    page.locator('main svg[preserveAspectRatio="xMaxYMax slice"]'),
  ).toBeVisible();
  await expect(page.locator("[data-concept] canvas")).toHaveCount(0);
});
