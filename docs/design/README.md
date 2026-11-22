# Design prototype

**Starlit Vale was chosen on 16 November 2026**, with the 3D Star Table as its
landing hero and game. It is a clickable prototype with mock data at
`/design/starlit` (`/design` redirects there). Its spec is
[starlit.md](./starlit.md). The other two directions (Ember & Rune, Lavender
Vigil), the tweak studio, the motion gallery and the flat 2D game screens were
removed on 21 November 2026; they are in the git history.

Screenshots of every screen at 390px and 1440px, plus the no-WebGL notice, are
written to [`screenshots/starlit/`](./screenshots) as
`<nn>-<screen>-<width>.jpg` by `pnpm build && pnpm screenshots` (software
WebGL in headless Chromium).

Starlit Vale has motion and sound wired into its click-through. Sound is off
until the player turns it on. The sound engine is in `src/client/sound` and
does not depend on the prototype.

## Screens

Driven by one mock game (`src/design/mock.ts`: seven players, seen by Wren, who
is Merlin and the host).

| Screen                | URL                             | What it shows                                                                                |
| --------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| Landing               | `/design/starlit`               | Name field, create a room, join with a 4-letter code.                                        |
| Lobby                 | `/design/starlit/lobby`         | Room code, player list, ready and away states, host settings, why the game cannot start yet. |
| Private role reveal   | `/design/starlit/role/merlin`   | A Good role. Hidden until the player presses and holds.                                      |
|                       | `/design/starlit/role/assassin` | An Evil role, same treatment.                                                                |
| Table: team proposal  | `/design/starlit/table/propose` | Quest track, score, rejected-vote track, seats. The leader picks the team.                   |
| Table: team vote      | `/design/starlit/table/vote`    | The proposed team, who has voted so far (not how), Approve and Reject.                       |
| Table: votes revealed | `/design/starlit/table/reveal`  | Every vote shown at the same moment, and the tally.                                          |
| Table: quest cards    | `/design/starlit/table/quest`   | A team member plays Success or Fail in private.                                              |
| Table: quest result   | `/design/starlit/table/result`  | The shuffled cards, the outcome, the updated quest track.                                    |

The primary button on each screen leads to the next one, so the prototype can be
clicked through from landing to quest result. Without WebGL the lobby, role and
table screens show a short notice instead; the landing form still works.

## How it is built

The prototype lives in `src/routes/design/starlit/`:

- `route.tsx` is the layout: it wraps the screens in `<div class="theme-starlit">`
  and renders the prototype bar, the night sky and the shared 3D stage.
  `index.tsx`, `lobby.tsx`, `role.$role.tsx` and `table.$step.tsx` are the
  screens.
- `-fonts.css` loads the fonts from Fontsource packages (self-hosted,
  open-licensed) and names them for the theme.
- `-theme.css` holds the tokens, scoped to `.theme-starlit`, in three layers:
  primitives (`--starlit-<hue>-<step>`), the semantic contract (`--canvas`,
  `--ink`, `--accent`, `--good`, `--evil`, ... see `src/styles.css`), and
  component tokens. Components use Tailwind utilities generated from the
  semantic layer (`bg-canvas`, `text-ink`, `border-line`, `font-display`) or
  `var(--token)`. No raw colour values in components. `-motion.css` holds the
  motion.
- `-components/` holds the components, the SVG artwork and the 3D stage
  (`stage/`, `three/`).

Kept for the real game: the view types in `src/shared/views.ts`, the
press-and-hold privacy behaviour in `src/client/use-hold-to-reveal.ts`, the
wording helpers in `src/shared/copy.ts` and the sound engine. Prototype only:
everything in `src/design/`.

## Rules the prototype follows

- Mobile first. No horizontal scrolling at 390px. Primary actions sit in the
  thumb zone. Touch targets are at least 44 by 44 px.
- Desktop (1440px) treats the table as a shared screen: the table in the
  middle, quest track and vote history beside it.
- Body text is at least 16px and at least 4.5:1 against its background.
  Contrast is measured with `node scripts/contrast.mjs`.
- Meaning never depends on colour alone. Good and Evil, Approve and Reject,
  Success and Fail each have their own shape or icon and a text label.
- Secret information (a role, a quest card) is hidden until the player presses
  and holds, and hides again on release or when the tab loses focus.
- All motion stops under `prefers-reduced-motion: reduce`.
- Artwork is original CSS, inline SVG and three.js code written for this repo.
  The inspiration images are mood references only and are not in the repo.
- Fonts are open-licensed and self-hosted with Fontsource packages.

## Known gaps

- **Quest cards can give your side away.** For a Good player the Fail card is
  shown as disabled, so someone glancing at the phone learns the player is
  Good. The real game will show both cards the same to everyone (see "Client"
  in `docs/architecture.md`).
- **Seven players only.** The mock game has seven seats. Seat layouts need
  checking for 5, 6, 8, 9 and 10.
- **No screens yet** for the assassination, the end of the game or the Lady of
  the Lake.
- **Checked in desktop Chromium only**, at 390px and 1440px. Not yet checked
  on real phones, in Safari, or with a screen reader.
