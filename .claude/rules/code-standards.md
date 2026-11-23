---
paths:
  - "src/**/*"
  - "e2e/**/*"
  - "scripts/**/*"
---

# Code standards

Rules marked (oxlint) fail `pnpm lint`. The rest are checked in review.

- **Folders.** `src/routes` holds route files only: route config, head, and one
  screen component from `src/components`. The Starlit prototype under
  `src/routes/design` is the one exception until Phase 4 deletes it.
  `src/components/<area>/` is `ui` (primitives), `art` (large drawings,
  browser-only), then one folder per screen area (`landing`, `room`, and later
  `lobby`, `role`, `table`). `src/client` is browser-only code that draws
  nothing. `src/server/room` and `src/server/game` run only in the Worker.
  `src/shared` is pure. `src/functions` holds server functions. `src/styles`
  holds `app.css`, `tokens.css` and later `motion.css`.
- **A folder is created with its first file.** No empty folders and no
  placeholder files.
- **Names.** Files are kebab-case (oxlint). Hooks are `use-*.ts`. One component
  per file, named as the file in PascalCase.
- **Exports.** Named exports only (oxlint). Default exports only where a tool
  demands one: config files and `src/server.ts`.
- **Barrels.** No `index.ts` re-export files, except `src/client/sound/index.ts`,
  which is that folder's public surface. (Route files named `index.tsx` are
  routes, not barrels.)
- **Tests.** Unit tests sit beside the source as `<name>.test.ts`. Browser tests
  are `e2e/*.e2e.ts`. Screenshot runs are `e2e/*.shots.ts`.
- **Dependency direction.** Routes use components; components use client and
  shared; server uses shared; functions use server and shared. oxlint enforces
  the forbidden directions (`no-restricted-imports` in `oxlint.config.ts`).
- **Randomness.** No `Math.random` in `src/server` or `src/shared` (oxlint).
- **Logging.** `console.error` and `console.warn` only, and only for things a
  person must act on (oxlint).
- **Lint exceptions.** An `oxlint-disable` comment always names the rule and
  carries a reason after `--`.
- **Commits and pull requests.** Conventional commit subjects. Every pull
  request uses `.github/pull_request_template.md` and fills in Evidence.
- **Before you push.** `pnpm check` runs every gate CI runs. The pre-commit
  hook (`.githooks/pre-commit`, turned on by `pnpm install`) checks format and
  lint on staged files.
