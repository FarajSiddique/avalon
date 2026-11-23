# Code Standards and CI/CD Implementation Plan

> **Update, 21 November 2026:** Task A1 was done differently. The owner chose
> `@cloudflare/oxlint-config` with type-aware rules now (through tsrs), so the
> config is `oxlint.config.ts`, not `.oxlintrc.json`, and Part C is no longer
> needed for type-aware linting. Effects are banned and Zustand is in. See
> `docs/architecture.md`. Tasks A2 to A5 and Part B are unchanged.
>
> **Update, 21 November 2026:** Tasks A2 to A4 are done on `chore/code-standards`.
> The two rules A1's probe table expects but the migration left out,
> `import/no-default-export` and `unicorn/filename-case`, were added there too.
> Part B is next.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the repo's folder layout and lint rules before the game is built, then make every pull request get a preview and every merge to `main` deploy itself.

**Architecture:** Two pull requests. Part A swaps ESLint for oxlint, moves the few existing files into the agreed folders, and writes the standards down where agents and people both read them. Part B adds GitHub Actions jobs that preview each pull request on Cloudflare and deploy `main`, with the browser tests and a CPU check run against the live site. A short Part C covers TypeScript 7 as its own later pull request.

**Tech Stack:** oxlint 1.93, Prettier 3 with `prettier-plugin-tailwindcss`, GitHub Actions, Wrangler 4.162 (`wrangler preview`, `wrangler deploy`, `wrangler tail`), Dependabot, Vitest, Playwright.

**Spec:** The "Decisions" section below (agreed with the owner on 16 November 2026) and `docs/architecture.md`. Read `CLAUDE.md` and `.claude/rules/*` first.

## Decisions

| Topic              | Decision                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linter             | oxlint only. ESLint and its four companion packages are removed                                                                                    |
| Formatter          | Prettier stays, unchanged                                                                                                                          |
| Type-aware lint    | Not in Part A. It needs TypeScript 7 and is Part C                                                                                                 |
| Layout             | `src/components/<area>/`, `src/styles/`, the rest as today                                                                                         |
| Pre-commit         | A plain shell hook in `.githooks/`. No hook library                                                                                                |
| Previews           | Every pull request from a branch in this repo gets `wrangler preview --name pr-<number>`                                                           |
| Deploys            | A merge to `main` deploys. The owner merging is the approval. Nobody runs `wrangler deploy` by hand after Part B                                   |
| Live checks        | After each deploy: browser tests against the live site, then the CPU check. A failure turns the run red. Rollback is by hand (`wrangler rollback`) |
| Dependency updates | Dependabot, weekly, grouped                                                                                                                        |
| Not doing          | Docker, a staging environment, gradual rollouts, release versioning, Cloudflare's own Git integration                                              |

## Global Constraints

- Branch off the latest `main`. Never commit to `main`. One pull request for Part A, one for Part B, one for Part C.
- Precondition for Part A: PR #2 (the TanStack Start and Cloudflare foundation) is merged. If `main` has no `wrangler.jsonc`, stop and report.
- TypeScript strict, no `any`. Run Prettier on every file you touch.
- Script names do not change: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm test:restart`, `pnpm format:check`. Other docs and plans call them by these names.
- Set `WRANGLER_SEND_METRICS=false` for every Wrangler command, locally and in CI.
- Never put the owner's name or email in a file, a workflow, a commit body or a request to an outside service.
- Prose in docs and pull requests uses no em-dashes.
- Ask the owner before: running any deploy or preview by hand, creating accounts or tokens, changing branch protection, pushing to `main`, force-pushing, merging.
- No need to ask before: branches, file changes, dependency changes, installs, builds, dev servers, Playwright, commits, pushing your branch, opening a draft pull request.
- Every pull request has an `## Evidence` section with the check results.
- If a Notion page named "Avalon: Developer Roadmap" exists and you have Notion tools: set the matching rows to In progress when you start and to In review with the PR link when you open the pull request.

## Review Focus

Each line is pinned by a step in the task named.

1. A lint boundary that silently stops matching after files move. Override globs resolve relative to the config file, so a wrong path fails open. Task A1 proves every rule with a deliberate violation; Task A2 repeats the proof after the moves.
2. A pull request from a fork or from Dependabot has no secrets. The preview job must be skipped, not fail. Task B3.
3. A second push to `main` while a deploy is running. The running deploy must finish; the next one waits. Task B2.
4. `wrangler tail` returns few or no events (it samples, and a token without tail access returns nothing). The CPU check must fail loudly, not pass on no data. Task B1.
5. A staged file whose name contains `$` or a space, such as `src/routes/room.$code.tsx`. The pre-commit hook must pass it through unharmed. Task A3.
6. Requests right after a deploy hit cold isolates and run slower. The CPU check warms up first. Task B1.

---

# Part A: code standards (pull request 1)

Suggested branch: `chore/code-standards`.

## File structure after Part A

```
.oxlintrc.json                         New. All lint rules
.githooks/pre-commit                   New. Format check and lint for staged files
.github/pull_request_template.md       New
.claude/rules/code-standards.md        New. The standards, for agents and people
eslint.config.mjs                      Deleted
src/styles/app.css                     Was src/styles.css, minus the :root block
src/styles/tokens.css                  The :root token block
src/components/landing/start-form.tsx  Was src/components/start-form.tsx
src/components/room/room-screen.tsx    Was src/components/room-screen.tsx
```

### Task A1: oxlint replaces ESLint

**Files:**

- Create: `.oxlintrc.json`
- Delete: `eslint.config.mjs`
- Modify: `package.json`, `src/routes/design/starlit/motion.tsx`, `src/routes/design/index.tsx`, `src/routes/design/lavender/-components/pixel/pixel-canvas.ts`, `src/routes/design/lavender/-components/ui/pixel-switch.tsx`

**Interfaces:**

- Produces: `pnpm lint` (runs oxlint, fails on any warning) and `pnpm lint:fix`.

- [ ] **Step 1: Install oxlint and remove ESLint**

```bash
pnpm remove eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals
pnpm add -D oxlint@1.93.0
```

In `package.json` set `"lint": "oxlint --deny-warnings"` and add `"lint:fix": "oxlint --fix"`. Delete `eslint.config.mjs`.

- [ ] **Step 2: Create `.oxlintrc.json` with exactly this content**

This config was run against the repo on 16 November 2026 with oxlint 1.93.0. The three boundary blocks are the old ESLint blocks, unchanged.

```json
{
  "plugins": [
    "typescript",
    "react",
    "import",
    "unicorn",
    "jsx-a11y",
    "vitest",
    "oxc"
  ],
  "categories": { "correctness": "error", "suspicious": "error" },
  "env": { "browser": true, "node": true, "es2024": true },
  "ignorePatterns": [
    "dist",
    ".wrangler",
    ".tanstack",
    "src/routeTree.gen.ts",
    "worker-configuration.d.ts",
    "playwright-report",
    "test-results"
  ],
  "rules": {
    "typescript/no-explicit-any": "error",
    "typescript/consistent-type-imports": [
      "error",
      { "fixStyle": "inline-type-imports" }
    ],
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "error",
    "react/react-in-jsx-scope": "off",
    "import/no-cycle": "error",
    "import/no-default-export": "error",
    "import/no-unassigned-import": ["error", { "allow": ["**/*.css"] }],
    "unicorn/filename-case": ["error", { "case": "kebabCase" }],
    "unicorn/consistent-function-scoping": "off",
    "unicorn/no-array-reverse": "off",
    "unicorn/no-array-sort": "off",
    "jsx-a11y/prefer-tag-over-role": "off",
    "jsx-a11y/autocomplete-valid": "off",
    "no-console": ["error", { "allow": ["error", "warn"] }]
  },
  "overrides": [
    {
      "files": ["*.config.ts", "*.config.mts", "src/server.ts"],
      "rules": { "import/no-default-export": "off" }
    },
    {
      "files": ["src/routes/**"],
      "rules": { "unicorn/filename-case": "off" }
    },
    {
      "files": ["scripts/**", "e2e/**"],
      "rules": { "no-console": "off" }
    },
    {
      "files": [
        "src/routes/**",
        "src/components/**",
        "src/client/**",
        "src/design/**"
      ],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": [
                  "@/server",
                  "@/server/*",
                  "**/server/room/*",
                  "cloudflare:*"
                ],
                "message": "Browser code must not import server code. Talk to the room through @/client and @/shared/protocol, or call a server function in @/functions."
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["src/routes/api/**"],
      "rules": { "no-restricted-imports": "off" }
    },
    {
      "files": ["src/shared/**"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": [
                  "@/server/*",
                  "@/client/*",
                  "@/components/*",
                  "@/functions/*",
                  "@/routes/*",
                  "@/design/*",
                  "@tanstack/*",
                  "react",
                  "react-dom",
                  "node:*",
                  "cloudflare:*"
                ],
                "message": "src/shared is plain TypeScript used by both sides. It may only import zod and other src/shared files."
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["src/server/**", "src/shared/**"],
      "rules": {
        "no-restricted-properties": [
          "error",
          {
            "object": "Math",
            "property": "random",
            "message": "Game and room logic take randomness from the injected Rng or from crypto, never Math.random."
          }
        ]
      }
    }
  ]
}
```

Why four rules are off: `prefer-tag-over-role` wants `<output>` for `role="status"`, which is not the same thing; `autocomplete-valid` rejects `nickname`, which is a valid HTML token; the two `unicorn/no-array-*` rules and `consistent-function-scoping` are style with no bug behind them here.

- [ ] **Step 3: Run it and see exactly four findings**

Run: `pnpm lint`
Expected: four errors and nothing else.

| File                                                           | Rule                                    | Fix                                                                                                             |
| -------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/routes/design/starlit/motion.tsx` (about line 197)        | `no-shadow` on `index`                  | Rename the inner `index` to `momentIndex`                                                                       |
| `src/routes/design/index.tsx` (about line 102)                 | `react/iframe-missing-sandbox`          | `// oxlint-disable-next-line react/iframe-missing-sandbox -- same-origin preview of our own page` above the tag |
| `src/routes/design/lavender/-components/pixel/pixel-canvas.ts` | `unicorn/no-new-array`                  | `Array.from({ length: n })` with the same fill                                                                  |
| `src/routes/design/lavender/-components/ui/pixel-switch.tsx`   | `jsx-a11y/control-has-associated-label` | Give the control an `aria-label` from its existing label prop                                                   |

If the list differs, fix real problems in code and report the difference. Do not turn off more rules without saying so in the pull request.

- [ ] **Step 4: Prove every rule fires**

Create these seven files, run `pnpm lint`, and check each is reported with the rule shown. Then delete all seven.

| File                                 | Content                                                                                                                            | Must report                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/components/zz-probe-server.tsx` | `import { createRoom } from "@/server/room/state"; export const probe = createRoom;`                                               | `no-restricted-imports`                                      |
| `src/shared/zz-probe-react.ts`       | `import { useState } from "react"; export const probe = useState;`                                                                 | `no-restricted-imports`                                      |
| `src/server/zz-probe-random.ts`      | `export const probe = () => Math.random();`                                                                                        | `no-restricted-properties`                                   |
| `src/client/zz-probe-default.ts`     | `const probe = 1; export default probe;`                                                                                           | `import/no-default-export`                                   |
| `src/client/ZzProbeCase.ts`          | `export const probe = 1;`                                                                                                          | `unicorn/filename-case`                                      |
| `src/client/zz-probe-hooks.ts`       | A function `probe(flag: boolean)` that calls `useState` inside `if (flag)`, declares `const x: any = 1` and calls `console.log(x)` | `rules-of-hooks`, `typescript/no-explicit-any`, `no-console` |
| `src/routes/api/zz-probe-allowed.ts` | `import { env } from "cloudflare:workers"; export const probe = env;`                                                              | Nothing: server routes may import this                       |

- [ ] **Step 5: Run the full gate and commit**

Run: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e && pnpm test:restart`
Expected: all pass. `git status` shows no probe files.

```bash
git add -A && git commit -m "chore: replace ESLint with oxlint"
```

### Task A2: folder layout

**Files:**

- Move: `src/styles.css` to `src/styles/app.css`; `src/components/start-form.tsx` to `src/components/landing/start-form.tsx`; `src/components/room-screen.tsx` to `src/components/room/room-screen.tsx`
- Create: `src/styles/tokens.css`
- Modify: `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/room.$code.tsx`, and every doc that names the old paths

- [ ] **Step 1: Take a "before" screenshot**

With `pnpm build && pnpm start` running, save a 390 by 844 Playwright screenshot of `/` to your scratch directory.

- [ ] **Step 2: Move the files with `git mv` and split the styles**

`src/styles/tokens.css` holds the whole `:root { ... }` block and its comment. `src/styles/app.css` keeps everything else and starts with:

```css
@import "tailwindcss";
@import "./tokens.css";
```

In `src/routes/__root.tsx` the import becomes `import appCss from "../styles/app.css?url";`. Update the two component imports to `@/components/landing/start-form` and `@/components/room/room-screen`.

- [ ] **Step 3: Update every mention of the old paths**

Run: `grep -rn "src/styles.css\|components/start-form\|components/room-screen" --include='*.md' --include='*.ts' --include='*.tsx' --include='*.css' . --exclude-dir=node_modules --exclude-dir=dist`
Expected after the edits: no matches outside `docs/plans/`.

- [ ] **Step 4: Verify nothing changed on screen and the boundaries still hold**

Run: `pnpm build && pnpm test:e2e`
Expected: 4 passed. Take the same screenshot again; it must look identical to the "before" one. Repeat the first probe from Task A1 Step 4 in its new home (`src/components/landing/zz-probe-server.tsx`), see it reported, delete it.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: move styles and components into the agreed folders"
```

### Task A3: pre-commit hook and one check command

**Files:**

- Create: `.githooks/pre-commit` (executable)
- Modify: `package.json`

- [ ] **Step 1: Write `.githooks/pre-commit`**

```sh
#!/bin/sh
# Format check and lint for staged files only.
# Skip in an emergency with: git commit --no-verify
set -e
staged=$(git diff --cached --name-only --diff-filter=ACMR -z | tr '\0' '\n')
[ -z "$staged" ] && exit 0
git diff --cached --name-only --diff-filter=ACMR -z |
  xargs -0 pnpm exec prettier --check --ignore-unknown
git diff --cached --name-only --diff-filter=ACMR -z |
  grep -zE '\.(ts|tsx|mts|mjs)$' |
  xargs -0 -r pnpm exec oxlint --deny-warnings
```

The file list is passed with NUL separators so names with `$` or spaces survive. This pipeline was tested on macOS; `xargs -r` there is accepted and an empty list runs nothing.

- [ ] **Step 2: Wire it up**

In `package.json` add `"prepare": "git config core.hooksPath .githooks || true"` and `"check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e && pnpm test:restart"`. Run `pnpm install` once so `prepare` runs, then `chmod +x .githooks/pre-commit`.

- [ ] **Step 3: Prove it blocks and prove it passes**

1. Add `const unused: any = 1;` to `src/routes/room.$code.tsx`, `git add` it, `git commit -m test`. Expected: the commit is refused, and the file name with `$` is printed intact.
2. Revert that line, stage a formatted change, commit. Expected: the commit succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: add a pre-commit hook and a single check command"
```

### Task A4: write the standards down

**Files:**

- Create: `.claude/rules/code-standards.md`, `.github/pull_request_template.md`
- Modify: `CLAUDE.md`, `docs/architecture.md`, `README.md`

- [ ] **Step 1: Create `.claude/rules/code-standards.md`**

Front matter `paths: ["src/**/*", "e2e/**/*", "scripts/**/*"]`. It must state these rules, each in one or two lines:

- **Folders.** `src/routes` holds route files only: route config, head, and one screen component from `src/components`. `src/components/<area>/` is `ui` (primitives), `art` (large drawings, browser-only), then one folder per screen area (`landing`, `room`, and later `lobby`, `role`, `table`). `src/client` is browser-only code that draws nothing. `src/server/room` and `src/server/game` run only in the Worker. `src/shared` is pure. `src/functions` holds server functions. `src/styles` holds `app.css`, `tokens.css` and later `motion.css`.
- **A folder is created with its first file.** No empty folders and no placeholder files.
- **Names.** Files are kebab-case. Hooks are `use-*.ts`. One component per file, named as the file in PascalCase.
- **Exports.** Named exports only. Default exports only where a tool demands one: config files and `src/server.ts`.
- **Barrels.** No `index.ts` re-export files, except `src/client/sound/index.ts`, which is that folder's public surface.
- **Tests.** Unit tests sit beside the source as `<name>.test.ts`. Browser tests are `e2e/*.e2e.ts`. Screenshot runs are `e2e/*.shots.ts`.
- **Dependency direction.** Routes use components; components use client and shared; server uses shared; functions use server and shared. oxlint enforces the forbidden directions.
- **Randomness.** No `Math.random` in `src/server` or `src/shared`.
- **Logging.** `console.error` and `console.warn` only, and only for things a person must act on.
- **Lint exceptions.** An `oxlint-disable` comment always carries a reason after `--`.
- **Commits and pull requests.** Conventional commit subjects. Every pull request uses the template and fills in Evidence.

- [ ] **Step 2: Create `.github/pull_request_template.md`**

Sections, in this order: `## Summary`, `## What changed`, `## Evidence` (with a checks table whose rows are Format, Lint, Types, Unit tests, Build, Browser tests, Restart check, and a line "Screenshots or video for anything visible"), `## Not verified`.

- [ ] **Step 3: Update the other docs**

- `CLAUDE.md`: the Stack row for lint, the Commands block (`pnpm lint` is oxlint, add `pnpm lint:fix` and `pnpm check`), the Layout block, "Import boundaries (enforced by oxlint)", and one line pointing to `.claude/rules/code-standards.md`.
- `docs/architecture.md`: the App structure tree, and the sentence "ESLint enforces these" becomes oxlint with the new file name.
- `README.md`: the "check everything the way CI does" block becomes `pnpm check`.

- [ ] **Step 4: Verify and commit**

Run: `grep -rni "eslint" --include='*.md' --include='*.json' --include='*.yml' . --exclude-dir=node_modules --exclude-dir=dist`
Expected: matches only in `docs/plans/` and in `docs/architecture.md` where it records history.

```bash
pnpm format && git add -A && git commit -m "docs: add code standards and a pull request template"
```

### Task A5: open the pull request

- [ ] Run `pnpm check`. Expected: every step passes.
- [ ] Push and open a draft pull request against `main` titled "Code standards: oxlint, folder layout, pre-commit hook". Evidence: the checks table, the probe table from Task A1 with the rule each probe triggered, and the before and after screenshots from Task A2.
- [ ] Wait for CI. Expected: the `check` job passes. Do not merge.

---

# Part B: CI/CD (pull request 2)

Suggested branch: `ci/deploy-pipeline`. Start after Part A is merged.

## Owner steps (the owner does these; do not do them yourself)

1. In the Cloudflare dashboard, create an API token from the "Edit Cloudflare Workers" template, limited to the one account that owns the `avalon` Worker.
2. In the GitHub repo settings, add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Add the same two as Dependabot secrets only if Dependabot pull requests should ever get previews. The plan assumes they do not.

**Precondition check:** `gh secret list` shows both names. If not, stop and tell the owner which is missing.

## File structure after Part B

```
scripts/cpu-check.mjs              New. Measures Worker CPU time per path on a live site
scripts/lib/cpu-stats.mjs          New. The pure parts: parsing and percentiles
scripts/lib/cpu-stats.test.mjs     New
.github/workflows/ci.yml           Modified. Adds the deploy job
.github/workflows/preview.yml      New
.github/workflows/audit.yml        New
.github/dependabot.yml             New
```

### Task B1: the CPU check

**Files:**

- Create: `scripts/lib/cpu-stats.mjs`, `scripts/lib/cpu-stats.test.mjs`, `scripts/cpu-check.mjs`
- Modify: `vitest.config.mts` (include becomes `["src/**/*.test.ts", "scripts/**/*.test.mjs"]`), `package.json` (`"test:cpu": "node scripts/cpu-check.mjs"`)

**Interfaces:**

- Produces:
  - `summarise(samples: number[]): { count: number; median: number; p90: number; max: number }`. Nearest-rank percentiles on a sorted copy. An empty list gives all zeros.
  - `parseTailEvents(text: string): { path: string; cpuTime: number; outcome: string }[]`. `wrangler tail --format json` prints pretty-printed objects one after another with no separators, so this cannot be `JSON.parse` on lines. Events with no `event.request.url` are skipped. `path` is the URL's pathname.
  - CLI: `node scripts/cpu-check.mjs --url <base> --worker <name> --paths <comma list> [--requests 30] [--warmup 5] [--budget-ms 10] [--min-samples 10]`. Exit 0 when every path's p90 is at or under the budget; 1 when any path is over, or any event has outcome `exceededCpu`; 2 when any path has fewer than `--min-samples` events or the tail could not start.

- [ ] **Step 1: Write the failing tests in `scripts/lib/cpu-stats.test.mjs`**

```js
import { describe, expect, it } from "vitest";
import { parseTailEvents, summarise } from "./cpu-stats.mjs";

describe("summarise", () => {
  it("gives nearest-rank percentiles", () => {
    expect(summarise([10, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({
      count: 10,
      median: 5,
      p90: 9,
      max: 10,
    });
  });
  it("handles one sample", () => {
    expect(summarise([7])).toEqual({ count: 1, median: 7, p90: 7, max: 7 });
  });
  it("gives zeros for no samples", () => {
    expect(summarise([])).toEqual({ count: 0, median: 0, p90: 0, max: 0 });
  });
  it("does not change the list it was given", () => {
    const samples = [3, 1, 2];
    summarise(samples);
    expect(samples).toEqual([3, 1, 2]);
  });
});

describe("parseTailEvents", () => {
  it("reads objects printed back to back and skips non-request events", () => {
    const text = `{
  "outcome": "ok",
  "cpuTime": 3,
  "event": { "request": { "url": "https://x.workers.dev/room/ABCD?x=1" } }
}
{ "outcome": "ok", "cpuTime": 1, "event": { "rpcMethod": "create" } }
{ "outcome": "exceededCpu", "cpuTime": 52, "event": { "request": { "url": "https://x.workers.dev/" } } }`;
    expect(parseTailEvents(text)).toEqual([
      { path: "/room/ABCD", cpuTime: 3, outcome: "ok" },
      { path: "/", cpuTime: 52, outcome: "exceededCpu" },
    ]);
  });
  it("ignores a cut-off object at the end", () => {
    expect(parseTailEvents('{ "outcome": "ok", "cpuTi')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm test scripts/lib/cpu-stats.test.mjs`
Expected: FAIL, cannot find `./cpu-stats.mjs`.

- [ ] **Step 3: Implement `scripts/lib/cpu-stats.mjs`**

For `parseTailEvents`, walk the text keeping a brace depth, and track whether you are inside a string and whether the previous character was a backslash, so braces inside strings do not count. Parse each top-level object with `JSON.parse`.

- [ ] **Step 4: Run the tests and see them pass**

Run: `pnpm test`
Expected: PASS, 6 new tests.

- [ ] **Step 5: Implement `scripts/cpu-check.mjs`**

Order of work: spawn `pnpm exec wrangler tail <worker> --format json` with `WRANGLER_SEND_METRICS=false`; wait 6 seconds for it to attach; send `--warmup` requests per path; record the current length of the tail output; send `--requests` requests per path, one at a time; wait 6 seconds; stop the tail; parse only the output after the recorded length; group by path; print a Markdown table (Path, Samples, Median, 90th percentile, Slowest, Result); exit with the code from the Interfaces block. Print the reason on a non-zero exit.

- [ ] **Step 6: Try it against the live site**

This reads from production and deploys nothing, so it needs no approval, but it does need a Wrangler login or the token in the environment.

Run: `node scripts/cpu-check.mjs --url https://avalon.hong-ladder.workers.dev --worker avalon --paths /,/room/ZZZZ`
Expected: a table with at least 10 samples per path, both 90th percentiles under 10 ms, exit code 0. For comparison, 16 November 2026 measured 6 ms and 5 ms.

Then run it with `--paths /design/starlit --budget-ms 10`. Expected: exit code 1, since that page measured about 37 ms.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(ci): add a repeatable Worker CPU check"
```

### Task B2: deploy on merge to main

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Stop pushes to `main` cancelling each other**

The workflow-level concurrency block becomes:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

- [ ] **Step 2: Add the `deploy` job after `check`**

```yaml
deploy:
  needs: check
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  timeout-minutes: 15
  environment:
    name: production
    url: https://avalon.hong-ladder.workers.dev
  concurrency:
    group: deploy-production
    cancel-in-progress: false
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    PRODUCTION_URL: https://avalon.hong-ladder.workers.dev
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: .nvmrc
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - name: Deploy
      run: pnpm run deploy
    - run: pnpm exec playwright install --with-deps chromium
    - name: Browser tests against the live site
      run: pnpm test:e2e
      env:
        E2E_BASE_URL: ${{ env.PRODUCTION_URL }}
    - name: CPU check against the live site
      run: node scripts/cpu-check.mjs --url "$PRODUCTION_URL" --worker avalon --paths /,/room/ZZZZ
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: live-test-results
        path: test-results/
        retention-days: 7
```

- [ ] **Step 3: Create the GitHub environment**

Run: `gh api -X PUT repos/FarajSiddique/avalon/environments/production`
Expected: a JSON body with `"name": "production"`. No reviewers are set; the owner can add a required reviewer later if they want a click before each deploy.

- [ ] **Step 4: Verify what can be verified before a merge**

Run `actionlint` if it is installed. Otherwise push the branch: on the pull request the `check` job must still run and pass, and the `deploy` job must show as skipped, which proves the file parses and the `if` holds. The deploy job itself first runs when this pull request is merged; say so under "Not verified" in the pull request.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "ci: deploy to Cloudflare on merge to main, then test the live site"
```

### Task B3: a preview for every pull request

**Files:**

- Create: `.github/workflows/preview.yml`

- [ ] **Step 1: Confirm the command's output shape**

Read <https://developers.cloudflare.com/workers/previews/examples/> and `pnpm exec wrangler preview --help`. This plan assumes `wrangler preview --name <name> --json` prints JSON whose `.preview.urls[0]` is the preview address, and that `wrangler preview delete --name <name> --skip-confirmation` removes it. If either differs, follow the docs and note the difference in the pull request.

- [ ] **Step 2: Write the workflow**

```yaml
name: Preview

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

env:
  WRANGLER_SEND_METRICS: "false"
  PREVIEW_NAME: pr-${{ github.event.pull_request.number }}
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

jobs:
  preview:
    # Forks and Dependabot get no secrets, so they get no preview.
    if: >-
      github.event.action != 'closed' &&
      github.event.pull_request.head.repo.full_name == github.repository &&
      github.actor != 'dependabot[bot]'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Deploy the preview
        id: preview
        run: |
          pnpm exec wrangler preview --name "$PREVIEW_NAME" --json > preview.json
          echo "url=$(jq -r '.preview.urls[0]' preview.json)" >> "$GITHUB_OUTPUT"
      - name: Comment the address on the pull request
        run: gh pr comment "$PR" --edit-last --create-if-none --body "Preview: $URL"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
          URL: ${{ steps.preview.outputs.url }}
      - run: pnpm exec playwright install --with-deps chromium
      - name: Browser tests against the preview
        run: pnpm test:e2e
        env:
          E2E_BASE_URL: ${{ steps.preview.outputs.url }}

  cleanup:
    if: >-
      github.event.action == 'closed' &&
      github.event.pull_request.head.repo.full_name == github.repository &&
      github.actor != 'dependabot[bot]'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec wrangler preview delete --name "$PREVIEW_NAME" --skip-confirmation
```

- [ ] **Step 3: Verify with this pull request's own run**

Push the branch and open the draft pull request (Task B6 does the rest of it). Expected on that pull request: the `preview` job is green, one comment carries a `pr-<number>-avalon.<subdomain>.workers.dev` address, opening the address shows the landing page, and the "Browser tests against the preview" step reports 4 passed. The push itself is the approval-free path the owner agreed to; do not run `wrangler preview` by hand.

If the preview deploy fails because Wrangler cannot find the built Worker, the Cloudflare Vite plugin writes a redirect at `.wrangler/deploy/config.json` during `pnpm build`; check that `wrangler preview` reads it, and if it does not, pass the built config with `--config`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "ci: preview every pull request on Cloudflare and test it"
```

### Task B4: dependency updates

**Files:**

- Create: `.github/dependabot.yml`, `.github/workflows/audit.yml`

- [ ] **Step 1: `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
    open-pull-requests-limit: 5
    groups:
      tanstack:
        patterns: ["@tanstack/*"]
      minor-and-patch:
        update-types: [minor, patch]
    ignore:
      - dependency-name: typescript
        update-types: ["version-update:semver-major"]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
    groups:
      actions:
        patterns: ["*"]
```

The two TanStack packages are pinned to exact versions and must move together, hence their own group. TypeScript's major version is Part C's job.

- [ ] **Step 2: `.github/workflows/audit.yml`**

A workflow named `Audit`, on `schedule` (`cron: "0 7 * * 1"`) and `workflow_dispatch`, one job that checks out, sets up pnpm and Node as the other workflows do, and runs `pnpm audit --prod --audit-level=high`.

- [ ] **Step 3: Verify and commit**

Run: `gh workflow run Audit --ref ci/deploy-pipeline` after pushing, then `gh run watch`.
Expected: the run finishes. A reported vulnerability is a finding to report, not a reason to change this plan.

```bash
git add -A && git commit -m "ci: weekly dependency updates and audit"
```

### Task B5: protect main

- [ ] **Step 1: Ask the owner**

Say exactly what will change: `main` will require a pull request and a passing `check` job, will refuse direct pushes and force pushes, and this applies to the owner too. Wait for a yes.

- [ ] **Step 2: Apply it**

```bash
gh api -X PUT repos/FarajSiddique/avalon/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["check"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

- [ ] **Step 3: Verify**

Run: `gh api repos/FarajSiddique/avalon/branches/main/protection --jq '.required_status_checks.contexts, .enforce_admins.enabled'`
Expected: `["check"]` and `true`.

### Task B6: docs and the pull request

**Files:**

- Modify: `docs/architecture.md`, `CLAUDE.md`, `README.md`

- [ ] **Step 1: Update the docs**

- `docs/architecture.md`, Deployment: replace "Every later deploy still needs the owner's go-ahead" with the pipeline (a merge to `main` deploys; the owner merging is the approval), add the preview flow, the token's scope, how to roll back (`pnpm exec wrangler rollback`, then revert the commit on `main`), and that a Durable Object class change or a change to the saved room shape still follows the rules already written there. Point "Measured CPU time" at `pnpm test:cpu`.
- `CLAUDE.md`: add `pnpm test:cpu` to Commands, and replace the deploy line with: agents never run `pnpm run deploy`, `wrangler deploy` or `wrangler preview` by hand; deploys and previews happen only through the workflows.
- `README.md`: one line on previews and deploys.

- [ ] **Step 2: Open the pull request**

Run `pnpm check`, push, open a draft pull request titled "CI/CD: previews for pull requests, deploy on merge". Evidence: the checks table, the CPU check's two tables from Task B1 Step 6, a link to the green preview run and the preview address, and the branch protection output. Under "Not verified": the production deploy job, which first runs on merge. Do not merge.

- [ ] **Step 3: After the owner merges**

Watch the `deploy` job with `gh run watch`. Expected: deploy, 4 browser tests and the CPU check all pass. Report the CPU table to the owner. If it fails, report the failing step and its output; do not roll back without being asked.

---

# Part C: TypeScript 7 and type-aware lint (pull request 3, before Phase 1 if it can pass)

> **Update, 21 November 2026:** the owner turned on `@cloudflare/oxlint-config` with type-aware rules through tsrs, without TypeScript 7 (see Owner decisions in `docs/architecture.md`). This part is now optional: do it only for TypeScript 7 itself, not to unlock lint rules.

Why it is separate: oxlint's type-aware rules need TypeScript 7, and the repo is on 6.0. TypeScript 7 is a new compiler. Its stable programmatic interface arrives with 7.1, which was still in beta on 16 November 2026, and any tool here that calls into the `typescript` package may not work until then. That risk should not ride along with a lint swap or a design change. Why it should not wait long: `no-floating-promises` catches an unawaited storage write in the room object, which is the most expensive kind of bug this app can have, and Phase 1 is where that code starts to grow.

### Task C1: try the upgrade

- [ ] On a branch, run `pnpm add -D typescript@7 oxlint-tsgolint@latest`, then `pnpm check`.
- [ ] If anything fails because a tool cannot work with TypeScript 7 (candidates: `wrangler types`, the TanStack route generator, the Vite plugins, Vitest, the Prettier Tailwind plugin, the editor), stop. Record the tool, its version and the error under a new heading "TypeScript 7" in `docs/architecture.md`, open a pull request with only that note, and leave the upgrade for later.
- [ ] If everything passes: in `.oxlintrc.json` add `"options": { "typeAware": true }` and these rules as errors: `typescript/no-floating-promises`, `typescript/no-misused-promises`, `typescript/await-thenable`, `typescript/switch-exhaustiveness-check`. Fix every finding in code. A promise that is deliberately not awaited gets `void` and a comment saying why.
- [ ] Prove the rule works: add `this.ctx.storage.put("probe", 1);` with no `await` to `src/server/room/room-object.ts`, run `pnpm lint`, see `no-floating-promises`, remove the line.
- [ ] Remove the `typescript` entry from the `ignore` list in `.github/dependabot.yml`, run `pnpm check`, open a draft pull request with the findings that were fixed listed in the Evidence section.
