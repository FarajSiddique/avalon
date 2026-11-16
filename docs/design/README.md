# Design prototypes

Three design directions for Avalon, built as clickable prototypes with mock
data so they can be compared screen for screen. Open `/design` in the running
app to see them.

| Direction      | Route              | Spec                         |
| -------------- | ------------------ | ---------------------------- |
| Ember & Rune   | `/design/ember`    | [ember.md](./ember.md)       |
| Lavender Vigil | `/design/lavender` | [lavender.md](./lavender.md) |
| Starlit Vale   | `/design/starlit`  | [starlit.md](./starlit.md)   |

Screenshots of every screen at 390px and 1440px are in
[`screenshots/`](./screenshots), named `<direction>/<nn>-<screen>-<width>.jpg`.
Regenerate them with `pnpm build && pnpm screenshots`. Phone screenshots show
the whole page, with the bar that is fixed to the bottom of the screen drawn at
the bottom of the image.

The current front-runner, with the strengths and costs of each direction, is on
the `/design` page (`src/routes/design/index.tsx`).

Starlit Vale is the direction the owner is leaning to, so it alone has been
taken further: it has motion and sound at every stage of a game. All 35 moments
are replayable at `/design/starlit/motion`, and the same motion and cues are
wired into its click-through. Sound is off until the player turns it on. The
sound engine is in `src/client/sound` and does not depend on the prototypes.

## What every direction provides

The same screens at the same URLs, driven by the same mock game
(`src/design/mock.ts`: seven players, seen by Wren, who is Merlin and the host).

| Screen                | URL                         | What it shows                                                                                |
| --------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| Landing               | `/design/<d>`               | Name field, create a room, join with a 4-letter code.                                        |
| Lobby                 | `/design/<d>/lobby`         | Room code, player list, ready and away states, host settings, why the game cannot start yet. |
| Private role reveal   | `/design/<d>/role/merlin`   | A Good role. Hidden until the player presses and holds.                                      |
|                       | `/design/<d>/role/assassin` | An Evil role, same treatment.                                                                |
| Table: team proposal  | `/design/<d>/table/propose` | Quest track, score, rejected-vote track, seats. The leader taps seats to build a team.       |
| Table: team vote      | `/design/<d>/table/vote`    | The proposed team, who has voted so far (not how), Approve and Reject.                       |
| Table: votes revealed | `/design/<d>/table/reveal`  | Every vote shown at the same moment, and the tally.                                          |
| Table: quest cards    | `/design/<d>/table/quest`   | A team member plays Success or Fail in private.                                              |
| Table: quest result   | `/design/<d>/table/result`  | The shuffled cards, the outcome, the updated quest track.                                    |

The primary button on each screen leads to the next one, so each direction can
be clicked through from landing to quest result.

## How a direction is built

Each direction lives in one folder, `src/routes/design/<d>/`, and can be deleted
without touching anything else:

- `route.tsx` is the layout: it wraps the screens in `<div class="theme-<d>">`
  and renders the shared prototype bar. `index.tsx`, `lobby.tsx`,
  `role.$role.tsx` and `table.$step.tsx` are the screens.
- `-fonts.css` loads the direction's fonts from Fontsource packages
  (self-hosted, open-licensed) and names them for the theme.
- `-theme.css` holds the tokens, scoped to `.theme-<d>`, in three layers:
  primitives (`--<d>-<hue>-<step>`), the semantic contract shared by all
  directions (`--canvas`, `--ink`, `--accent`, `--good`, `--evil`, ... see
  `src/styles.css`), and component tokens. Components use Tailwind
  utilities generated from the semantic layer (`bg-canvas`, `text-ink`,
  `border-line`, `font-display`) or `var(--token)`. No raw colour values in
  components.
- `-components/` holds the direction's own components and artwork.

Shared between directions (and kept for the real game): the view types in
`src/shared/views.ts`, the press-and-hold privacy behaviour in
`src/client/use-hold-to-reveal.ts`, and the wording helpers in
`src/shared/copy.ts`. Shared for the prototypes only: everything in
`src/design/`.

## Rules every direction follows

- Mobile first. No horizontal scrolling at 390px. Primary actions sit in the
  thumb zone. Touch targets are at least 44 by 44 px.
- Desktop (1440px) treats the table as a shared screen: seats around a table,
  quest track and vote history beside it.
- Body text is at least 16px and at least 4.5:1 against its background.
  Contrast is measured with `node scripts/contrast.mjs`.
- Meaning never depends on colour alone. Good and Evil, Approve and Reject,
  Success and Fail each have their own shape or icon and a text label.
- Secret information (a role, a quest card) is hidden until the player presses
  and holds, and hides again on release or when the tab loses focus.
- All motion stops under `prefers-reduced-motion: reduce`.
- Artwork is original CSS and inline SVG written for this repo. The
  inspiration images are mood references only and are not in the repo.
- Fonts are open-licensed and self-hosted with Fontsource packages.

## Known gaps shared by all three

- **Quest cards can give your side away.** For a Good player the Fail card is
  shown as disabled, so someone glancing at the phone learns the player is
  Good. The real game will show both cards the same to everyone (see "Client"
  in `docs/architecture.md`).
- **Seven players only.** The mock game has seven seats. Seat layouts need
  checking, and in places new rules, for 5, 6, 8, 9 and 10.
- **No screens yet** for the assassination, the end of the game or the Lady of
  the Lake.
- **Checked in desktop Chromium only**, at 390px and 1440px. Not yet checked
  on real phones, in Safari, or with a screen reader.
