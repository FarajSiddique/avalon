# Ember & Rune

A candlelit oak table at night. The phone is the table: the players are
conspirators leaning in over a rune circle that glows like embers.

Route: `/design/ember`. Code: `src/routes/design/ember/`.

## Mood

Warm, close and secretive. Dark oak planks, a few tallow candles, a circle of
runes burning in the middle of the table, parchment cards with dark ink, wax
seals pressed next to names. Light comes from fire only: ember orange and
candle gold. The cool note is a single arcane blue, used for Good. Violet
stays in the corners of the room, in the shadows.

It is lightly skeuomorphic (wood, paper, wax, bevelled frames) but not
photographic. Everything is drawn with CSS gradients and inline SVG.

## Palette

### Primitives

All raw colours live in `-theme.css` as `--ember-<hue>-<step>`.

| Hue                                         | Steps                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `char` (charred umber, a hint of plum)      | 950 `#0b0607`, 900 `#140c0e`, 800 `#1d1114`, 700 `#29181b`                                              |
| `oak` (the table)                           | 900 `#20130d`, 800 `#2b1a12`, 700 `#3a2418`, 600 `#5c3b24`, 500 `#7d5431`, 400 `#a57645`, 300 `#c4975f` |
| `parchment` (paper, and light text on wood) | 100 `#f3e6c8`, 200 `#ecdbb2`, 300 `#dcc596`, 400 `#c4aa80`                                              |
| `ink` (text on paper)                       | 900 `#2a180d`, 700 `#5a3d22`                                                                            |
| `flame` (ember orange)                      | 300 `#ffb066`, 400 `#f79646`, 500 `#ee8233`, 600 `#d0661f`, 800 `#7a3410`                               |
| `gold` (candle gold)                        | 200 `#ffdf9a`, 300 `#ffc978`, 400 `#f4c462`, 600 `#b8862f`                                              |
| `arcane` (the cool counterweight)           | 200 `#c3e2fa`, 300 `#8cc4f2`, 500 `#3f8fd0`, 700 `#1b4a78`, 900 `#10283f`                               |
| `blood` (oxblood, crimson, sealing wax)     | 300 `#f88d84`, 500 `#c9352f`, 600 `#a3261f`, 700 `#8a1c20`, 900 `#3d0f12`                               |
| `laurel` (a quest won, a team approved)     | 300 `#a9cf82`, 500 `#5f8f3d`, 700 `#26501a`, 900 `#17290f`                                              |
| `plum` (violet in the shadows)              | 900 `#1a0e1c`, 700 `#33203a`                                                                            |

### Semantic tokens

The contract from `src/styles.css`, as set under `.theme-ember`.

| Token             | Primitive       | Value     | Use                                         |
| ----------------- | --------------- | --------- | ------------------------------------------- |
| `--canvas`        | `char-900`      | `#140c0e` | The room: dark planks beyond the light      |
| `--surface`       | `oak-800`       | `#2b1a12` | Carved oak panels                           |
| `--well`          | `char-950`      | `#0b0607` | Inputs, recesses, the core of the circle    |
| `--ink`           | `parchment-100` | `#f3e6c8` | Text on wood                                |
| `--ink-muted`     | `parchment-400` | `#c4aa80` | Secondary text on wood                      |
| `--line`          | `oak-600`       | `#5c3b24` | Decorative hairlines                        |
| `--line-strong`   | `oak-400`       | `#a57645` | Borders that carry meaning (3:1 or better)  |
| `--focus`         | `gold-200`      | `#ffdf9a` | Focus ring                                  |
| `--accent`        | `flame-500`     | `#ee8233` | Primary action, current quest, team marks   |
| `--accent-strong` | `gold-300`      | `#ffc978` | Headings, highlights, secondary button text |
| `--on-accent`     | `char-950`      | `#0b0607` | Text on ember and gold                      |
| `--accent-cool`   | `arcane-300`    | `#8cc4f2` | The cool counterpart (Lady of the Lake)     |
| `--good`          | `arcane-300`    | `#8cc4f2` | Good, with a shield                         |
| `--evil`          | `blood-300`     | `#f88d84` | Evil, with a dagger                         |
| `--success`       | `laurel-300`    | `#a9cf82` | Quest success, Approve, Ready               |
| `--fail`          | `blood-300`     | `#f88d84` | Quest fail, Reject                          |
| `--warning`       | `gold-400`      | `#f4c462` | Not ready, start blockers, "2 Fails needed" |
| `--display-font`  | Cinzel          |           | Headings, labels, names, buttons            |
| `--body-font`     | EB Garamond     |           | Sentences                                   |
| `--corner-sm`     |                 | `2px`     | Inputs, wells, tags                         |
| `--corner-md`     |                 | `4px`     | Frames and buttons                          |
| `--corner-lg`     |                 | `6px`     | Cards                                       |

Component tokens sit on top of these (also in `-theme.css`): paper
(`--paper`, `--paper-ink`, `--paper-ink-muted`, `--paper-good`,
`--paper-evil`, `--paper-success`, `--paper-fail`), frames (`--frame-outer`,
`--frame-inner`, `--frame-gilt`), the rune circle (`--rune-line`,
`--rune-line-hot`, `--rune-glow`, `--rune-size`), seats (`--seat-size`,
`--seat-metal`, `--seat-you`, `--seat-team`), wax (`--wax-ember`,
`--wax-ink`), votes (`--vote-approve`, `--vote-reject`), buttons
(`--btn-height`, `--btn-primary-*`) and motion (`--ease-out`, `--dur-fast`,
`--dur-base`, `--dur-turn`). `--seat-size` and `--rune-size` change at 1024px;
nothing else about the table layout does.

Text on parchment is dark ink, so paper has its own text tokens. `--good` and
`--evil` are light colours for dark wood and would fail on paper;
`--paper-good` and `--paper-evil` are their dark counterparts.

### Contrast

Produced by `node scripts/contrast.mjs`. Wood is textured, so text on it was
measured twice: against the flat token, and against the lightest grain streak
actually rendered (`#4c3726`, the 98th percentile of pixels sampled from a
screenshot of a frame with the text hidden). Paper was measured against its
lightest tone and its darkest stain. Rows marked "UI" are shapes, not text,
and need 3:1.

| Pair                                             | Foreground | Background | Ratio   | Result                    |
| ------------------------------------------------ | ---------- | ---------- | ------- | ------------------------- |
| ink on canvas                                    | `#f3e6c8`  | `#140c0e`  | 15.58:1 | AAA                       |
| ink on surface                                   | `#f3e6c8`  | `#2b1a12`  | 13.47:1 | AAA                       |
| ink on surface, lightest grain streak            | `#f3e6c8`  | `#4c3726`  | 9.01:1  | AAA                       |
| ink on dock                                      | `#f3e6c8`  | `#20130d`  | 14.62:1 | AAA                       |
| ink on well                                      | `#f3e6c8`  | `#0b0607`  | 16.26:1 | AAA                       |
| ink-muted on canvas                              | `#c4aa80`  | `#140c0e`  | 8.64:1  | AAA                       |
| ink-muted on canvas, candle pool                 | `#c4aa80`  | `#3b2217`  | 6.59:1  | AA                        |
| ink-muted on surface                             | `#c4aa80`  | `#2b1a12`  | 7.47:1  | AAA                       |
| ink-muted on surface, lightest grain streak      | `#c4aa80`  | `#4c3726`  | 5.00:1  | AA                        |
| ink-muted on dock, lightest                      | `#c4aa80`  | `#331f15`  | 6.98:1  | AA                        |
| ink-muted on well                                | `#c4aa80`  | `#0b0607`  | 9.02:1  | AAA                       |
| accent-strong on canvas                          | `#ffc978`  | `#140c0e`  | 12.75:1 | AAA                       |
| accent-strong on surface, lightest grain streak  | `#ffc978`  | `#4c3726`  | 7.37:1  | AAA                       |
| accent-strong on secondary button                | `#ffc978`  | `#3a2418`  | 9.60:1  | AAA                       |
| accent-strong on card back                       | `#ffc978`  | `#3d0f12`  | 10.88:1 | AAA                       |
| on-accent on primary button, top                 | `#0b0607`  | `#ffc978`  | 13.30:1 | AAA                       |
| on-accent on primary button, middle              | `#0b0607`  | `#ee8233`  | 7.55:1  | AAA                       |
| on-accent on primary button, bottom              | `#0b0607`  | `#d0661f`  | 5.37:1  | AA                        |
| ink-muted on disabled button                     | `#c4aa80`  | `#1d1114`  | 8.24:1  | AAA                       |
| ink on pressed Ready toggle                      | `#f3e6c8`  | `#3d0f12`  | 13.30:1 | AAA                       |
| good on well                                     | `#8cc4f2`  | `#0b0607`  | 10.82:1 | AAA                       |
| good on surface, lightest grain streak           | `#8cc4f2`  | `#4c3726`  | 6.00:1  | AA                        |
| evil on well                                     | `#f88d84`  | `#0b0607`  | 8.75:1  | AAA                       |
| evil on surface, lightest grain streak           | `#f88d84`  | `#4c3726`  | 4.85:1  | AA                        |
| success on canvas                                | `#a9cf82`  | `#140c0e`  | 10.96:1 | AAA                       |
| success on surface, lightest grain streak        | `#a9cf82`  | `#4c3726`  | 6.34:1  | AA                        |
| success on Approve button                        | `#a9cf82`  | `#17290f`  | 8.77:1  | AAA                       |
| fail on canvas                                   | `#f88d84`  | `#140c0e`  | 8.39:1  | AAA                       |
| fail on surface, lightest grain streak           | `#f88d84`  | `#4c3726`  | 4.85:1  | AA                        |
| fail on Reject button                            | `#f88d84`  | `#3d0f12`  | 7.16:1  | AAA                       |
| warning on dock, lightest                        | `#f4c462`  | `#331f15`  | 9.59:1  | AAA                       |
| warning on surface, lightest grain streak        | `#f4c462`  | `#4c3726`  | 6.87:1  | AA                        |
| paper-ink on paper                               | `#2a180d`  | `#ecdbb2`  | 12.42:1 | AAA                       |
| paper-ink on paper, darkest stain                | `#2a180d`  | `#cdb482`  | 8.46:1  | AAA                       |
| paper-ink-muted on paper                         | `#5a3d22`  | `#ecdbb2`  | 7.22:1  | AAA                       |
| paper-ink-muted on paper, darkest stain          | `#5a3d22`  | `#cdb482`  | 4.92:1  | AA                        |
| paper-good on paper                              | `#1b4a78`  | `#ecdbb2`  | 6.68:1  | AA                        |
| paper-good on paper, darkest stain               | `#1b4a78`  | `#cdb482`  | 4.55:1  | AA                        |
| paper-evil on paper                              | `#8a1c20`  | `#ecdbb2`  | 6.77:1  | AA                        |
| paper-evil on paper, darkest stain               | `#8a1c20`  | `#cdb482`  | 4.61:1  | AA                        |
| paper-success on paper                           | `#26501a`  | `#ecdbb2`  | 6.83:1  | AA                        |
| paper-success on paper, darkest stain            | `#26501a`  | `#cdb482`  | 4.65:1  | AA                        |
| quest token, light ink on success                | `#f3e6c8`  | `#26501a`  | 7.56:1  | AAA                       |
| quest token, light ink on fail                   | `#f3e6c8`  | `#8a1c20`  | 7.48:1  | AAA                       |
| quest token, gold on current                     | `#ffdf9a`  | `#7a3410`  | 7.00:1  | AA                        |
| quest token, muted on upcoming                   | `#c4aa80`  | `#0b0607`  | 9.02:1  | AAA                       |
| medallion monogram                               | `#ecdbb2`  | `#1d1114`  | 13.43:1 | AAA                       |
| medallion monogram, on team                      | `#ffdf9a`  | `#3d0f12`  | 12.76:1 | AAA                       |
| You tag                                          | `#0b0607`  | `#f4c462`  | 12.38:1 | AAA                       |
| seal mark on wax                                 | `#f3e6c8`  | `#a3261f`  | 5.94:1  | AA                        |
| seal mark on gold seal                           | `#0b0607`  | `#b8862f`  | 6.22:1  | AA                        |
| seal mark on ember seal                          | `#0b0607`  | `#d0661f`  | 5.37:1  | AA                        |
| seal mark on laurel seal                         | `#f3e6c8`  | `#26501a`  | 7.56:1  | AAA                       |
| seal mark on arcane seal                         | `#c3e2fa`  | `#1b4a78`  | 6.78:1  | AA                        |
| UI: line-strong on surface                       | `#a57645`  | `#2b1a12`  | 4.19:1  | AA large text and UI only |
| UI: line-strong on well                          | `#a57645`  | `#0b0607`  | 5.06:1  | AA                        |
| UI: rune line on table                           | `#f79646`  | `#2b1a12`  | 7.47:1  | AAA                       |
| UI: accent ring on canvas                        | `#ee8233`  | `#140c0e`  | 7.23:1  | AAA                       |
| UI: focus ring on canvas                         | `#ffdf9a`  | `#140c0e`  | 14.95:1 | AAA                       |
| UI: focus ring on surface, lightest grain streak | `#ffdf9a`  | `#4c3726`  | 8.65:1  | AAA                       |
| UI: focus ring (dark ink) on paper               | `#2a180d`  | `#cdb482`  | 8.46:1  | AAA                       |
| UI: switch knob, off, on well                    | `#7d5431`  | `#0b0607`  | 3.05:1  | AA large text and UI only |
| UI: Approve border on dock                       | `#5f8f3d`  | `#20130d`  | 4.73:1  | AA                        |
| UI: Reject border on dock                        | `#c9352f`  | `#20130d`  | 3.48:1  | AA large text and UI only |

No pair fails. The three rows at "AA large text and UI only" are all UI
shapes (a border, the unlit switch knob, the Reject button border).

## Fonts

| Role    | Family      | Weights used         | Licence                   |
| ------- | ----------- | -------------------- | ------------------------- |
| Display | Cinzel      | 600, 700, 800        | SIL Open Font Licence 1.1 |
| Body    | EB Garamond | 500, 600, italic 500 | SIL Open Font Licence 1.1 |

Both are variable fonts, self-hosted from Fontsource packages
(`@fontsource-variable/cinzel`, `@fontsource-variable/eb-garamond`) and
imported in `-fonts.css`, which also names them `--font-cinzel` and
`--font-garamond` on the theme wrapper. `-theme.css` wires those to
`--display-font` and `--body-font`. Nothing is fetched from a font service at
run time.

Sizes:

- Body: 18px, weight 500, line height 1.45. Helper and secondary text: 17px.
  EB Garamond is light on a dark ground, so nothing set in it is below 16px
  and regular weight (400) is never used.
- Display: wordmark 52px (phone) and 104px (desktop); screen titles 20 to
  30px; button text 15px; labels 13px with 0.16em tracking.
- Small labels (seat names, quest status, tags) are Cinzel capitals at 11 to
  13px with wide tracking. Cinzel has no lower case, so these read as small
  carved capitals. Nothing is below 11px.

Both fonts passed the legibility check in the 390px screenshots, so the
pairing from the brief was kept.

## Texture and illustration

Everything is original work created for this repo. No images, no icon
packages, no external URLs.

- **Oak planks** (`.ember-room`, `.ember-oak`, `.ember-frame`,
  `.ember-tabletop`): layered CSS gradients for plank seams and tone, over two
  inline SVG `feTurbulence` noise tiles stretched along the grain (a dark
  grain and a light grain), held in `--grain-wood` and `--grain-wood-light`.
- **Light**: a radial pool of candlelight at the top of every screen, a plum
  vignette in the corners, and a warm glow in the middle of the tabletop. All
  CSS radial gradients.
- **Frames** (`Frame`): a dark outer line, a bevel, and a thin gilt inner
  line, built from stacked inset box shadows, with a small SVG bracket in each
  corner. Radii are 2 to 6px.
- **Rune circle** (`RuneCircle`): two stacked SVGs. The outer band holds
  concentric rings, 36 tick marks and 18 glyphs; the inner sigil holds a
  triangle, its faint mirror, and three nodes. The glyphs are twelve invented
  marks made of two or three straight strokes each. A dark core in the middle
  carries text so it is never read across glowing lines.
- **Candles** (`Candle`): an SVG candle on a dish, with drips, a three-layer
  flame and a CSS halo. A snuffed candle has a curl of smoke instead.
- **Parchment** (`.ember-parchment`): a paper gradient with stains and an
  isotropic noise tile (`--grain-paper`), clipped to a slightly uneven
  24-point polygon, with a drop shadow so it sits on the table.
- **Wax seals** (`WaxSeal`): an off-round blob with a radial gradient and a
  pressed inner ring, holding an icon. Five waxes: crimson, gold, ember,
  laurel, arcane, and an empty ring for "nothing yet".
- **Medallions** (`Medallion`): a round frame for each seat with a metal
  ring, a gilt inner line, eight SVG studs, and the player's initial as a
  heraldic monogram. The ring turns gold for you and catches fire for a team
  member.
- **Cards**: the card back (`.ember-cardback`) is oxblood and plum with a
  cross-hatch and a double gilt line; the face is parchment.
- **Icons** (`art/icons.tsx`): seventeen line icons on a 24 unit grid, one
  stroke weight (1.8), coloured with `currentColor`. Shield for Good, dagger
  for Evil, check for Approve, cross for Reject, grail for Success, broken
  blade for Fail, crown for the leader, sword for the team.
- **Landing illustration** (`HeroTable`): the rune circle tilted flat with a
  CSS perspective transform, four candles and two scraps of parchment.

## Motion

| What                                | Animation                                                                                       | Duration and easing                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------- |
| Rune circle, outer band             | Slow turn of the whole SVG                                                                      | 60s linear, endless                     |
| Rune circle, inner sigil            | Counter turn                                                                                    | 90s linear, endless                     |
| Candle flame                        | Flicker (scale, tilt, opacity)                                                                  | 2.8s ease-in-out, endless               |
| Candle and rune halo                | Opacity breathing in step with the flame                                                        | 2.8s ease-in-out, endless               |
| Whatever needs you (ember pulse)    | Brightness and glow: the current quest, an enabled Start or Propose button, "Press and hold"    | 2.2s ease-in-out, endless               |
| Role card                           | Lifts 12px and turns over in 3D while held; drops and turns back on release; its shadow spreads | 420ms, `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| Buttons, seats                      | Press: 1px down and a slight scale                                                              | 180ms, same curve                       |
| Switches, medallions, inputs        | State change                                                                                    | 260ms, same curve                       |
| "Vote locked", "Card locked", tally | Rise 6px and fade in                                                                            | 260ms, same curve                       |
| Result cards                        | Dealt onto the table one after another                                                          | 420ms each, 140ms apart                 |

Reduced motion: `src/styles.css` cuts every animation and transition to almost
zero under `prefers-reduced-motion: reduce`. Every animation here starts and
ends in its resting state (entrance animations use `from` keyframes only), so
with motion off the page looks the same, just still: candles lit, circle
static, the role card swaps faces at once. Checked with Playwright's
`reducedMotion: "reduce"`: zero running animations on all nine screens.

## Privacy treatment

- The role screen opens with a notice in the tone of the direction:
  "Shield your screen. For your eyes alone. The card turns back the moment
  you let go."
- The role card lies face down on the table, showing only its back: a wax
  seal over a rune circle and "Press and hold to turn". Nothing on the back
  differs between roles or sides.
- Holding the card (finger, mouse, or Space or Enter with the card focused)
  lifts it and turns it to its parchment face: allegiance (seal, icon and
  the word Good or Evil), role name, the one-line summary, and "What you
  know" with player names. Letting go turns it face down. It also hides when
  the tab loses focus (`useHoldToReveal`).
- Allegiance is never colour alone: Good is a blue seal with a shield and the
  word; Evil is a crimson seal with a dagger and the word.
- Votes: once you choose, the dock says "Vote locked" and does not show which
  way you voted. Other seats only gain a blank wax seal ("has voted").
- Quest cards: once played, the dock says "Card locked" and does not show
  which card. Team seats gain the same blank seal. The dock says the cards
  are shuffled and nobody learns which was yours. The result shows three
  shuffled cards in the middle of the table, tied to no seat.
- The confirm counter ("2 of 7 have confirmed") is seven anonymous pips.

## How it maps to the inspiration

Closest to image 03 (the candlelit ritual table). Taken as mood: a worn
wooden table seen from above at night, a glowing circle with a triangle and
rune band as the centre of attention, candles as the only light, scraps of
paper, round framed portraits at the edge (which became the seat
medallions), and one blue accent against all the warm tones. From all three
images: firelight against cool shadow, cozy but secretive.

Deliberately not copied: the pixel-art rendering (this direction is smooth
gradients and vector lines, and pixel art belongs to Lavender Vigil), the
specific glyphs and circle layout (the glyphs are invented and the sigil is
drawn differently), the books, coins and goblets, the portrait characters,
the card art, and the red and green colour balance. No image is in the repo
or used as an asset.

It stays clear of the other two directions: no pixel fonts or hard-edged
sprite frames, and no rounded soft panels, starfields or deep blue canvas.

## What came from the ui-ux-pro-max skill

Searches run with the skill's `search.py`:

| Query (domain)                                | Result                                                                                                   | Used                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| "card board game" (product)                   | "Card & Board Game": 3D and Hyperrealism plus Flat Design; felt green, dark wood, card back patterns     | Dark wood and a patterned card back. Not the felt green.                                                                     |
| "skeuomorphic dark tactile texture" (style)   | `skeuomorphism` and `3d-and-hyperrealism`                                                                | Noise and grain overlays, multi-layer shadows, tactile press states, 300 to 500ms tactile motion, CSS perspective. No WebGL. |
| "classic serif engraved elegant" (typography) | "Classic Elegant" (Playfair Display, Inter), "Editorial Classic" (Cormorant Garamond, Libre Baskerville) | Neither. See below.                                                                                                          |
| "warm dark fantasy game" (color)              | The Card & Board Game palette: felt green with an amber accent on dark navy                              | Only the idea of an amber accent on a dark ground.                                                                           |
| "press hold gesture alternative" (ux)         | Active States (immediate press feedback), Gesture Conflicts                                              | Every control has a pressed state; the hold gesture has a keyboard alternative and does not fight scrolling.                 |
| "fixed bottom action safe area" (ux)          | Fixed Positioning (account for safe areas), Focus Appearance                                             | The dock pads for `env(safe-area-inset-bottom)`; a 2px focus ring measured at 3:1 or better.                                 |

Also followed from `references/quick-reference.md` and
`references/pro-rules.md`: 4.5:1 text contrast, visible focus, colour never
alone, reduced motion, 44px targets, no emoji as icons, one icon stroke
weight, pressed states that do not shift layout, body text of 16px or more,
real labels on inputs, status changes announced with `aria-live`.

From the design-system skill: the three-layer token architecture (primitive,
semantic, component), with components reading only semantic or component
tokens.

No database match, chosen by hand:

- The style itself. "illuminated manuscript medieval parchment" (style)
  returned nothing. Candlelit wood, parchment and wax were designed by hand,
  borrowing technique from the `skeuomorphism` entry.
- The font pairing. "medieval blackletter fantasy" (typography) returned
  nothing, and the classic serif search did not return Cinzel or EB Garamond.
  Cinzel with EB Garamond came from the brief; "Editorial Classic" is the
  nearest entry in spirit (all serif).
- The palette. No entry is a warm umber, ember and arcane blue scheme. Every
  value was picked by hand and checked with `scripts/contrast.mjs`.

Two places where the skill's advice was knowingly bent: the ember pulse
animates `filter` (the skill prefers transform and opacity only), and a table
screen has more than two ambient animations (candles, circle, pulse). Both
are slow, decorative and off under reduced motion.

## Known gaps

- **The quest hand is not hidden.** The brief asks for both cards on screen
  with Fail disabled for Good players. That disabled card, and the line
  "Good players can only play Success", tell anyone who glances over that
  you are Good. The right fix is a face-down hand that is lifted with press
  and hold, like the role card; it needs a decision on how to pick a card
  while holding.
- The role card's face is in the DOM while the card is face down (hidden by
  the 3D turn, and `aria-hidden`). A production build could render it only
  while held.
- On a 390 by 844 phone the quest step's dock is tall (two cards), so the
  nearest seat is under it until you scroll.
- Seats were checked with the seven mock players only. The ring is computed
  for any count, but 9 or 10 seats at 390px will need smaller name labels.
- Widths between 768 and 1023px get the phone layout, centred. Landscape
  phones were not checked.
- The landing form does not validate the name or code (both buttons go to
  the lobby, as the prototype requires).
- No screens yet for the Lady of the Lake, the assassination or the end of
  the game.
- Texture overlays and shadows in `-theme.css` use raw `rgb()` values with
  alpha. Colours that carry meaning are all tokens.
- `-theme.css` does not declare the cascade layer order. It comes from
  `src/styles.css`, which loads first.
