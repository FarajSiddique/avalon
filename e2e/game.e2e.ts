import { expect, test, type Locator, type Page } from "@playwright/test";

// Software WebGL, so the 3D Star Table renders in headless runs. Only these
// files: it slows every other page's painting.
test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});

/**
 * The game at the 3D Star Table: the role card and the five table steps on
 * the shared stage, the landing and lobby flights, and the notice without
 * WebGL.
 */

test.use({ viewport: { width: 1440, height: 900 } });

const STAGE_TIMEOUT = { timeout: 60_000 };

/** Page errors and console errors, to assert none at the end of a test. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

/** Make every WebGL context fail, as on a machine without it. */
async function withoutWebGL(page: Page): Promise<void> {
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
}

const stageOf = (page: Page): Locator => page.locator("[data-stage-host]");

/**
 * Open a Starlit screen and wait for the 3D stage to settle on it. The
 * engine writes `data-stage` only after hydration, so this also means the
 * page is interactive.
 */
async function openOnStage(
  page: Page,
  url: string,
  phase: "lobby" | "role" | "table",
): Promise<void> {
  await page.goto(url);
  await expect(stageOf(page).locator("canvas")).toHaveCount(1, STAGE_TIMEOUT);
  await expect(stageOf(page)).toHaveAttribute(
    "data-stage",
    phase,
    STAGE_TIMEOUT,
  );
}

/** Move the mouse to the middle of an element and press the button down. */
async function pressOn(page: Page, target: Locator): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error("Nothing to press");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

/** The role's name, as the card says it once held ("You are Merlin"). */
const roleName = (page: Page, name = "Merlin"): Locator =>
  page.getByText(`You are ${name}`, { exact: true });

/** Hold the role card once and let go, so Continue unlocks. */
async function holdCardOnce(page: Page): Promise<void> {
  const card = page.locator("main button.sl-skycard");
  await pressOn(page, card);
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await page.mouse.up();
  await expect(card).toHaveAttribute("aria-pressed", "false");
}

test("the role card on the stage is hidden until held, and Continue waits for a hold", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await openOnStage(page, "/design/starlit/role/merlin", "role");
  const main = page.locator("main[data-role-stage]");
  await expect(main).toHaveAttribute("data-role-stage", "arrived");

  const card = main.locator("button.sl-skycard");
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await expect(roleName(page)).toHaveCount(0);
  await expect(main).not.toContainText("The Sage's Hat");
  await expect(
    page.getByRole("button", { name: "Continue to the table" }),
  ).toBeDisabled();

  // Held: the card opens and says who you are.
  await pressOn(page, card);
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(roleName(page)).toBeVisible();
  await expect(main).toContainText("These players are Evil");

  // Let go: it closes, and nothing of it stays in the page.
  await page.mouse.up();
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await expect(roleName(page)).toHaveCount(0);
  await expect(main).not.toContainText("These players are Evil");
  await expect(main).toContainText("You have seen your role.");

  await page.getByRole("link", { name: "Continue to the table" }).click();
  await expect(page.locator("main[data-step=propose]")).toBeVisible();
  await expect(stageOf(page)).toHaveAttribute(
    "data-stage",
    "table",
    STAGE_TIMEOUT,
  );
  expect(errors).toEqual([]);
});

test("one canvas carries the table from the lobby to the role card to the round", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await page.goto("/design/starlit/lobby");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await openOnStage(page, "/design/starlit/lobby", "lobby");
  // Remember the canvas element itself, to compare after each move.
  await page.evaluate(() => {
    const canvas = document.querySelector("[data-stage-host] canvas");
    (window as unknown as { e2eCanvas: Element | null }).e2eCanvas = canvas;
  });
  const sameCanvas = () =>
    page.evaluate(() => {
      const canvas = document.querySelector("[data-stage-host] canvas");
      const kept = (window as unknown as { e2eCanvas?: Element | null })
        .e2eCanvas;
      return canvas !== null && canvas === kept;
    });

  const nav = page.getByRole("navigation", { name: "Prototype navigation" });
  await nav.getByRole("link", { name: "Role", exact: true }).click();
  await expect(page.locator("main[data-role-stage]")).toBeVisible();
  await expect(stageOf(page)).toHaveAttribute(
    "data-stage",
    "role",
    STAGE_TIMEOUT,
  );
  expect(await sameCanvas()).toBe(true);

  await expect(page.locator("main[data-role-stage]")).toHaveAttribute(
    "data-role-stage",
    "arrived",
  );
  await holdCardOnce(page);
  await page.getByRole("link", { name: "Continue to the table" }).click();
  await expect(page.locator("main[data-step=propose]")).toBeVisible();
  await expect(stageOf(page)).toHaveAttribute(
    "data-stage",
    "table",
    STAGE_TIMEOUT,
  );
  expect(await sameCanvas()).toBe(true);
  await expect(page.locator("[data-stage-host] canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("the name you typed in the lobby is yours at the role card and the table", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await page.goto("/design/starlit/lobby");
  await page.evaluate(() => sessionStorage.clear());
  await openOnStage(page, "/design/starlit/lobby?name=Faraj", "lobby");
  await expect(page.locator('[data-tag="p-wren"]')).toContainText("Faraj");

  // You take Wren's seat, under your name.
  await openOnStage(page, "/design/starlit/role/merlin", "role");
  await expect(page.locator('[data-tag="p-wren"]')).toContainText("Faraj");
  await expect(page.locator('[data-tag="p-wren"]')).toContainText("You");
  await expect(page.locator("[data-tag]")).toHaveCount(7);

  await openOnStage(page, "/design/starlit/table/propose", "table");
  const tag = page.locator('[data-tag="p-wren"]');
  await expect(tag).toContainText("Faraj");
  await expect(tag).toHaveAttribute("aria-label", /^Faraj \(you\)/);
  await expect(page.getByRole("list", { name: "Team" })).toContainText("Faraj");
  for (const words of await tagWords(page)) expect(words).not.toContain("Wren");
  expect(errors).toEqual([]);
});

test("the leader picks the team by tag and by the Team list", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await page.goto("/design/starlit/lobby");
  await page.evaluate(() => sessionStorage.clear());
  await openOnStage(page, "/design/starlit/table/propose", "table");
  const round = page.locator('section[aria-label="The round"]');
  const list = page.getByRole("list", { name: "Team" });
  const bramTag = page.locator('[data-tag="p-bram"]');
  const bramItem = list.getByRole("button", { name: "Bram" });
  const propose = round.getByRole("button", { name: "Propose this team" });

  // The mock starts with Wren and Mira picked.
  await expect(round).toContainText("2 of 3 chosen");
  await expect(propose).toBeDisabled();
  await expect(bramTag).toHaveAttribute("aria-pressed", "false");
  await expect(bramItem).toHaveAttribute("aria-pressed", "false");

  // A tap on the tag over Bram's head picks him, in the list too. The
  // engine places and shows tags frame by frame, which software WebGL under
  // load does slowly: wait for it to show.
  await expect(bramTag).toBeVisible({ timeout: 90_000 });
  await bramTag.click();
  await expect(bramTag).toHaveAttribute("aria-pressed", "true");
  await expect(bramTag).toHaveAttribute("aria-label", "Bram, chosen");
  await expect(bramItem).toHaveAttribute("aria-pressed", "true");
  await expect(round).toContainText("3 of 3 chosen");
  await expect(propose).toHaveCount(0);
  const ready = round.getByRole("link", { name: "Propose this team" });
  await expect(ready).toBeVisible();

  // The list takes him off again, and the tag follows.
  await bramItem.click();
  await expect(bramItem).toHaveAttribute("aria-pressed", "false");
  await expect(bramTag).toHaveAttribute("aria-pressed", "false");
  await expect(round).toContainText("2 of 3 chosen");
  await expect(propose).toBeDisabled();

  // Kay from the list fills the team; proposing moves on to the vote.
  await list.getByRole("button", { name: "Kay" }).click();
  await expect(page.locator('[data-tag="p-kay"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(round).toContainText("3 of 3 chosen");
  await ready.click();
  await expect(page.locator("main[data-step=vote]")).toBeVisible();
  expect(errors).toEqual([]);
});

/** Each tag's words, seen and read aloud. */
function tagWords(page: Page): Promise<string[]> {
  return page
    .locator("[data-tag]")
    .evaluateAll((tags) =>
      tags.map(
        (t) => `${t.textContent ?? ""} | ${t.getAttribute("aria-label") ?? ""}`,
      ),
    );
}

test("votes stay hidden on the tags until all turn over at the reveal", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await openOnStage(page, "/design/starlit/table/vote", "table");
  const tags = page.locator("[data-tag]");
  await expect(tags).toHaveCount(7);
  for (const words of await tagWords(page)) {
    expect(words).not.toMatch(/approve|reject/i);
    expect(words).toMatch(/Voted|Waiting/);
  }

  // Your own vote is locked, and your tag still says only "Voted".
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Your vote is locked")).toBeVisible();
  await expect(page.locator('[data-tag="p-wren"]')).toContainText("Voted");
  for (const words of await tagWords(page)) {
    expect(words).not.toMatch(/approve|reject/i);
  }

  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await expect(page.locator("main[data-step=reveal]")).toBeVisible();
  const turned = page.locator(
    '[data-tag][data-status="approve"], [data-tag][data-status="reject"]',
  );
  await expect(turned).toHaveCount(7);
  for (const words of await tagWords(page)) {
    expect(words).toMatch(/Approve|Reject/);
  }
  await expect(page.locator('[data-tag][data-status="reject"]')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("the round's panels open and close and say their state when closed", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  const quests = page.locator('[data-section="quests"]');
  const history = page.locator('[data-section="history"]');
  const questsButton = quests.locator("button[aria-expanded]");
  const historyButton = history.locator("button[aria-expanded]");

  // Wide: Quests starts open, Vote history closed with a one-line summary.
  await openOnStage(page, "/design/starlit/table/vote", "table");
  await expect(questsButton).toHaveAttribute("aria-expanded", "true");
  await expect(historyButton).toHaveAttribute("aria-expanded", "false");
  await expect(historyButton).toContainText("Last: rejected 4 to 3");
  await expect(history.locator("[role=region]")).toHaveAttribute("inert", "");
  await historyButton.click();
  await expect(historyButton).toHaveAttribute("aria-expanded", "true");
  await expect(history.locator("[role=region]")).not.toHaveAttribute("inert");
  await expect(history.locator("[role=region]")).toContainText(
    "Quest 3, vote 1",
  );
  await historyButton.click();
  await expect(historyButton).toHaveAttribute("aria-expanded", "false");
  await questsButton.click();
  await expect(questsButton).toHaveAttribute("aria-expanded", "false");
  await expect(questsButton).toContainText(
    "Good 1, Evil 1 · Quest 3 needs 3 · 1 of 5 rejected",
  );

  // Phone: both start closed, so the table shows.
  await page.setViewportSize({ width: 390, height: 844 });
  await openOnStage(page, "/design/starlit/table/vote", "table");
  await expect(questsButton).toHaveAttribute("aria-expanded", "false");
  await expect(historyButton).toHaveAttribute("aria-expanded", "false");
  await expect(questsButton).toContainText("Good 1, Evil 1");
  await questsButton.click();
  await expect(questsButton).toHaveAttribute("aria-expanded", "true");
  await expect(quests.locator("[role=region]")).not.toHaveAttribute("inert");
  await questsButton.click();
  await expect(questsButton).toHaveAttribute("aria-expanded", "false");
  // The action bar stays in view with both closed.
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("on a phone the round's sheet collapses to a peek and the table grows", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openOnStage(page, "/design/starlit/table/propose", "table");
  const main = page.locator("main[data-step=propose]");
  const slot = page.locator('[data-stage-slot="table"]');
  const sheet = page.getByRole("region", { name: "The round" });
  const slotHeight = async (): Promise<number> =>
    (await slot.boundingBox())?.height ?? 0;

  await expect(main).toHaveAttribute("data-sheet", "open");
  const openHeight = await slotHeight();

  // The handle is a button: collapse without swiping.
  const hide = page.getByRole("button", { name: /hide the round/i });
  await expect(hide).toHaveAttribute("aria-expanded", "true");
  const box = await hide.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  // By keyboard: focus moves to the other handle, never to the page.
  await hide.focus();
  await page.keyboard.press("Enter");
  await expect(main).toHaveAttribute("data-sheet", "collapsed");
  await expect(sheet).toBeHidden();
  const show = page.getByRole("button", { name: /show the round/i });
  await expect(show).toBeFocused();
  await expect(show).toHaveAttribute("aria-expanded", "false");
  await expect(show).toHaveAccessibleName(/Choose your team, 2 of 3 chosen/);
  // The open space (where the camera frames the table) grows a lot.
  await expect.poll(slotHeight).toBeGreaterThan(openHeight + 250);

  // Picking from the Team list: open the sheet again with the button.
  await page.keyboard.press("Enter");
  await expect(main).toHaveAttribute("data-sheet", "open");
  await expect(hide).toBeFocused();
  const team = page.getByRole("list", { name: "Team" });
  await expect(team).toBeVisible();
  await expect.poll(slotHeight).toBeLessThan(openHeight + 2);
  await team.getByRole("button", { name: "Bram" }).click();

  // Collapsed again, the step's main action is in the peek.
  await page.getByRole("button", { name: /hide the round/i }).click();
  await expect(
    page.getByRole("button", { name: /show the round/i }),
  ).toHaveAccessibleName(/3 of 3 chosen/);
  await page.getByRole("link", { name: /propose this team/i }).click();
  // The sheet stays as you left it on the next step.
  await expect(page.locator("main[data-step=vote]")).toHaveAttribute(
    "data-sheet",
    "collapsed",
  );
  await expect(page.getByRole("button", { name: "Approve" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Your role on a table step shows the card only while held", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await openOnStage(page, "/design/starlit/table/quest", "table");
  const peek = page.locator("main button[data-role-peek]");
  const card = page.locator("[data-role-peek-card]");
  await expect(peek).toHaveAttribute("aria-pressed", "false");
  await expect(card).toHaveCount(0);
  await expect(roleName(page)).toHaveCount(0);

  await pressOn(page, peek);
  await expect(peek).toHaveAttribute("aria-pressed", "true");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Merlin");
  await expect(card).toContainText("Let go to hide it again.");
  // The name tags step back while the card is open, so none sit over it.
  const tags = page.locator("main .sl-stage-tags");
  await expect(tags).toBeHidden();

  await page.mouse.up();
  await expect(peek).toHaveAttribute("aria-pressed", "false");
  await expect(card).toHaveCount(0);
  await expect(tags).toBeVisible();
  await expect(roleName(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("without WebGL, the game screens say so and the landing form still works", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await withoutWebGL(page);
  const notice = page.getByRole("heading", {
    name: "This game needs 3D graphics",
  });

  // The landing keeps its form, and a failed stage is not claimed again and
  // again: count changes to the page for two seconds once it has settled.
  await page.goto("/design/starlit");
  await expect(page.getByLabel("Your name")).toBeVisible();
  await expect(page.locator("[data-stage-host]")).toHaveCount(0, {
    timeout: 30_000,
  });
  const changes = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let n = 0;
        const observer = new MutationObserver((list) => (n += list.length));
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(n);
        }, 2000);
      }),
  );
  expect(changes).toBeLessThan(5);
  await page.getByLabel("Your name").fill("Faraj");
  await page.getByRole("link", { name: "Create a room" }).click();
  await expect(notice).toBeVisible();
  await expect(page).toHaveURL(/via=create/);

  for (const url of [
    "/design/starlit/role/merlin",
    "/design/starlit/table/propose",
  ]) {
    await page.goto(url);
    await expect(notice).toBeVisible();
    await expect(
      page.locator("main[data-role-stage], main[data-step]"),
    ).toHaveCount(0);
    await expect(page.locator("[data-stage-host] canvas")).toHaveCount(0);
  }

  // A client move to another screen stays on the notice.
  const nav = page.getByRole("navigation", { name: "Prototype navigation" });
  await nav.getByRole("link", { name: "Role", exact: true }).click();
  await expect(page).toHaveURL(/\/role\/merlin/);
  await expect(notice).toBeVisible();
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
  await page.evaluate(() => localStorage.clear());
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
  // Friends keep arriving while the test runs, so check the trend, not an
  // exact moment: too few to start, and more than just you before long.
  await expect(page.getByText(/more players? (is|are) needed/)).toBeVisible();
  await expect
    .poll(() => page.locator("[data-tag]").count(), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(2);

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
  await page.evaluate(() => localStorage.clear());
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

test("with reduced motion, the quest result shows every card at once", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Sample how many cards are face up on every frame from the first paint:
  // the cards must go from none to all, never one at a time.
  await page.addInitScript(() => {
    const seen: number[] = [];
    (window as unknown as { e2eFaces: number[] }).e2eFaces = seen;
    const sample = () => {
      const up = document.querySelectorAll(
        'main[data-step=result] [data-face="up"]',
      ).length;
      if (seen.at(-1) !== up) seen.push(up);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await openOnStage(page, "/design/starlit/table/result", "table");
  const cards = page.getByRole("list", { name: "The quest cards, shuffled" });
  await expect(cards.locator('[data-face="up"]')).toHaveCount(3);
  await expect(cards).not.toContainText("Face down");
  // The mock quest had two Success cards and one Fail, in shuffled order.
  await expect(cards.locator("li", { hasText: "Success" })).toHaveCount(2);
  await expect(cards.locator("li", { hasText: "Fail" })).toHaveCount(1);
  await expect(page.getByText("Quest failed")).toBeVisible();
  const faces = await page.evaluate(
    () => (window as unknown as { e2eFaces: number[] }).e2eFaces,
  );
  expect(faces).toContain(3);
  expect(faces.filter((n) => n !== 0 && n !== 3)).toEqual([]);
  expect(errors).toEqual([]);
});
