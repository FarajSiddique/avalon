---
paths:
  - "src/routes/**/*"
  - "src/components/**/*"
  - "src/client/**/*"
  - "src/styles/**/*"
---

# Design System

**Starlit Vale is the app's design system**, with its motion, its sound and the
3D Star Table. The spec is `docs/design-system.md`. Its tokens, classes, motion
and fonts are global (`src/styles/`), with no wrapper class. The old navy and
gold, Inter and shadcn/ui system is gone; do not bring it back.

`/design/starlit` is a reference for screens not built for real yet (lobby,
role, table), with mock data. It imports the same code as the app, and it is
deleted when Phase 4 ends. When a phase builds one of its screens, move that
screen's components to `src/components/<area>` and point the prototype at them.

## Where things go

- `src/styles/`: `app.css` (entry and `@theme`), `tokens.css`, `fonts.css`,
  `components.css` (`sl-*` classes), `motion.css`.
- `src/components/ui`: primitives and `AppShell` (sky, stage, sound switch).
- `src/components/art`, `three`, `stage`: browser-only. See below.

## Tokens

Components never use raw colour values. They use the Tailwind utilities generated
from the semantic tokens in `src/styles/tokens.css`, or `var(--token)`.

| Token                                        | Utility examples                         | Use                                    |
| -------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| `--canvas`                                   | `bg-canvas`                              | Page background                        |
| `--surface`                                  | `bg-surface`                             | Panels and cards                       |
| `--well`                                     | `bg-well`                                | Inputs and inset areas                 |
| `--ink`, `--ink-muted`                       | `text-ink`, `text-ink-muted`             | Text                                   |
| `--line`, `--line-strong`                    | `border-line`, `border-line-strong`      | Borders and dividers                   |
| `--focus`                                    | `outline-focus`                          | Focus ring                             |
| `--accent`, `--accent-strong`, `--on-accent` | `bg-accent`, `text-on-accent`            | Primary actions (the firelight colour) |
| `--accent-cool`                              | `text-accent-cool`                       | Eyebrows, the "you" marker (pink)      |
| `--good`, `--evil`                           | `text-good`, `text-evil`                 | Alignment                              |
| `--success`, `--fail`, `--warning`           | `text-success`, `text-fail`              | Quest results, ready and away states   |
| `--display-font`, `--body-font`              | `font-display`, `font-body`              | Type (Fraunces, Nunito Sans)           |
| `--corner-sm`, `-md`, `-lg`                  | `rounded-sm`, `rounded-md`, `rounded-lg` | Radii                                  |

Tokens have three layers: primitives (`--starlit-<hue>-<step>`, never used by
components), the semantic contract above, and component tokens (`--panel-*`,
`--seat-*`, `--art-*`, motion durations and curves). Prefer the `sl-*` classes
(`sl-panel`, `sl-btn`, `sl-input`, `sl-label`, `sl-eyebrow`, `sl-chip`) to
rebuilding them with utilities.

## Rules

- Mobile first. No horizontal scrolling at 390px. Primary actions in the thumb zone.
  Touch targets at least 44 by 44 px. Check every screen at 390px and 1440px.
- Night-time only. There is no light mode.
- Text contrast at least 4.5:1 (3:1 for large text and UI shapes). Measure with
  `node scripts/contrast.mjs "label=#fg:#bg"`.
- Meaning never depends on colour alone: Good and Evil, Approve and Reject, Success
  and Fail, Online and Away each have a shape or icon and a text label.
- Every screen that shows secret information hides it until the player presses and
  holds (`useHoldToReveal` in `src/client/use-hold-to-reveal.ts`) and says so.
- All motion stops under `prefers-reduced-motion: reduce`, the scene included (it
  cuts instead of flying). An element's normal style is its end state.
- Sound is off until the player turns it on.
- Fonts are open-licensed and self-hosted with Fontsource packages. Artwork is
  original CSS, inline SVG and three.js code. No emoji as icons. No UI kit:
  components are hand-built on the tokens with native elements.

## Browser-only rendering

The sky (`src/components/art`), the stage (`src/components/stage`) and the
three.js scene (`src/components/three`) render in the browser only, never on the
Worker: server-rendering them costs several times the free plan's CPU limit
(measured, see "Measured CPU time on the live Worker" in `docs/architecture.md`).

- Put a large drawing inside `ClientOnly`. If it takes space in the layout, give
  the fallback the same size classes so nothing moves when it appears.
- Only `src/components/stage/stage.tsx` loads three.js, with a dynamic
  `import()` after the `import.meta.env.SSR` guard. Nothing else imports a value
  (not a type) from `src/components/three`. `rg -l WebGLRenderer dist/server`
  must print nothing after `pnpm build`.
- The scene is decorative: what it shows is also said in text. Its colours come
  from the `--art-*` tokens at runtime. Without WebGL the landing keeps its form
  and the game screens show a short notice.
