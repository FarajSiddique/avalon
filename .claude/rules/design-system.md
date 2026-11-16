---
paths:
  - "src/routes/**/*"
  - "src/components/**/*"
  - "src/design/**/*"
  - "src/client/**/*"
  - "src/styles.css"
---

# Design System

**Status: a design direction has not been picked yet.** Three candidate directions
are built as prototypes under `/design`. Their specs are in `docs/design/`, and the
contract they all follow is `docs/design/README.md`. When one is picked, its tokens
move to `:root`, the other two are deleted, and this file is rewritten from the
winner's spec (Phase 0 in `docs/architecture.md`). The old navy and gold, Inter and
shadcn/ui system is gone; do not bring it back.

## What is already fixed, whichever direction wins

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
- No UI kit. Components are hand-built on the tokens with native elements.
