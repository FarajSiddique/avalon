---
paths:
  - "src/routes/**/*"
  - "src/components/**/*"
  - "src/design/**/*"
  - "src/client/**/*"
  - "src/styles.css"
---

# Design System

**Status: Starlit Vale is the chosen direction** (picked by the owner on 16
November 2026), with its motion and sound. Its spec is `docs/design/starlit.md` and
its prototype is under `/design/starlit`. The real screens are not built from it
yet: Phase 0 in `docs/architecture.md` moves its tokens to `:root`, deletes the
other two directions and rewrites this file from the spec. Until then, new UI work
follows the Starlit spec. The old navy and gold, Inter and shadcn/ui system is
gone; do not bring it back.

Large drawings (night sky, camp scene, seat ring) render in the browser only, not
on the Worker: server-rendering them costs about twice the free plan's CPU limit
(measured, see Deployment in `docs/architecture.md`).

## What is fixed

### Tokens

Components never use raw colour values. They use the Tailwind utilities generated
from the semantic tokens in `src/styles.css`, or `var(--token)`.

| Token                                        | Utility examples                         | Use                                    |
| -------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| `--canvas`                                   | `bg-canvas`                              | Page background                        |
| `--surface`                                  | `bg-surface`                             | Panels and cards                       |
| `--well`                                     | `bg-well`                                | Inputs and inset areas                 |
| `--ink`, `--ink-muted`                       | `text-ink`, `text-ink-muted`             | Text                                   |
| `--line`, `--line-strong`                    | `border-line`, `border-line-strong`      | Borders and dividers                   |
| `--focus`                                    | `outline-focus`                          | Focus ring                             |
| `--accent`, `--accent-strong`, `--on-accent` | `bg-accent`, `text-on-accent`            | Primary actions (the firelight colour) |
| `--accent-cool`                              | `text-accent-cool`                       | The cool counterpart to the accent     |
| `--good`, `--evil`                           | `text-good`, `text-evil`                 | Alignment                              |
| `--success`, `--fail`, `--warning`           | `text-success`, `text-fail`              | Quest results, ready and away states   |
| `--display-font`, `--body-font`              | `font-display`, `font-body`              | Type                                   |
| `--corner-sm`, `-md`, `-lg`                  | `rounded-sm`, `rounded-md`, `rounded-lg` | Radii                                  |

Tokens have three layers: primitives (raw values), the semantic contract above, and
component tokens. A theme sets the semantic layer.

### Rules

- Mobile first. No horizontal scrolling at 390px. Primary actions in the thumb zone.
  Touch targets at least 44 by 44 px. Check every screen at 390px and 1440px.
- Night-time only. There is no light mode.
- Text contrast at least 4.5:1 (3:1 for large text and UI shapes). Measure with
  `node scripts/contrast.mjs "label=#fg:#bg"`.
- Meaning never depends on colour alone: Good and Evil, Approve and Reject, Success
  and Fail each have a shape or icon and a text label.
- Every screen that shows secret information hides it until the player presses and
  holds (`useHoldToReveal` in `src/client/use-hold-to-reveal.ts`) and says so.
- All motion stops under `prefers-reduced-motion: reduce`.
- Fonts are open-licensed and self-hosted with Fontsource packages. Artwork is original CSS and
  inline SVG, or open-licensed with the licence noted in the spec. No emoji as icons.
- The one exception: the landing hero may be a WebGL scene built with three.js (the 3D
  concepts in `src/routes/design/starlit/-components/three`). It is loaded lazily in the
  browser only, colours come from the `--art-*` tokens at runtime, it holds still under
  reduced motion, and without WebGL it falls back to the drawn scene.
- No UI kit. Components are hand-built on the tokens with native elements.
