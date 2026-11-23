# Phase 0: Starlit Vale Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Starlit Vale the app's real design system and restyle the two real screens (`/` and `/room/$code`) with it, without adding any feature.

**Architecture:** Starlit's tokens, component classes, motion and fonts move from the prototype folder to `src/styles`, unscoped. Its primitives and drawings move to `src/components`. The large drawings and the room screen render in the browser only, so the Worker sends a light page. The other two directions are deleted. The Starlit prototype and motion gallery stay as a working reference that imports the moved code, so there is one copy of everything.

**Tech Stack:** TanStack Start 1.169 and Router 1.170 (`ClientOnly`, the `ssr` route option), React 19, Tailwind CSS v4, Fontsource (Fraunces, Nunito Sans), Playwright, Cloudflare Workers.

**Spec:** `docs/architecture.md` ("Phase 0", "Measured CPU time on the live Worker", "App structure", "Import rules", "Client") and `docs/design/starlit.md`. Read `CLAUDE.md` and `.claude/rules/*` first. Where this plan and the architecture doc disagree about the prototype, this plan wins: the owner decided on 16 November 2026 to keep the Starlit prototype until Phase 4 ends.

## Global Constraints

- Preconditions. Stop and report if any is false:
  - `main` contains the foundation (PR #2) and Part A of `docs/plans/01-standards-and-ci-cd.md`: `oxlint.config.ts` (it replaced the planned `.oxlintrc.json`), `src/styles/app.css`, `src/styles/tokens.css`, `src/components/landing/start-form.tsx` and `src/components/room/room-screen.tsx` all exist.
  - On a new branch off the latest `main`, `pnpm install && pnpm check` passes.
- Decided, not to be reopened: Cloudflare Workers with one Durable Object per room, TanStack Start, the WebSocket protocol, Starlit Vale with its motion and sound.
- Out of scope: lobby features (ready, settings, kick, host hand-over), the game engine, new routes, new protocol messages, the shared table screen, any change under `src/server` or `src/shared`.
- Behaviour of the two real screens does not change: uncontrolled inputs read with `FormData` at submit, buttons disabled until `useHydrated()` is true, the same `data-testid` values (`room-code`, `player`, `connection`) and the same accessible names (`Your name`, `Have a room code?`, `Create a room`, `Join`, `Join room`). `e2e/realtime.e2e.ts` must pass without edits.
- Tokens only: no raw colour values in `.tsx` files.
- Meaning is never carried by colour alone. Touch targets are at least 44 by 44 px. No sideways scrolling at 390px. Text contrast at least 4.5:1, checked with `node scripts/contrast.mjs`.
- All motion stops under `prefers-reduced-motion: reduce`. Sound is off until the player turns it on.
- Folder, naming and export rules are in `.claude/rules/code-standards.md`.
- `src/routeTree.gen.ts` is generated and committed: run `pnpm build` after changing routes and commit the result.
- Stop any preview or dev server before rebuilding; a stale one gives false failures.
- The images in `~/.claude/fable-prompts/assets/avalon-overhaul/` must never be committed or used as assets.
- TypeScript strict, no `any`. Prettier on every file you touch. No em-dashes in prose.
- If you delegate, set the model on every subagent: Opus for design and build work, Sonnet for mechanical moves and lookups.
- Branch off the latest `main` (suggested: `phase-0/starlit-design-system`). Never commit to `main`. Open a draft pull request; do not merge.
- Ask the owner before: deploying or previewing by hand, creating accounts or tokens, pushing to `main`, force-pushing, merging. No need to ask before: branches, file changes, dependency changes, installs, builds, dev servers, Playwright, commits, pushing your branch, opening the draft pull request.
- If a Notion page named "Avalon: Developer Roadmap" exists and you have Notion tools: set the row "Phase 0: Starlit Vale becomes the design system" to In progress when you start, and to In review with the PR link when you open the pull request.

## Review Focus

Each line is pinned by a test in the task named.

1. The page jumps when the drawings appear after loading. The space must be reserved, so the form does not move. Task 4.
2. A player types before the page's scripts have loaded and loses the text. The forms stay uncontrolled; the existing create and join test covers it. Task 5 and Task 6 keep it passing.
3. `/room/$code` with a malformed code, now that the route no longer runs on the server. It must still show the not-found page. Task 6.
4. Reduced motion. Nothing may still be animating after the page settles. Task 7.
5. A browser with no stored sound choice. No sound and no audio warning in the console before the player presses anything. Task 4.
6. Slow or failed script loading. The page the Worker sends must already be readable: title, text and form on the canvas colour. Task 5.

## File structure after this plan

```
src/styles/
  app.css            Entry: Tailwind, then the four files below, then @theme
  tokens.css         Starlit's primitive, semantic and component tokens on :root
  fonts.css          Fontsource imports and the two font variables
  components.css     The sl-* component classes (was -theme.css, minus tokens)
  motion.css         Motion classes and keyframes (was -motion.css)
src/components/
  ui/                app-shell.tsx (new), icons.tsx, switch.tsx, sound-toggle.tsx, title-mark.tsx
  art/               night-sky.tsx, star-field.tsx, camp-scene.tsx, campfire.tsx, cloud.tsx,
                     constellation.tsx, lights.ts, seeded.ts
  landing/           start-form.tsx (restyled)
  room/              room-screen.tsx (restyled)
src/routes/design/
  index.tsx          Reduced to two links
  starlit/           Kept. Imports ui and art from src/components. No CSS files of its own
e2e/
  shell.e2e.ts       New. What the Worker sends, and what appears in the browser
  app.shots.ts       New. Screenshots of the two real screens
docs/
  design-system.md   Was docs/design/starlit.md
```

Deleted: `src/routes/design/ember/`, `src/routes/design/lavender/`, `docs/design/ember.md`, `docs/design/lavender.md`, `docs/design/README.md`, `docs/design/screenshots/ember/`, `docs/design/screenshots/lavender/`, `docs/design/screenshots/00-index-*.jpg`, and four font packages.

---

### Task 1: remove Ember & Rune and Lavender Vigil

**Files:**

- Delete: the paths listed above under "Deleted" (not the docs yet; Task 8 handles `docs/design/README.md` and the rename)
- Modify: `src/design/directions.ts`, `src/routes/design/index.tsx`, `e2e/design.shots.ts`, `package.json`

- [ ] **Step 1: Delete the two directions and their fonts**

```bash
git rm -r -q src/routes/design/ember src/routes/design/lavender \
  docs/design/ember.md docs/design/lavender.md \
  docs/design/screenshots/ember docs/design/screenshots/lavender
git rm -q docs/design/screenshots/00-index-390.jpg docs/design/screenshots/00-index-1440.jpg
pnpm remove @fontsource-variable/cinzel @fontsource-variable/eb-garamond @fontsource/press-start-2p @fontsource/vt323
```

- [ ] **Step 2: Reduce `DIRECTIONS` in `src/design/directions.ts` to the Starlit entry only**

Keep every other export (`designPaths`, `ROLE_VARIANTS`, `TABLE_STEPS`, `STARLIT_MOTION_PATH` and the rest) as it is.

- [ ] **Step 3: Rewrite `src/routes/design/index.tsx` as a short page**

A heading "Design reference", one sentence saying Starlit Vale is the chosen direction and these pages show screens that are not built for real yet, and two links: "Click-through" to `designPaths("starlit").landing` and "Motion and sound gallery" to `STARLIT_MOTION_PATH`. No iframes, no verdict lists.

- [ ] **Step 4: Remove the index capture from `e2e/design.shots.ts`**

Delete the `for (const viewport of VIEWPORTS)` block that captures `00-index`. The per-direction loop now runs for Starlit only, with no code change.

- [ ] **Step 5: Verify and commit**

Run: `pnpm build && pnpm lint && pnpm typecheck && pnpm test:e2e`
Expected: all pass. `grep -rn 'design/ember\|design/lavender\|"ember"\|"lavender"' src e2e` prints nothing. (Do not search for the bare words: Starlit's own code says "embers" and "remember".)

```bash
git add -A && git commit -m "chore(design): remove the Ember & Rune and Lavender Vigil directions"
```

### Task 2: Starlit's styles become the app's styles

**Files:**

- Create: `src/styles/fonts.css`, `src/styles/components.css`, `src/styles/motion.css`
- Modify: `src/styles/tokens.css`, `src/styles/app.css`, `src/routes/__root.tsx`, `src/routes/design/starlit/route.tsx`
- Delete: `src/routes/design/starlit/-theme.css`, `-motion.css`, `-fonts.css`

**Interfaces:**

- Produces: every `sl-*` class, every Starlit token and both fonts available on every page with no wrapper class. `.theme-starlit` no longer exists.

- [ ] **Step 1: Take "before" screenshots**

Run: `pnpm build && pnpm screenshots`
Copy `docs/design/screenshots/starlit/` to your scratch directory. These 22 images are what Step 5 compares against.

- [ ] **Step 2: Move the styles**

| From `src/routes/design/starlit/`                       | To                          | Change                                                                                                                     |
| ------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `-theme.css`: the `.theme-starlit { ... }` token blocks | `src/styles/tokens.css`     | Replace the neutral placeholder values. The selector becomes `:root`. Keep `color-scheme: dark`                            |
| `-theme.css`: everything else                           | `src/styles/components.css` | `.theme-starlit .font-display` becomes `.font-display`. The reduced-motion block's `.theme-starlit *` selectors become `*` |
| `-motion.css`                                           | `src/styles/motion.css`     | None                                                                                                                       |
| `-fonts.css`                                            | `src/styles/fonts.css`      | The selector `.theme-starlit` becomes `:root`                                                                              |

`src/styles/app.css` starts with:

```css
@import "tailwindcss";
@import "./fonts.css";
@import "./tokens.css";
@import "./components.css";
@import "./motion.css";
```

If `app.css` already has a reduced-motion rule that the moved block now duplicates, keep one.

- [ ] **Step 3: Remove the scoping from the prototype layout**

In `src/routes/design/starlit/route.tsx` delete the three CSS imports and the `theme-starlit` class. In `src/routes/__root.tsx` set the `theme-color` meta to the value of Starlit's `--canvas`.

- [ ] **Step 4: Check there is no leftover scope**

Run: `grep -rn "theme-starlit" src docs/design/starlit.md`
Expected: no matches in `src`. Matches in the spec are fixed in Task 8.

- [ ] **Step 5: Verify nothing moved on screen**

Run: `pnpm build && pnpm screenshots`
Expected: 22 passed. Open the before and after images of `01-landing-390`, `04-role-merlin-revealed-390`, `08-table-reveal-1440` and `10-table-result-390` and compare them yourself. They must match. Also open `/` in the built app: it now uses Starlit's colours and fonts with its old layout, which is expected at this point.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(design): make Starlit Vale's tokens, classes, motion and fonts global"
```

### Task 3: move the primitives and drawings, and add the app shell

**Files:**

- Move (with `git mv`) from `src/routes/design/starlit/-components/`:
  - `icons.tsx`, `switch.tsx`, `sound-toggle.tsx`, `title-mark.tsx` to `src/components/ui/`
  - the whole `art/` folder to `src/components/art/`
- Create: `src/components/ui/app-shell.tsx`
- Modify: every import of the moved files under `src/routes/design/starlit/`, and `src/routes/design/starlit/route.tsx`
- Test: `e2e/shell.e2e.ts`

**Interfaces:**

- Produces:
  - `AppShell(props: { children: ReactNode; bar?: ReactNode }): ReactNode` in `src/components/ui/app-shell.tsx`. It renders, in order: `bar`, the night sky inside `ClientOnly`, `children`, then `SoundToggle`, inside one `div` with the classes the prototype layout uses today (`bg-canvas font-body text-ink relative isolate flex min-h-dvh flex-1 flex-col`).
  - `NightSky` renders a root element with `data-art="night-sky"`. `CampScene` renders a root element with `data-art="camp-scene"`. Tests find the drawings by these attributes.

- [ ] **Step 1: Write the failing test `e2e/shell.e2e.ts`**

```ts
import { expect, test } from "@playwright/test";

test("the Worker sends the prototype landing page without the large drawings", async ({
  request,
}) => {
  const html = await (await request.get("/design/starlit")).text();
  expect(html).not.toContain("data-art=");
  expect(html).toContain("Avalon");
});

test("the drawings appear once the page is running", async ({ page }) => {
  await page.goto("/design/starlit");
  await expect(page.locator('[data-art="night-sky"]')).toBeAttached();
  await expect(page.locator('[data-art="camp-scene"]')).toBeVisible();
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm build && pnpm test:e2e e2e/shell.e2e.ts`
Expected: both FAIL, because no element has a `data-art` attribute yet.

- [ ] **Step 3: Move the files, add the attributes, write `AppShell`**

`ClientOnly` comes from `@tanstack/react-router` and takes `fallback` and `children`. The night sky's fallback is `null`: it is a fixed backdrop and reserves no space. In the prototype's landing route, wrap `CampScene` in `ClientOnly` with a fallback `div` that carries the same size classes the scene has (`-mt-6 block h-[19rem] w-full flex-none lg:absolute lg:inset-0 lg:mt-0 lg:h-full`) and `aria-hidden`.

`src/routes/design/starlit/route.tsx` becomes: `<AppShell bar={<DesignNav direction="starlit" extra={EXTRA_SCREENS} />}><Outlet /></AppShell>`.

Moved files must not import from `@/design`. `icons.tsx`, `switch.tsx`, `title-mark.tsx` and the `art` files do not today; `sound-toggle.tsx` imports only `@/client/sound` and `./icons`.

- [ ] **Step 4: Make the screenshot run wait for the drawings**

In `e2e/design.shots.ts`, `settle()` also waits for `[data-art="night-sky"]` to be attached before it measures the page height.

- [ ] **Step 5: Run the tests and the screenshots**

Run: `pnpm build && pnpm test:e2e && pnpm screenshots`
Expected: 6 e2e tests pass (4 existing, 2 new), 22 captures pass, and the four images named in Task 2 Step 5 still match their "before" versions.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor(design): move Starlit primitives and drawings to src/components, render drawings in the browser only"
```

### Task 4: the real landing page

**Files:**

- Modify: `src/routes/index.tsx`
- Test: `e2e/shell.e2e.ts`

**Interfaces:**

- Consumes: `AppShell`, `TitleMark`, `CampScene`, `StartForm` (restyled in Task 5; this task places it).

- [ ] **Step 1: Add the failing tests to `e2e/shell.e2e.ts`**

```ts
test("the Worker sends a light, readable landing page", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("data-art=");
  expect(html).toContain("Create a room");
  expect(html.length).toBeLessThan(30_000);
});

test("the form does not move when the drawings appear", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });
  const form = page.getByRole("button", { name: "Create a room" });
  await form.waitFor();
  const before = await form.boundingBox();
  await expect(page.locator('[data-art="camp-scene"]')).toBeVisible();
  await expect(form).toBeEnabled();
  const after = await form.boundingBox();
  expect(after?.y).toBe(before?.y);
  expect(after?.x).toBe(before?.x);
});

test("there is no sound and no warning before the player presses anything", async ({
  page,
}) => {
  const messages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      messages.push(message.text());
    }
  });
  await page.goto("/");
  await expect(page.locator('[data-art="camp-scene"]')).toBeVisible();
  const sound = page.getByRole("button", { name: "Sound" });
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  expect(messages).toEqual([]);
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("avalon:sound"))).toBe(
    "on",
  );
});
```

For scale: on 16 November 2026 the plain landing page was 4,356 bytes and the Starlit prototype landing, with its drawings rendered on the server, was 96,843 bytes.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm build && pnpm test:e2e e2e/shell.e2e.ts`
Expected: the three new tests FAIL (no camp scene and no Sound button on `/`).

- [ ] **Step 3: Build the page**

`src/routes/index.tsx` renders `AppShell` around the same structure as the prototype landing (`src/routes/design/starlit/index.tsx`): the `TitleMark` header and its lead paragraph, the client-only `CampScene` with the sized fallback, and the `sl-panel` holding `StartForm` where the prototype holds `LandingForm`. Remove the "working placeholder" paragraph. Add one small `sl-plain` link under the panel: "Design reference", to `/design`.

- [ ] **Step 4: Run the tests**

Run: `pnpm build && pnpm test:e2e`
Expected: all pass, including the four in `realtime.e2e.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: the landing page in Starlit Vale"
```

### Task 5: the start form in Starlit Vale

**Files:**

- Modify: `src/components/landing/start-form.tsx`

- [ ] **Step 1: Restyle it**

Use the markup and classes of `src/routes/design/starlit/-components/landing-form.tsx` (`sl-input`, `sl-input--code`, `sl-btn sl-btn--primary`, `sl-btn sl-btn--ghost`, the "or join friends" divider, the helper line under the code field), around `StartForm`'s existing logic. Do not change: the two `<form>` elements and their submit handlers, the input `name` attributes, the labels' text, the button names, the error `role="alert"` region, the `disabled` state tied to `useHydrated()`.

- [ ] **Step 2: Run the tests**

Run: `pnpm build && pnpm test:e2e`
Expected: all pass with no edit to `e2e/realtime.e2e.ts`.

- [ ] **Step 3: Check the page the Worker sends is readable on its own**

Run: `pnpm start`, then open `/` in Playwright with `javaScriptEnabled: false` at 390 by 844 and take a screenshot.
Expected, by looking at it: the title, the lead text and the whole form are visible on the canvas colour, with no drawings and nothing overlapping. The buttons are disabled, which is correct.

- [ ] **Step 4: Check contrast for any pair the form introduces on the panel**

Run `node scripts/contrast.mjs` with the label, helper and placeholder colours against the panel colour (take the values from `src/styles/tokens.css`).
Expected: every text pair at 4.5:1 or higher.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: the start form in Starlit Vale"
```

### Task 6: the room screen, rendered in the browser only

**Files:**

- Modify: `src/routes/room.$code.tsx`, `src/components/room/room-screen.tsx`
- Test: `e2e/shell.e2e.ts`

- [ ] **Step 1: Add the failing test**

```ts
test("the room page is rendered in the browser only", async ({
  request,
  page,
}) => {
  const html = await (await request.get("/room/ABCD")).text();
  expect(html).not.toContain('data-testid="connection"');
  expect(html).not.toContain("data-art=");
  expect(html.length).toBeLessThan(30_000);
  await page.goto("/room/ABCD");
  await expect(page.locator('[data-art="night-sky"]')).toBeAttached();
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm build && pnpm test:e2e e2e/shell.e2e.ts`
Expected: FAIL on the first assertion, because the room screen is rendered on the server today.

- [ ] **Step 3: Turn off server rendering for the route and restyle the screen**

Add `ssr: false` to the route options in `src/routes/room.$code.tsx`. With it, `beforeLoad` runs in the browser, not on the Worker, so the malformed-code check still happens there. Wrap the screen in `AppShell`.

Restyle `RoomScreen` with Starlit classes, taking the look of the room code from `src/routes/design/starlit/-components/lobby/room-code.tsx` and of a player row from `lobby/player-list.tsx`: an `sl-eyebrow`, the code large in the display font, players in an `sl-panel` with the host marker and an Online or Away label that has an icon as well as a colour, the connection line, and the name form for a visitor without a seat. No ready switch, no settings, no start button: those are Phase 1. Copy classes, not components; the prototype's lobby components stay where they are until Phase 1 moves them.

- [ ] **Step 4: Run every browser test**

Run: `pnpm build && pnpm test:e2e && pnpm test:restart`
Expected: all pass. In particular "a malformed room code shows the not-found page" and "an unknown room code says so" still pass without edits. If the not-found test fails because `beforeLoad` no longer produces the not-found page, use `ssr: "data-only"` instead, which keeps `beforeLoad` on the Worker and still skips rendering the component there; then re-run.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: the room screen in Starlit Vale, rendered in the browser only"
```

### Task 7: screenshots of the real screens, and reduced motion

**Files:**

- Create: `e2e/app.shots.ts`
- Modify: `e2e/shell.e2e.ts`

**Interfaces:**

- Produces: `docs/design/screenshots/app/<name>-<width>.jpg` for the names `01-landing`, `02-room-one-player`, `03-room-two-players`, `04-room-guest-away`, at widths 390 and 1440 (eight images).

- [ ] **Step 1: Add the reduced-motion test to `e2e/shell.e2e.ts`**

```ts
test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  for (const path of ["/", "/room/ABCD"]) {
    test(`nothing is still animating on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-art="night-sky"]')).toBeAttached();
      await page.waitForTimeout(400);
      const running = await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
      );
      expect(running).toBe(0);
    });
  }
});
```

- [ ] **Step 2: Run it**

Run: `pnpm build && pnpm test:e2e e2e/shell.e2e.ts`
Expected: PASS if Task 2 kept the reduced-motion rules intact. If it fails, the failing selector is in `src/styles/components.css` or `motion.css`; fix the rule, not the test.

- [ ] **Step 3: Write `e2e/app.shots.ts`**

Same conventions as `e2e/design.shots.ts`: JPEG quality 82, device scale factor 2 at 390 and 1 at 1440, the viewport grown to the page height, an assertion of no console errors and no sideways scrolling. The three room captures need a real room: one browser context creates it as "Wren" (`02`), a second context joins as "Ansel" (`03`, taken from the host's page), then the second context's page closes and the host's page waits for the row with `data-connected="false"` (`04`).

- [ ] **Step 4: Run and look**

Run: `pnpm build && pnpm screenshots`
Expected: 30 passed (22 Starlit reference, 8 app). Open all eight app images and check them yourself against the rules in Global Constraints. Fix what you find and re-run.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: screenshots and reduced-motion checks for the real screens"
```

### Task 8: docs

**Files:**

- Move: `docs/design/starlit.md` to `docs/design-system.md`
- Delete: `docs/design/README.md`
- Modify: `.claude/rules/design-system.md`, `CLAUDE.md`, `README.md`, `docs/architecture.md`

- [ ] **Step 1: `docs/design-system.md`**

Rewrite the opening so it describes the app's design system, not a candidate direction. Fix every path (`src/styles/*.css`, `src/components/ui`, `src/components/art`). Remove `.theme-starlit` and the comparison with the other directions. Fold in the token contract table and the shared rules from `docs/design/README.md`, then delete that file. Add a short section "Rendering": which components are browser-only and why, with a pointer to "Measured CPU time on the live Worker". Keep the Motion and Sound sections, the cue table and the known gaps.

- [ ] **Step 2: `.claude/rules/design-system.md`**

Rewrite it from the new doc: front matter `paths: ["src/routes/**/*", "src/components/**/*", "src/client/**/*", "src/styles/**/*"]`, the token table, the rules, the browser-only rule for `src/components/art`, and one line saying `/design/starlit` is a reference for screens not built yet and is deleted when Phase 4 ends.

- [ ] **Step 3: `docs/architecture.md`, `CLAUDE.md`, `README.md`**

- Architecture: mark Phase 0 done with the date. Rewrite its bullets to what was done. In Phase 1 add "move the lobby components from `src/routes/design/starlit/-components/lobby` to `src/components/lobby`"; in Phase 3 the same for `role` and `table`; at the end of Phase 4 add "delete `src/routes/design`, `src/design`, `e2e/design.shots.ts` and `docs/design/screenshots/starlit`". Update the App structure tree and the Routes table.
- `CLAUDE.md`: the Layout block, the styling row, and the conventions that name file paths.
- `README.md`: the status line and the docs links.

- [ ] **Step 4: Verify and commit**

Run: `grep -rn "docs/design/starlit.md\|docs/design/README.md\|theme-starlit\|-theme.css\|-motion.css" . --include='*.md' --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=dist`
Expected: matches only in `docs/plans/`.

```bash
pnpm format && git add -A && git commit -m "docs: Starlit Vale is the design system; Phase 0 recorded"
```

### Task 9: the pull request and the CPU measurement

- [ ] **Step 1: Full gate**

Run: `pnpm check`
Expected: every step passes. `git status` is clean and `src/routeTree.gen.ts` is committed.

- [ ] **Step 2: Open the draft pull request**

Title: "Phase 0: Starlit Vale becomes the design system". Evidence: the checks table; the eight app screenshots; the no-JavaScript screenshot from Task 5; a short GIF of the landing page loading (frames captured with Playwright and joined with `sharp`, which is already installed as a dependency of Wrangler; there is no ffmpeg on this machine); the HTML sizes of `/` and `/room/ABCD` before and after. Under "Not verified": CPU time on the live Worker until Step 3 is done, sound by ear, real phones.

- [ ] **Step 3: Measure CPU time**

If `.github/workflows/preview.yml` exists, the pull request has a preview address; that proves the build deploys, but the CPU numbers that count are production's. After the owner merges, the `deploy` job runs `scripts/cpu-check.mjs` against the live site.

If the pipeline from Part B of the standards plan is not merged yet: ask the owner for approval to deploy by hand, then run `pnpm run deploy` and measure as `docs/architecture.md` describes (30 requests per path while reading `wrangler tail avalon --format json`).

Expected either way: the 90th percentile for `/` and for `/room/<code>` is under 10 ms. Before this phase the plain pages measured 6 ms and 5 ms, and Starlit's landing with server-rendered drawings measured 37 ms. If either is over 10 ms, report the table and stop: moving more to the browser or the paid plan is the owner's call.

- [ ] **Step 4: Record the numbers**

Add the measured table to "Measured CPU time on the live Worker" in `docs/architecture.md` in a follow-up commit or pull request, and report to the owner: the outcome first, then what changed, what was verified and how, what was not, each judgment call, and open questions.
