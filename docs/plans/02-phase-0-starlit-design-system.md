# Phase 0: Starlit Vale Design System Implementation Plan

> **For agentic workers:** build task by task. If you delegate, use parallel subagents with the model set on each (Opus for design and build work, Sonnet for mechanical moves and lookups). Do not use the superpowers skills. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revised 22 November 2026** after the owner chose the 3D Star Table as the real landing's hero (it was the drawn camp when this plan was first written).

**Goal:** Make Starlit Vale the app's real design system, and restyle the two real screens with it: `/` gets the 3D Star Table hero exactly as the prototype landing has it, and `/room/$code` gets a flat Starlit panel. No feature is added.

**Architecture:** Starlit's tokens, component classes, motion and fonts move from the prototype folder to `src/styles`, unscoped. Its primitives, drawings, the shared stage and the three.js scene move to `src/components`, with no import from `src/design` left in them. The real `/` and `/room/$code` sit under one pathless layout that owns the stage, so Phase 1 can fly the camera from the landing into the real lobby without moving it again. The Worker sends a light page: the sky and the stage render in the browser only, and three.js is loaded on demand, never in the Worker bundle. The prototype stays as a reference that imports the moved code, so there is one copy of everything.

**Tech Stack:** TanStack Start 1.169 and Router 1.170 (`ClientOnly`, the `ssr` route option, pathless layouts), React 19, Tailwind CSS v4, three.js, Fontsource (Fraunces, Nunito Sans), Playwright with software WebGL (SwiftShader), Cloudflare Workers.

**Spec:** `docs/architecture.md` ("Phase 0", "Measured CPU time on the live Worker", "App structure", "Import rules", "Client"), `docs/design/starlit.md` (especially "The 3D stage") and `docs/superpowers/specs/2026-11-21-starlit-table-3d-design.md`. Read `CLAUDE.md` and `.claude/rules/*` first. Where this plan and the architecture doc disagree about the prototype, this plan wins: the owner decided on 16 November 2026 to keep the Starlit prototype until Phase 4 ends.

## Scope, decided

- **`/` uses the 3D Star Table hero now** (owner, 22 November 2026). It looks and behaves like `/design/starlit`: the title, the lead, the stage band (phone) or full backdrop (wide), and the form in an `sl-panel`.
- **`/room/$code` stays flat in this phase.** It does not claim the stage. The 3D lobby, and the camera flight from the landing into it, are Phase 1.
- **So the real form does not fly.** `StartForm` never calls `depart()`: with no lobby slot to claim it, `pending` would never clear and the stage would stay mounted behind the room. Create and Join navigate as they do today; the landing's stage is released when the landing unmounts.
- **The landing without WebGL** keeps today's prototype behaviour: the band stays empty (its space reserved) and the form works. No notice on the landing; the notice is for screens that need the scene.
- **Avatars are client-side only in this phase.** `Avatar` moves out of `src/design` to `src/client/avatar.ts`. The room protocol does not carry avatars yet. Phase 1 adds avatars to the room (owner, 22 November 2026: each player picks a look, stored per seat; see Phase 1 in `docs/architecture.md`).

## Global Constraints

- Preconditions. Stop and report if any is false:
  - `main` contains Parts A and B of `docs/plans/01-standards-and-ci-cd.md` (PRs #5 and #6) and PR #7.
  - On a new branch off the latest `main`, `pnpm install && pnpm check` passes.
- Decided, not to be reopened: Cloudflare Workers with one Durable Object per room, TanStack Start, the WebSocket protocol, Starlit Vale with its motion, sound and 3D Star Table.
- Out of scope: lobby features (ready, settings, kick, host hand-over, avatars in the room), the landing-to-lobby flight on real routes, the game engine, new URLs, new protocol messages, the shared table screen, any change under `src/server` or `src/shared`.
- Behaviour of the two real screens does not change: uncontrolled inputs read with `FormData` at submit, buttons disabled until `useHydrated()` is true, the same `data-testid` values (`room-code`, `player`, `connection`) and the same accessible names (`Your name`, `Have a room code?`, `Create a room`, `Join`, `Join room`). `e2e/realtime.e2e.ts` must pass without edits. It runs without SwiftShader, so in it the stage may fail or never load; the form must work either way.
- three.js is never in the Worker bundle: `rg -l WebGLRenderer dist/server` prints nothing after `pnpm build` (true on main today).
- Tokens only: no raw colour values in `.tsx` files.
- Meaning is never carried by colour alone. Touch targets are at least 44 by 44 px. No sideways scrolling at 390px. Text contrast at least 4.5:1, checked with `node scripts/contrast.mjs`.
- All motion stops under `prefers-reduced-motion: reduce`, including the scene: the engine already reads the media query (`three/engine.ts`) and cuts instead of moving. Sound is off until the player turns it on.
- No effects (oxlint): the stage is claimed with `useSyncExternalStore` subscriptions and ref callbacks, as it is in the prototype. Keep it that way when moving it.
- Folder, naming and export rules are in `.claude/rules/code-standards.md`.
- `src/routeTree.gen.ts` is generated and committed: run `pnpm build` after changing routes and commit the result.
- Stop any preview or dev server before rebuilding; a stale one gives false failures.
- The images in `~/.claude/fable-prompts/assets/avalon-overhaul/` must never be committed or used as assets.
- TypeScript strict, no `any`. Prettier on every file you touch. No em-dashes in prose.
- Branch off the latest `main` (suggested: `phase-0/starlit-design-system`). Never commit to `main`. Open a draft pull request; do not merge.
- Ask the owner before: deploying or previewing by hand, creating accounts or tokens, pushing to `main`, force-pushing, merging. No need to ask before: branches, file changes, dependency changes, installs, builds, dev servers, Playwright, commits, pushing your branch, opening the draft pull request.
- If a Notion page named "Avalon: Developer Roadmap" exists and you have Notion tools: set the row "Phase 0: Starlit Vale becomes the design system" to In progress when you start, and to In review with the PR link when you open the pull request.

## Review Focus

Each line is pinned by a test in the task named.

1. The page jumps when the stage appears after loading. The band's space must be reserved in the HTML the Worker sends, so the form does not move. Task 5.
2. A player types before the page's scripts have loaded and loses the text. The forms stay uncontrolled; the existing create and join test covers it. Tasks 5 and 6 keep it passing.
3. No WebGL, or the stage fails or is slow. The landing form still creates and joins rooms; no notice covers it. Task 5.
4. `/room/$code` with a malformed code, now that the route no longer renders on the server. It must still show the not-found page. Task 7.
5. Reduced motion. No CSS animation still running and the scene settled with no camera move. Task 8.
6. A browser with no stored sound choice. No sound and no audio warning before the player presses anything. Task 5.
7. Slow or failed script loading. The page the Worker sends must already be readable: title, text and form on the canvas colour. Task 6.
8. three.js leaking into the Worker bundle, or the sky being server-rendered again (CPU). Tasks 4 and 10.

## File structure after this plan

```
src/styles/
  app.css            Entry: Tailwind, then the four files below, then @theme
  tokens.css         Starlit's primitive, semantic and component tokens on :root
  fonts.css          Fontsource imports and the two font variables
  components.css     The sl-* component classes (was -theme.css, minus tokens)
  motion.css         Motion classes and keyframes (was -motion.css)
src/client/
  avatar.ts          Was src/design/avatar.ts: the Avatar type, tokens, avatarFor, avatarKey
  use-avatar.ts      Was src/design/use-avatar.ts
  css-vars.ts        Was src/design/css-vars.ts
src/components/
  ui/                app-shell.tsx (new), icons.tsx, switch.tsx, sound-toggle.tsx, title-mark.tsx
  art/               night-sky.tsx, star-field.tsx, cloud.tsx, constellation.tsx, lights.ts, seeded.ts
  three/             The Star Table scene: engine.ts, kit.ts, guards.ts, palette.ts, props.ts,
                     avatar.ts, seating.ts, types.ts, scenes/* (loaded on demand, browser only)
  stage/             stage.tsx, stage-context.tsx (the shared stage and its store)
  landing/           landing-art.tsx (moved), landing-screen.tsx (new), start-form.tsx (restyled)
  room/              room-screen.tsx (restyled)
src/routes/
  _app/route.tsx     New pathless layout: AppShell with the stage, for the real app
  _app/index.tsx     Was routes/index.tsx (URL /)
  _app/room.$code.tsx  Was routes/room.$code.tsx (URL /room/$code), ssr: false
  design/starlit/    Kept. Imports ui, art, three and stage from src/components. No CSS files of its own
src/design/
  flow.ts            New: the prototype's "next step" rule for camera moves (was in stage.tsx)
e2e/
  shell.e2e.ts       New. What the Worker sends, and what appears in the browser
  app.shots.ts       New. Screenshots of the two real screens
docs/
  design-system.md   Was docs/design/starlit.md
```

Stays in the prototype until the phase that builds its screen: `lobby/`, `role/`, `table/` (including `table-stage.css`), `stage/stage-tags.tsx` (imports `table-stage.css`), `stage/game-players.ts` (mock data), `landing-form.tsx`, `sound-link.tsx`, `names.ts`, `no-webgl-notice.tsx`, `use-reduced-motion.ts`.

Already done before this plan, so not repeated here: Ember & Rune, Lavender Vigil, the tweak studio, the motion gallery, the drawn camp and the flat 2D game screens were deleted on 21 November 2026.

---

### Task 1: Starlit's styles become the app's styles

**Files:**

- Create: `src/styles/fonts.css`, `src/styles/components.css`, `src/styles/motion.css`
- Modify: `src/styles/tokens.css`, `src/styles/app.css`, `src/routes/__root.tsx`, `src/routes/design/starlit/route.tsx`
- Delete: `src/routes/design/starlit/-theme.css`, `-motion.css`, `-fonts.css`

**Interfaces:**

- Produces: every `sl-*` class (including `sl-landing`, `sl-backstage*`, `sl-name-tag`), every Starlit token and both fonts on every page with no wrapper class. `.theme-starlit` no longer exists.

- [ ] **Step 1: Take "before" screenshots**

Run: `pnpm build && pnpm screenshots`
Expected: 20 passed. Copy `docs/design/screenshots/starlit/` to your scratch directory; Step 5 compares against it.

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

If `app.css` already has a reduced-motion rule that the moved block now duplicates, keep one. `table/table-stage.css` stays with the prototype's table.

- [ ] **Step 3: Remove the scoping from the prototype layout**

In `src/routes/design/starlit/route.tsx` delete the three CSS imports and the `theme-starlit` class. In `src/routes/__root.tsx` set the `theme-color` meta to the value of Starlit's `--canvas`.

- [ ] **Step 4: Check there is no leftover scope**

Run: `rg -n "theme-starlit" src`
Expected: no matches. Matches in docs are fixed in Task 9.

- [ ] **Step 5: Verify nothing moved on screen**

Run: `pnpm build && pnpm screenshots && pnpm test:e2e`
Expected: 20 captures and every e2e test pass. Compare the before and after images of `01-landing-390`, `01-landing-1440`, `04-role-revealed-390` and `07-table-reveal-1440` yourself. They must match apart from the scene's idle motion.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(design): make Starlit Vale's tokens, classes, motion and fonts global"
```

### Task 2: move the primitives, the drawings and their helpers

**Files:**

- Move (with `git mv`):
  - `src/design/avatar.ts`, `src/design/use-avatar.ts`, `src/design/css-vars.ts` to `src/client/`
  - `src/routes/design/starlit/-components/icons.tsx`, `switch.tsx`, `sound-toggle.tsx`, `title-mark.tsx` to `src/components/ui/`
  - the whole `src/routes/design/starlit/-components/art/` folder to `src/components/art/`
- Modify: every import of the moved files (prototype, `src/design`, `e2e`), `.claude/rules/code-standards.md` (the Folders rule gains `three` and `stage`)

**Interfaces:**

- `NightSky` renders a root element with `data-art="night-sky"`. Tests find it by that attribute.
- Nothing under `src/components` or `src/client` imports `@/design`. Check: `rg -n "@/design" src/components src/client` prints nothing.

- [ ] **Step 1: Move and fix imports**

The art files import `cssVars` from `@/design/css-vars`: point them at `@/client/css-vars`. `avatar.ts` and `use-avatar.ts` are pure browser code with no prototype dependency; their only change is the path. Prototype files (`lobby/avatar-maker.tsx`, `lobby/lobby-screen.tsx`, `stage/game-players.ts`, `src/design/mock.ts` and the rest) import them from `@/client`.

- [ ] **Step 2: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`
Expected: all pass.

```bash
git add -A && git commit -m "refactor: move Starlit primitives, drawings and avatar helpers out of the prototype"
```

### Task 3: move the stage and the Star Table scene

**Files:**

- Move (with `git mv`): `src/routes/design/starlit/-components/three/` to `src/components/three/`; `src/routes/design/starlit/-components/stage/stage.tsx` and `stage-context.tsx` to `src/components/stage/`; `src/routes/design/starlit/-components/landing-art.tsx` to `src/components/landing/landing-art.tsx`
- Create: `src/design/flow.ts`
- Modify: `src/components/stage/stage.tsx`, `src/components/stage/stage-context.tsx`, the prototype files that import the moved ones

**Interfaces:**

- `StageProvider(props: { children: ReactNode; isNextInFlow?: (from: string, to: string) => boolean })`. The rule is kept in the stage store and read by `Stage` when the address changes. Default: `() => false` (every change of screen cuts).
- `isPrototypeNextInFlow(from: string, to: string): boolean` in `src/design/flow.ts`: today's `isNextInFlow` and `screenOf` from `stage.tsx`, unchanged, with `TABLE_STEPS` and `isTableStep` from `./directions`. The prototype layout passes it to its `StageProvider`.
- Everything else in the stage API is unchanged: `useStageSlot`, `useStagePlayers`, `useStagePlay`, `useTagLayer`, `usePickAt`, `useStage`, `useStageStore`, the `data-stage-host` element and its `data-stage` attribute (`hero`, `lobby`, `role`, `table`, `flying`).

- [ ] **Step 1: Move the files and inject the flow rule**

After the move, `stage.tsx` has no `/design/starlit` path and no `@/design` import. The three.js files import `Avatar`, `CLOAK_TOKENS` and `avatarKey` from `@/client/avatar` and `sparklePath` from `../../art/seeded` (now `@/components/art/seeded`). `stage-tags.tsx` and `game-players.ts` stay in the prototype and import the stage from `@/components/stage/stage-context`.

Keep three.js behind the dynamic `import("../three/engine")` in the stage's ref callback, after the `import.meta.env.SSR` guard. Nothing outside `src/components/three` may import a value (not a type) from it.

- [ ] **Step 2: Verify the prototype still works and the Worker bundle is clean**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && rg -l WebGLRenderer dist/server; pnpm test:e2e && pnpm screenshots`
Expected: `rg` prints nothing; every e2e test passes, including the landing-to-lobby flight tests in `e2e/game.e2e.ts`; 20 captures pass and match Task 1's.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor: move the shared stage and the Star Table scene to src/components"
```

### Task 4: the app layout, with the sky in the browser only

**Files:**

- Create: `src/components/ui/app-shell.tsx`, `src/routes/_app/route.tsx`, `e2e/shell.e2e.ts`
- Move (with `git mv`): `src/routes/index.tsx` to `src/routes/_app/index.tsx`, `src/routes/room.$code.tsx` to `src/routes/_app/room.$code.tsx` (fix their `createFileRoute` paths; the URLs stay `/` and `/room/$code`)
- Modify: `src/routes/design/starlit/route.tsx`, `src/routeTree.gen.ts` (regenerated)

**Interfaces:**

- `AppShell(props: { children: ReactNode; bar?: ReactNode; isNextInFlow?: (from: string, to: string) => boolean }): ReactNode`. It renders, inside one `div` with the classes the prototype layout uses today (`bg-canvas font-body text-ink relative isolate flex min-h-dvh flex-1 flex-col`), in order: `bar`, `NightSky` inside `ClientOnly` (fallback `null`: it is a fixed backdrop and reserves no space), then a `StageProvider` (passing `isNextInFlow`) holding `Stage` and `children`, then `SoundToggle`.
- `src/routes/_app/route.tsx`: `<AppShell><Outlet /></AppShell>`. This is where the real app's stage lives, so in Phase 1 the landing and the lobby share it.
- `src/routes/design/starlit/route.tsx` becomes `<AppShell bar={<DesignNav />} isNextInFlow={isPrototypeNextInFlow}><Outlet /></AppShell>`. The prototype and the app each have their own stage; they never mount together.

- [ ] **Step 1: Write the failing tests in `e2e/shell.e2e.ts`**

```ts
import { expect, test } from "@playwright/test";

test("the Worker sends the landing without the sky or the stage", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();

  expect(html).not.toContain("data-art=");
  expect(html).not.toContain("data-stage-host");
  expect(html).toContain("Create a room");
});

test("the sky appears once the page is running", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-art="night-sky"]')).toBeAttached();
});
```

The same two checks run for `/design/starlit`.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm build && pnpm test:e2e e2e/shell.e2e.ts`
Expected: the sky test FAILS on `/` (no sky there yet), and the first test fails on `/design/starlit` (the sky is server-rendered today).

- [ ] **Step 3: Build `AppShell` and the layout, move the two routes**

- [ ] **Step 4: Run every check**

Run: `pnpm build && rg -l WebGLRenderer dist/server; pnpm test:e2e && pnpm test:restart`
Expected: `rg` prints nothing, all tests pass, `git diff --stat src/routeTree.gen.ts` shows the regenerated tree.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: one app layout with the stage, and the sky rendered in the browser only"
```

### Task 5: the real landing on the 3D Star Table

**Files:**

- Create: `src/components/landing/landing-screen.tsx`
- Modify: `src/routes/_app/index.tsx`, `src/components/landing/start-form.tsx` (layout classes only here; Task 6 restyles it), `src/routes/design/starlit/index.tsx`
- Test: `e2e/shell.e2e.ts`

**Interfaces:**

- `LandingScreen(props: { form: ReactNode }): ReactNode`: today's `StarlitLandingPage` markup (`sl-landing` with `data-leaving` from `useStage()`, the `TitleMark` header and its lead, `LandingArt` with the same size classes, the `sl-panel` holding `form`). The real route passes `<StartForm />`; the prototype route passes `<LandingForm />`, so both landings are one component.
- `StartForm` does not import the stage and never calls `depart()` (see Scope).

- [ ] **Step 1: Add the failing tests to `e2e/shell.e2e.ts`**

Tests that need the scene use software WebGL, as `e2e/game.e2e.ts` does, in their own `test.describe` with `test.use({ launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } })`.

```ts
test("the Worker sends a light, readable landing page", async ({ request }) => {
  const html = await (await request.get("/")).text();

  expect(html).toContain('data-stage-slot="hero"');
  expect(html).toContain("Create a room");
  expect(html.length).toBeLessThan(30_000);
});

// With SwiftShader:
test("the landing settles on the Star Table hero", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator("[data-stage-host]");

  await expect(stage.locator("canvas")).toHaveCount(1, { timeout: 60_000 });
  await expect(stage).toHaveAttribute("data-stage", "hero", {
    timeout: 60_000,
  });
});

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

test("no sound and no audio warning before the player presses anything", async ({
  page,
}) => {
  const audio: string[] = [];

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
  expect(await page.evaluate(() => localStorage.getItem("avalon:sound"))).toBe(
    "on",
  );
});

// Without WebGL (withoutWebGL from ./no-webgl):
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
```

The audio test filters on audio messages only: SwiftShader logs WebGL warnings that are not this page's fault. Check the sound key name against `src/client/sound` before relying on it. For scale: on 16 November 2026 the plain landing page was 4,356 bytes and the prototype landing, with its drawings server-rendered, 96,843 bytes.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm build && pnpm test:e2e e2e/shell.e2e.ts`
Expected: the hero, form-movement and sound tests FAIL (no stage and no Sound button on `/` yet).

- [ ] **Step 3: Build `LandingScreen` and use it in both routes**

Remove the "working placeholder" paragraph. Add one small `sl-plain` link under the panel: "Design reference", to `/design`.

- [ ] **Step 4: Run the tests**

Run: `pnpm build && pnpm test:e2e`
Expected: all pass, including `realtime.e2e.ts` unedited and the prototype flight tests in `game.e2e.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: the landing page on the 3D Star Table"
```

### Task 6: the start form in Starlit Vale

**Files:**

- Modify: `src/components/landing/start-form.tsx`

- [ ] **Step 1: Restyle it**

Use the markup and classes of `src/routes/design/starlit/-components/landing-form.tsx` (`sl-label`, `sl-input`, `sl-input--code`, `sl-btn sl-btn--primary`, `sl-btn sl-btn--ghost`, the "or join friends" divider, the helper line under the code field), around `StartForm`'s existing logic. Do not change: the two `<form>` elements and their submit handlers, the input `name` attributes, the labels' text, the button names, the error `role="alert"` region, the `disabled` state tied to `useHydrated()`. Do not copy the prototype's `depart`, timer or controlled inputs.

- [ ] **Step 2: Run the tests**

Run: `pnpm build && pnpm test:e2e`
Expected: all pass with no edit to `e2e/realtime.e2e.ts`.

- [ ] **Step 3: Check the page the Worker sends is readable on its own**

Run: `pnpm start`, then open `/` in Playwright with `javaScriptEnabled: false` at 390 by 844 and take a screenshot.
Expected, by looking at it: the title, the lead text and the whole form are visible on the canvas colour, the empty band keeps its height, nothing overlaps. The buttons are disabled, which is correct.

- [ ] **Step 4: Check contrast for any pair the form introduces on the panel**

Run `node scripts/contrast.mjs` with the label, helper and placeholder colours against the panel colour (values from `src/styles/tokens.css`).
Expected: every text pair at 4.5:1 or higher.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: the start form in Starlit Vale"
```

### Task 7: the room screen, rendered in the browser only

**Files:**

- Modify: `src/routes/_app/room.$code.tsx`, `src/components/room/room-screen.tsx`
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
  await expect(page.locator("[data-stage-host]")).toHaveCount(0);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm build && pnpm test:e2e e2e/shell.e2e.ts`
Expected: FAIL on the first assertion, because the room screen is rendered on the server today.

- [ ] **Step 3: Turn off server rendering for the route and restyle the screen**

Add `ssr: false` to the route options. With it, `beforeLoad` runs in the browser, so the malformed-code check still happens there. The layout already wraps it in `AppShell`. The room screen does not claim the stage.

Restyle `RoomScreen` with Starlit classes, taking the look of the room code from `src/routes/design/starlit/-components/lobby/room-code.tsx` and of a player row from `lobby/player-list.tsx`: an `sl-eyebrow`, the code large in the display font, players in an `sl-panel` with the host marker and an Online or Away label that has an icon as well as a colour, the connection line, and the name form for a visitor without a seat. No ready switch, settings, avatars or start button: those are Phase 1. Copy classes, not components; the prototype's lobby components stay where they are until Phase 1 moves them.

- [ ] **Step 4: Run every browser test**

Run: `pnpm build && pnpm test:e2e && pnpm test:restart`
Expected: all pass. In particular "a malformed room code shows the not-found page" and "an unknown room code says so" pass without edits. If the not-found test fails because `beforeLoad` no longer produces the not-found page, use `ssr: "data-only"` instead, which keeps `beforeLoad` on the Worker and still skips rendering the component there; then re-run.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: the room screen in Starlit Vale, rendered in the browser only"
```

### Task 8: screenshots of the real screens, and reduced motion

**Files:**

- Create: `e2e/app.shots.ts`
- Modify: `e2e/shell.e2e.ts`

**Interfaces:**

- Produces `docs/design/screenshots/app/<name>-<width>.jpg` for `01-landing`, `02-landing-no-webgl`, `03-room-one-player`, `04-room-two-players`, `05-room-guest-away`, at 390 and 1440 (ten images).

- [ ] **Step 1: Add the reduced-motion tests to `e2e/shell.e2e.ts`**

`getAnimations()` sees CSS animations only, not the scene's render loop, so the scene is checked by what the engine writes on its host: it settles on `data-stage="hero"` and `data-moving` is absent.

```ts
test.describe("with reduced motion", () => {
  test.use({
    reducedMotion: "reduce",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  });

  for (const path of ["/", "/room/ABCD"]) {
    test(`nothing is still animating on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-art="night-sky"]')).toBeAttached();

      if (path === "/") {
        const stage = page.locator("[data-stage-host]");

        await expect(stage).toHaveAttribute("data-stage", "hero", {
          timeout: 60_000,
        });
        await expect(stage).not.toHaveAttribute("data-moving", "");
      }

      await page.waitForTimeout(400);
      const running = await page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === "running")
            .length,
      );

      expect(running).toBe(0);
    });
  }
});
```

- [ ] **Step 2: Run it**

Run: `pnpm build && pnpm test:e2e e2e/shell.e2e.ts`
Expected: PASS if Task 1 kept the reduced-motion rules intact. If it fails, fix the rule in `components.css` or `motion.css`, or the engine, not the test.

- [ ] **Step 3: Write `e2e/app.shots.ts`**

Same conventions as `e2e/design.shots.ts`: SwiftShader, JPEG quality 82, device scale factor 2 at 390 and 1 at 1440, wait for `data-stage="hero"` and `document.fonts.ready` on the landing, an assertion of no console errors and no sideways scrolling. `02-landing-no-webgl` uses `withoutWebGL`. The three room captures need a real room: one context creates it as "Wren" (`03`), a second joins as "Ansel" (`04`, taken from the host's page), then the second context's page closes and the host's page waits for the row with `data-connected="false"` (`05`).

- [ ] **Step 4: Run and look**

Run: `pnpm build && pnpm screenshots`
Expected: 30 passed (20 Starlit reference, 10 app). Open all ten app images and check them against Global Constraints, and `01-landing` against the prototype's `01-landing` at the same width: they should look the same. Fix what you find and re-run.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: screenshots and reduced-motion checks for the real screens"
```

### Task 9: docs

**Files:**

- Move: `docs/design/starlit.md` to `docs/design-system.md`
- Delete: `docs/design/README.md`
- Modify: `.claude/rules/design-system.md`, `.claude/rules/code-standards.md`, `CLAUDE.md`, `README.md`, `docs/architecture.md`

- [ ] **Step 1: `docs/design-system.md`**

Rewrite the opening so it describes the app's design system, not a candidate direction. Fix every path (`src/styles/*.css`, `src/components/ui`, `art`, `three`, `stage`). Remove `.theme-starlit` and the comparison with the other directions. Fold in the screen list and how-it-is-built notes from `docs/design/README.md`, then delete that file. Add a short section "Rendering": what is browser-only (the sky, the stage, three.js, the room route) and why, with a pointer to "Measured CPU time on the live Worker". Keep "The 3D stage", Motion, Sound, the cue table and the known gaps.

- [ ] **Step 2: `.claude/rules/design-system.md`**

Rewrite it from the new doc: front matter `paths: ["src/routes/**/*", "src/components/**/*", "src/client/**/*", "src/styles/**/*"]`, the token table, the rules, the browser-only rule for `art`, `three` and `stage`, and one line saying `/design/starlit` is a reference for screens not built yet and is deleted when Phase 4 ends.

- [ ] **Step 3: `docs/architecture.md`, `CLAUDE.md`, `README.md`**

- Architecture: mark Phase 0 done with the date and rewrite its bullets to what was done. Update the App structure tree (the `_app` layout, `three`, `stage`) and the Routes table.
- `CLAUDE.md`: the Layout block, the styling row, and the conventions that name file paths.
- `README.md`: the status line and the docs links.

- [ ] **Step 4: Verify and commit**

Run: `rg -n "docs/design/starlit.md|docs/design/README.md|theme-starlit|-theme.css|-motion.css" --glob '*.md' --glob '*.ts' --glob '*.tsx' .`
Expected: matches only in `docs/plans/` and `docs/superpowers/`.

```bash
pnpm format && git add -A && git commit -m "docs: Starlit Vale is the design system; Phase 0 recorded"
```

### Task 10: the pull request and the CPU measurement

- [ ] **Step 1: Full gate**

Run: `pnpm check && rg -l WebGLRenderer dist/server`
Expected: every step passes, `rg` prints nothing, `git status` is clean and `src/routeTree.gen.ts` is committed.

- [ ] **Step 2: Open the draft pull request**

Title: "Phase 0: Starlit Vale becomes the design system". Follow `.github/pull_request_template.md`. Evidence: the checks table; the ten app screenshots; the no-JavaScript screenshot from Task 6; a short GIF of the landing loading into the 3D hero (frames captured with Playwright and joined with `sharp`, which is installed as a dependency of Wrangler; there is no ffmpeg on this machine); the HTML sizes of `/` and `/room/ABCD` before and after; the size of the three.js chunk in `dist/client`. Under "Not verified": CPU time on the live Worker until Step 3 is done, the scene's frame rate on a real phone, sound by ear.

- [ ] **Step 3: Measure CPU time**

The pull request gets a preview from `.github/workflows/preview.yml`; that proves the build deploys. The numbers that count are production's: after the owner merges, the `deploy` job runs `pnpm test:cpu` (`scripts/cpu-check.mjs`) against the live site.

Expected: the 90th percentile for `/` and for `/room/<code>` is under 10 ms. Before this phase the plain pages measured 6 ms and 5 ms, and the prototype landing with server-rendered drawings 37 ms. If either is over 10 ms, report the table and stop: moving more to the browser or the paid plan is the owner's call.

- [ ] **Step 4: Record the numbers**

Add the measured table to "Measured CPU time on the live Worker" in `docs/architecture.md` in a follow-up commit or pull request, and report to the owner: the outcome first, then what changed, what was verified and how, what was not, each judgment call, and open questions.
