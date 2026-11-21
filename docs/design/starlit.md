# Starlit Vale

A painted storybook night: a camp on a hill above a sleeping valley, a deep blue sky full of stars, and one small warm fire where the secrets are told.

Prototype: `/design/starlit`. Motion and sound gallery: `/design/starlit/motion`. Code: `src/routes/design/starlit/`.

## Mood

Calm, wide and quiet. Most of every screen is open sky in deep blue. The only warm things are the campfire and whatever the player can act on, so amber always means "this is yours to press" or "this star is lit". Shapes are soft and round. The game's structure is drawn as constellations: seats are stars joined by fine dotted lines, the team is a brighter constellation inside the ring, and the five quests are five moons on a line.

It is the open-air direction of the three. No wood, no parchment, no pixels, no square frames.

## Palette

Blue dominant. All values live in `-theme.css` under `.theme-starlit`.

### Primitives

| Token                                     | Value                                                                 | What it is                                    |
| ----------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `--starlit-night-950 / 900 / 700 / 600`   | `#060a1c` `#0a1030` `#14215a` `#1b2d6e`                               | The sky, zenith to horizon                    |
| `--starlit-indigo-900 / 800 / 700 / 600`  | `#070b22` `#19235a` `#222e70` `#33418c`                               | Wells, panels, raised panels, hairlines       |
| `--starlit-indigo-400 / 300`              | `#7f8fdc` `#b4bce0`                                                   | Control borders, muted text                   |
| `--starlit-cream-50 / 100`                | `#fffaf0` `#f7f0dc`                                                   | Starlight: focus ring, text                   |
| `--starlit-ice-200`                       | `#bcd0ff`                                                             | Blue stars                                    |
| `--starlit-amber-300 / 400 / 500 / 950`   | `#ffd27f` `#f7b955` `#f2933a` `#2b1703`                               | Campfire: hover, action, flame, text on amber |
| `--starlit-gold-300`                      | `#ffe08a`                                                             | Warnings                                      |
| `--starlit-pink-300 / 400 / 600`          | `#f4a9c8` `#e58bb4` `#a8628f`                                         | Cloud edges and the secondary colour          |
| `--starlit-teal-300`                      | `#6fdcec`                                                             | Good                                          |
| `--starlit-coral-400`                     | `#ff8a80`                                                             | Evil, Fail, Reject                            |
| `--starlit-green-400`                     | `#86dd8f`                                                             | Success, Approve, Ready                       |
| `--starlit-vale-400` to `-950`            | `#344e9c` `#2c4592` `#233a80` `#1a2d68` `#13224f` `#0e2440` `#081a2c` | Hills, far to near                            |
| `--starlit-grass-700 / 500 / 300`         | `#1c4648` `#3d6b47` `#8aa04e`                                         | Grass in the firelight, three flat steps      |
| `--starlit-river-400`                     | `#3d5fb0`                                                             | The river in the valley                       |
| `--starlit-cloud-700 / 600 / 500 / 400`   | `#1f2b66` `#2a3877` `#3b4c93` `#5265b4`                               | Cloud bodies, dark to light                   |
| `--starlit-ink-950`                       | `#050816`                                                             | Outlines on foreground art                    |
| `--starlit-canvas-200 / 400`, `-rose-500` | `#d8d0ea` `#8f8cc0` `#c0709b`                                         | The tent: cloth, shade, stripes               |
| `--starlit-plum-800 / 600`                | `#2a1f3f` `#4a3a63`                                                   | Logs, tree trunk                              |
| `--starlit-stone-500 / 700`, `-steel-200` | `#4a5590` `#2f3a72` `#cfd8f2`                                         | Stones, the sword                             |

### Semantic tokens (the shared contract)

| Token                   | Points at              | Value                                                           |
| ----------------------- | ---------------------- | --------------------------------------------------------------- |
| `--canvas`              | `--starlit-night-900`  | `#0a1030`                                                       |
| `--surface`             | `--starlit-indigo-800` | `#19235a`                                                       |
| `--well`                | `--starlit-indigo-900` | `#070b22`                                                       |
| `--ink`                 | `--starlit-cream-100`  | `#f7f0dc`                                                       |
| `--ink-muted`           | `--starlit-indigo-300` | `#b4bce0`                                                       |
| `--line`                | `--starlit-indigo-600` | `#33418c` (hairlines and dividers only)                         |
| `--line-strong`         | `--starlit-indigo-400` | `#7f8fdc` (control borders)                                     |
| `--focus`               | `--starlit-cream-50`   | `#fffaf0`                                                       |
| `--accent`              | `--starlit-amber-400`  | `#f7b955`                                                       |
| `--accent-strong`       | `--starlit-amber-300`  | `#ffd27f`                                                       |
| `--on-accent`           | `--starlit-amber-950`  | `#2b1703`                                                       |
| `--accent-cool`         | `--starlit-pink-300`   | `#f4a9c8`                                                       |
| `--good`                | `--starlit-teal-300`   | `#6fdcec`                                                       |
| `--evil`                | `--starlit-coral-400`  | `#ff8a80`                                                       |
| `--success`             | `--starlit-green-400`  | `#86dd8f`                                                       |
| `--fail`                | `--starlit-coral-400`  | `#ff8a80`                                                       |
| `--warning`             | `--starlit-gold-300`   | `#ffe08a`                                                       |
| `--display-font`        | Fraunces               | `var(--font-fraunces), ui-serif, Georgia, serif`                |
| `--body-font`           | Nunito Sans            | `var(--font-nunito-sans), ui-sans-serif, system-ui, sans-serif` |
| `--corner-sm / md / lg` |                        | `10px` `16px` `24px`                                            |

`--accent-cool` is the pink of the cloud edges. In this direction the "cool counterpart" to the fire is a soft pink, not a blue, because blue is already the whole page. It is used for eyebrows, the "You" marker and the Lady of the Lake tag.

### Component tokens

Defined after the semantic layer and built only from it or from primitives: `--panel-bg` (the surface at 92% opacity), `--panel-border`, `--panel-highlight`, `--panel-shadow`, `--chart-bg` (the well at 90%, behind the seat ring), `--bar-bg`, `--surface-raised`, `--glow-fire`, `--glow-star`, `--button-height` (52px), `--button-radius`, `--input-height` (54px), `--seat-size`, `--seat-cell`, `--ring-height`, `--moon-size`, `--skycard-height`, `--ease-out`, `--ease-in`, `--ease-spring`, `--ease-travel`, `--dur-control` (250ms), `--dur-reveal` (420ms), `--dur-part` (560ms), `--dur-close` (280ms), and one `--art-*` token for every colour used in the illustrations. Seat, ring, moon and card sizes are overridden once at 1024px.

### Contrast

Measured with `node scripts/contrast.mjs`. "Worst case" rows are for the two see-through surfaces: the colour is the panel blended over the brightest thing that can be behind it (a cream star).

| Pair                                           | Foreground | Background | Ratio   | Result                    |
| ---------------------------------------------- | ---------- | ---------- | ------- | ------------------------- |
| ink on canvas                                  | `#f7f0dc`  | `#0a1030`  | 16.33:1 | AAA                       |
| ink on surface (panel)                         | `#f7f0dc`  | `#19235a`  | 12.91:1 | AAA                       |
| ink on panel, worst case over a star           | `#f7f0dc`  | `#2b3364`  | 10.48:1 | AAA                       |
| ink on well                                    | `#f7f0dc`  | `#070b22`  | 17.09:1 | AAA                       |
| ink on star chart, worst case                  | `#f7f0dc`  | `#1f2235`  | 13.79:1 | AAA                       |
| ink on surface-raised                          | `#f7f0dc`  | `#222e70`  | 10.90:1 | AAA                       |
| ink on sky at the horizon                      | `#f7f0dc`  | `#1b2d6e`  | 11.20:1 | AAA                       |
| ink on farthest hill (landing, wide)           | `#f7f0dc`  | `#344e9c`  | 6.79:1  | AA                        |
| ink-muted on canvas                            | `#b4bce0`  | `#0a1030`  | 9.92:1  | AAA                       |
| ink-muted on surface (panel)                   | `#b4bce0`  | `#19235a`  | 7.84:1  | AAA                       |
| ink-muted on panel, worst case                 | `#b4bce0`  | `#2b3364`  | 6.37:1  | AA                        |
| ink-muted on well                              | `#b4bce0`  | `#070b22`  | 10.38:1 | AAA                       |
| ink-muted on star chart, worst case            | `#b4bce0`  | `#1f2235`  | 8.38:1  | AAA                       |
| ink-muted on sky at the horizon                | `#b4bce0`  | `#1b2d6e`  | 6.81:1  | AA                        |
| on-accent on accent (primary button, lit seat) | `#2b1703`  | `#f7b955`  | 9.80:1  | AAA                       |
| on-accent on accent-strong (hover)             | `#2b1703`  | `#ffd27f`  | 12.05:1 | AAA                       |
| on-accent on success (won quest moon)          | `#2b1703`  | `#86dd8f`  | 10.40:1 | AAA                       |
| accent on surface                              | `#f7b955`  | `#19235a`  | 8.41:1  | AAA                       |
| accent on panel, worst case                    | `#f7b955`  | `#2b3364`  | 6.83:1  | AA                        |
| accent on well                                 | `#f7b955`  | `#070b22`  | 11.13:1 | AAA                       |
| accent-cool on canvas (eyebrow)                | `#f4a9c8`  | `#0a1030`  | 10.05:1 | AAA                       |
| accent-cool on sky at the horizon              | `#f4a9c8`  | `#1b2d6e`  | 6.89:1  | AA                        |
| accent-cool on surface                         | `#f4a9c8`  | `#19235a`  | 7.94:1  | AAA                       |
| accent-cool on panel, worst case               | `#f4a9c8`  | `#2b3364`  | 6.45:1  | AA                        |
| accent-cool on well (seat tags)                | `#f4a9c8`  | `#070b22`  | 10.51:1 | AAA                       |
| good on surface                                | `#6fdcec`  | `#19235a`  | 9.18:1  | AAA                       |
| good on panel, worst case                      | `#6fdcec`  | `#2b3364`  | 7.46:1  | AAA                       |
| good on well                                   | `#6fdcec`  | `#070b22`  | 12.15:1 | AAA                       |
| evil / fail on surface                         | `#ff8a80`  | `#19235a`  | 6.44:1  | AA                        |
| evil / fail on panel, worst case               | `#ff8a80`  | `#2b3364`  | 5.23:1  | AA                        |
| evil / fail on well                            | `#ff8a80`  | `#070b22`  | 8.52:1  | AAA                       |
| evil / fail on star chart, worst case          | `#ff8a80`  | `#1f2235`  | 6.87:1  | AA                        |
| success on surface                             | `#86dd8f`  | `#19235a`  | 8.92:1  | AAA                       |
| success on panel, worst case                   | `#86dd8f`  | `#2b3364`  | 7.24:1  | AAA                       |
| success on well                                | `#86dd8f`  | `#070b22`  | 11.81:1 | AAA                       |
| success on canvas (sticky bar)                 | `#86dd8f`  | `#0a1030`  | 11.29:1 | AAA                       |
| warning on surface                             | `#ffe08a`  | `#19235a`  | 11.39:1 | AAA                       |
| warning on panel, worst case                   | `#ffe08a`  | `#2b3364`  | 9.25:1  | AAA                       |
| warning on canvas (sticky bar icon)            | `#ffe08a`  | `#0a1030`  | 14.41:1 | AAA                       |
| ink on Approve button                          | `#f7f0dc`  | `#283d61`  | 9.56:1  | AAA                       |
| ink on Approve button, hover                   | `#f7f0dc`  | `#355368`  | 7.13:1  | AAA                       |
| ink on Reject button                           | `#f7f0dc`  | `#39315f`  | 10.37:1 | AAA                       |
| ink on Reject button, hover                    | `#f7f0dc`  | `#553e64`  | 8.17:1  | AAA                       |
| ink on pressed Ready button                    | `#f7f0dc`  | `#2a4162`  | 9.09:1  | AAA                       |
| UI: line-strong on surface                     | `#7f8fdc`  | `#19235a`  | 4.80:1  | AA                        |
| UI: line-strong on well (inputs, switch)       | `#7f8fdc`  | `#070b22`  | 6.36:1  | AA                        |
| UI: line-strong on canvas                      | `#7f8fdc`  | `#0a1030`  | 6.08:1  | AA                        |
| UI: line-strong on panel, worst case           | `#7f8fdc`  | `#2b3364`  | 3.90:1  | AA large text and UI only |
| UI: success border on surface                  | `#86dd8f`  | `#19235a`  | 8.92:1  | AAA                       |
| UI: fail border on surface                     | `#ff8a80`  | `#19235a`  | 6.44:1  | AA                        |
| UI: switch thumb (ink-muted) on well           | `#b4bce0`  | `#070b22`  | 10.38:1 | AAA                       |
| UI: switch thumb (on-accent) on accent         | `#2b1703`  | `#f7b955`  | 9.80:1  | AAA                       |
| UI: accent ring on well (current moon)         | `#ffd27f`  | `#070b22`  | 13.68:1 | AAA                       |
| UI: focus ring on canvas                       | `#fffaf0`  | `#0a1030`  | 17.87:1 | AAA                       |
| UI: focus ring on surface                      | `#fffaf0`  | `#19235a`  | 14.12:1 | AAA                       |

Every text pair is at least 4.5:1 and every UI pair at least 3:1. `--line` (`#33418c` on the surface, 1.59:1) is deliberately faint: it only draws dashed dividers and panel hairlines, never the edge of a control and never anything that carries meaning.

Colour is never the only signal:

| Meaning            | Shape or icon                                      | Text                                                    |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------- |
| Good / Evil        | Shield / dagger                                    | "Good" / "Evil"                                         |
| Approve / Reject   | Tick in a circle / cross in a diamond              | "Approve" / "Reject"                                    |
| Success / Fail     | Sun / cracked moon                                 | "Success" / "Fail"                                      |
| On the team        | The star gains four rays and a solid fill          | "Chosen" while picking, and the team is listed in words |
| Leader             | A crown above the star                             | "Leader"                                                |
| Quest won / lost   | Filled moon with a tick / ringed moon with a cross | "Success" / "Failed"                                    |
| Rejected team      | A round pip becomes a four-point star              | "Rejected 1 of 5"                                       |
| Ready / not / away | Tick / dashed ring / crescent moon                 | "Ready" / "Not ready" / "Away"                          |
| Switch on / off    | Thumb position and a star in the thumb             | "On" / "Off"                                            |

## Fonts

| Role    | Family      | Weights used                  | Used for                                                                            |
| ------- | ----------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| Display | Fraunces    | 500, 600 (variable)           | Wordmark, headings, the room code, numbers in stars and moons, vote and card labels |
| Body    | Nunito Sans | 400, 600, 700, 800 (variable) | Everything else                                                                     |

Both are under the SIL Open Font License 1.1. They are variable fonts, self-hosted from Fontsource packages (`@fontsource-variable/fraunces`, the `full.css` cut with the weight, optical size, `SOFT` and `WONK` axes; `@fontsource-variable/nunito-sans`, the weight axis). `-fonts.css` imports them and names them `--font-fraunces` and `--font-nunito-sans` on the wrapper. `-theme.css` wires those to `--display-font` and `--body-font`. Fraunces is set with `"SOFT" 100, "WONK" 0`: the fully soft cut, without the leaning "wonky" letters, with optical sizing on. Both families were legible in every screenshot at both widths, so the pairing from the brief was kept.

Sizes: wordmark `clamp(68px, 19vw, 152px)`; room code `clamp(52px, 15vw, 76px)`; page titles 30 to 32px (phone) and 40 to 48px (wide); panel titles 22 to 24px; body 16 to 17px with line height 1.4 to 1.6; buttons 17px. The only text under 16px is short labels at 13px, always at weight 700 or 800: eyebrows, chips, the tags and status under a seat, the captions under a quest moon on a phone, and the On / Off word under a switch.

## Texture and illustration

Flat, cel-shaded vector art: solid fills in two or three steps of one colour, no blur, no photographic texture, and a fine dark outline on foreground objects only. All of it is original work created for this repo (inline SVG and CSS, no image files, no icon package), so it is covered by the repo's licence.

| Piece                      | Where                                                        | How it is made                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sky                        | Every screen (`art/night-sky.tsx`)                           | A fixed layer: a CSS gradient from near-black blue to indigo, plus an SVG of 430 stars placed by a seeded generator (`art/seeded.ts`, mulberry32), so the server and the browser draw the same sky. Four star colours, three sizes, a few four-point sparkles.                                                                                                                                                                                                         |
| Horizon                    | Every screen, along the bottom                               | One SVG: three hills in receding blues, wisps of cloud with pink undersides, seeded village lights, and a far-off tent and fire.                                                                                                                                                                                                                                                                                                                                       |
| Camp scene                 | Landing (`art/camp-scene.tsx`)                               | One SVG, 1440 by 700: crescent moon with a halo, clouds, four ranges of hills, a castle on a ridge, a river, village lights, a striped pavilion with a scalloped valance and a pennant, a banner, crossed spears with two shields, log seats, a sword in a stone, the campfire, and a large tree framing the right edge. The firelight on the grass is three flat ellipses, not a blur. The important parts sit in the right-hand 60%, which is what a phone crops to. |
| Campfire                   | Landing and the middle of the seat ring (`art/campfire.tsx`) | Stones, two crossed logs, three flat flames, four sparks, and a radial gradient for the glow (the one soft edge in the artwork, because it is light).                                                                                                                                                                                                                                                                                                                  |
| Clouds                     | Landing, horizon, role card (`art/cloud.tsx`)                | Round lobes drawn in three passes (lighter copies nudged up, pink copies nudged down, the body on top), which leaves a thin light rim on top and a pink rim underneath.                                                                                                                                                                                                                                                                                                |
| Role constellations        | Role card (`art/constellation.tsx`)                          | Star points and lines per role: the Sage's Hat for Merlin, the Dagger for the Assassin, and a Shield or a Thorn for roles without their own figure yet.                                                                                                                                                                                                                                                                                                                |
| Icons                      | Everywhere (`icons.tsx`)                                     | 18 icons on a 24px grid with 1.9px round strokes, coloured by `currentColor`.                                                                                                                                                                                                                                                                                                                                                                                          |
| Panels                     | Everywhere                                                   | CSS only: the surface at 92% opacity, a 1px border, a 1px inner highlight, 24px corners. No backdrop blur.                                                                                                                                                                                                                                                                                                                                                             |
| Seat stars and quest moons | Table                                                        | CSS discs. A lit star gets four rays from a `clip-path` behind the disc.                                                                                                                                                                                                                                                                                                                                                                                               |

Glow is reserved for light sources: the fire, the moon, a lit star, the current quest moon, the primary button (it is firelight) and the role card while it is held open.

## Motion

Motion in the vale has one job: say what just happened, whose turn it is, or that the game is waiting on someone. Decoration lives only in the sky. Every moment can be watched, replayed and read about in the gallery at `/design/starlit/motion`, grouped by stage of the game.

### Rules

- Only `transform` (and the single `translate`, `scale` and `rotate` properties), `opacity` and SVG stroke are animated. No layout property moves. CSS keyframes and transitions only; no animation library.
- An element's normal style is its end state. Keyframes describe where it comes from, so anything skipped, at rest or under reduced motion simply shows the end. Things that leave (a "Voted" chip turning over, a card back) are hidden in their normal style.
- Sequences are timed by custom properties set from the components (`--at`, `--turn-at`, `--settle-at`, `--score-at`, `--crown-at`), and the quest result's numbers live in one file (`table/result-timeline.ts`), so sound and motion read the same clock. Cues are scheduled on the audio clock, not with timers.
- Small responses take 150 to 300ms, reveals 400 to 700ms, a sequence under 3 seconds. The quest result (2.95s) can be skipped with one tap anywhere on the table; in the gallery any moment over 1.2s can be skipped by tapping the scene or its Skip button.
- Motion never blocks input. State changes at once; animation follows it. The vote, the card and the propose button all change state on the tap, and the animation plays over the new state.
- Exits are quicker than entrances: the clouds close in half the time they take to part.
- Apart from the campfire in the middle of the ring, the only loops on the table are the slow turning ring on a seat that is still to vote or play, and the reconnecting stars. Both mean "waiting".

### Tokens and curves

`-theme.css` holds the motion tokens; `-motion.css` holds the classes and keyframes.

| Token           | Value                               | Used for                                             |
| --------------- | ----------------------------------- | ---------------------------------------------------- |
| `--ease-out`    | `cubic-bezier(0.22, 1, 0.36, 1)`    | Things arriving: rises, rings opening, lines growing |
| `--ease-in`     | `cubic-bezier(0.55, 0, 1, 0.45)`    | Things leaving: chips turning away, clouds closing   |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Small pops with a hair of overshoot: labels, crown   |
| `--ease-travel` | `cubic-bezier(0.4, 0, 0.2, 1)`      | Things that travel: clouds parting, crown, eclipse   |
| `--dur-control` | 250ms                               | Controls and small responses                         |
| `--dur-reveal`  | 420ms                               | Fades of state (a seat going away)                   |
| `--dur-part`    | 560ms                               | Clouds parting                                       |
| `--dur-close`   | 280ms                               | Clouds closing                                       |

### Moments

"Wired" says whether the moment plays in the click-through or only in the gallery. Every row has a static end state under reduced motion: `src/styles.css` cuts durations to almost nothing, and `-theme.css` also zeroes every delay inside `.theme-starlit`, so a timed sequence lands on its end at once (sound may still play).

| Stage        | Moment                     | What moves                                                                                                                    | Duration                                                             | Easing              | Cue                                                     | Wired                                       | Reduced motion                              |
| ------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------- | ------------------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| Landing      | The living sky             | One star in five twinkles, clouds drift, fire breathes and flickers, sparks rise, pennant stirs, a shooting star now and then | Loops of 0.9 to 7.5s; clouds 110 and 160s; shooting star 1.1s        | ease-in-out         | `shooting-star` (gallery)                               | Yes (loops)                                 | Loops off; sparks and shooting star removed |
| Landing      | The title arriving         | Eyebrow rises, the word rises and fades in, the line and the form follow, a star lights above the last letter                 | 250ms; 900ms from 120ms; 360ms; 520ms; star 520ms at 880ms           | ease-out, spring    | `title` (gallery only: no gesture yet on a first visit) | Yes                                         | Title, line and star shown at once          |
| Landing      | A button press             | Button sinks 2%; a ring of firelight tightens while held, opens back to the edge and fades on release                         | Press 60ms, release 450ms                                            | ease-out            | `tap` (Continue buttons)                                | Yes, every primary                          | Ring appears and goes without travel        |
| Lobby        | A player joins             | An empty dashed seat becomes a star, one ring opens round it, the count pops                                                  | Star 420ms, ring 640ms                                               | spring, ease-out    | `join` (climbs a D major chord)                         | Gallery                                     | Full table shown                            |
| Lobby        | Ready, away and back       | The new state pops in where the old one was (ring to tick, Ready to Away with a moon)                                         | 250ms                                                                | spring              | `ready`, `unready`, `away`, `back`                      | Yes (your ready)                            | New state shown                             |
| Lobby        | The code copied            | A wave runs through the four letters; the copy icon pops into a tick                                                          | 440ms a letter, 55ms apart; tick 250ms                               | ease-out, spring    | `copy`                                                  | Yes                                         | "Copied" shown                              |
| Lobby        | Everyone ready             | Stars link up round the ring (gallery); the stars by each name flare in turn (lobby); status line rises; Start wakes          | Lines 380ms, 70ms apart; flare 520 to 640ms, 70ms apart; bloom 900ms | ease-out            | `all-ready`                                             | Yes                                         | Linked and ready, no bloom                  |
| Lobby        | The game starting          | The lobby gives way and the clouded role card rises into place                                                                | Card 600ms after 80ms                                                | ease-out            | `start`                                                 | Yes                                         | Card in place                               |
| Role         | The clouds part            | Two banks of cloud slide apart, three layers at different speeds, then thin; the rim warms; the role rises                    | 560ms (fade starts at 196ms); role 250ms after 90ms                  | travel, ease-out    | `clouds-part`, `constellation`                          | Yes                                         | Opens at once                               |
| Role         | The constellation          | Lines draw one after another, each star lights as a line reaches it, the bright star last with its glow                       | Line 240ms, 120ms apart from 160ms; star 320ms; bright 640ms         | ease-out, spring    | `constellation`                                         | Yes                                         | Whole figure shown                          |
| Role         | Letting go                 | The role is removed at once; the clouds close                                                                                 | 280ms                                                                | ease-in             | `clouds-close`                                          | Yes                                         | Closes at once                              |
| Role         | Confirming                 | Button blooms, your pip turns from a ring into a star, the count pops                                                         | Pip 520ms, count 250ms                                               | spring              | `confirm`                                               | Sound only (the link moves on)              | Star shown                                  |
| Role         | Everyone confirmed         | The last pips light in turn, the row swells once, the line rises                                                              | 220ms apart; swell 520ms; about 1.6s                                 | spring, ease-out    | `vote-in` each, `all-confirmed`                         | Gallery                                     | All lit                                     |
| Proposal     | The crown arrives          | The crown drops onto the leader's star and settles                                                                            | 600ms after 200ms                                                    | spring              | `crown`                                                 | Yes (step opens)                            | Crown in place                              |
| Proposal     | Picking a seat             | Star fills, four rays turn out, one ring flares, a line grows from the star lit before, "Chosen" pops                         | 250ms; ring 560ms; line 420ms; label 250ms                           | ease-out, spring    | `pick` (one step higher each pick)                      | Yes                                         | Lit, lines drawn                            |
| Proposal     | Unpicking                  | Rays fold back, fill fades, its lines go                                                                                      | 250ms                                                                | ease-out            | `unpick`                                                | Yes                                         | Unlit                                       |
| Proposal     | The team complete          | Last line closes the shape, count pops, Propose wakes with one bloom                                                          | Line 420ms; bloom 900ms from 120ms                                   | ease-out            | `pick` then `team-complete`                             | Yes                                         | Complete, no bloom                          |
| Proposal     | Proposing                  | Button blooms; the team's stars flare and lines redraw as the vote step opens                                                 | 450ms; 420 to 560ms                                                  | ease-out            | `propose`                                               | Yes                                         | Shown at once                               |
| Vote         | Locking your vote          | Choices give way to the locked line, which rises; the shackle drops shut; your seat pops to Voted                             | Rise 250ms; shackle 340ms after 120ms                                | ease-out, spring    | `vote-lock` (+ 14ms buzz)                               | Yes                                         | Locked line shown                           |
| Vote         | Votes arriving             | Each seat's dashed ring pops into a tick and "Voted"; the count pops                                                          | 250ms each                                                           | spring              | `vote-in`                                               | Gallery (pops wired)                        | All voted                                   |
| Vote         | The wait                   | Only seats still to vote move: their dashed ring turns and breathes                                                           | One turn in 9s, one breath in 2.4s, looping                          | linear, ease-in-out | None                                                    | Yes                                         | Still                                       |
| Reveal       | Approved                   | A held breath (each "Voted" swells once), then every chip turns over at the same instant, then the tally rises                | Breath 700ms; turn 160ms out, 240ms in; tally at 1.0s; done 1.3s     | ease-in, ease-out   | `suspense`, `votes-turn`, `approved`                    | Yes (step opens)                            | Votes and tally shown                       |
| Reveal       | Rejected                   | The same turn, then the rejected-team pip spins into a star and the crown flies on                                            | Pip 520ms at 1.45s; crown 620ms from 1.75s                           | spring, travel      | `rejected`, `track-advance`, `crown-pass`               | Gallery (the mock vote is approved)         | End shown                                   |
| Quest cards  | The cards arriving         | Success and Fail slide up with a slight turn, one after the other                                                             | 380ms each, 90ms apart                                               | ease-out            | `deal`                                                  | Yes (step opens)                            | Cards in place                              |
| Quest cards  | Playing a card             | Both cards turn face down together, merge into one, which rises toward the fire and fades; the locked line rises              | 820ms; line at 520ms                                                 | ease-out            | `card-play` (+ 16ms buzz)                               | Yes                                         | Locked line shown, no cards                 |
| Quest cards  | The others' cards          | A face-down card drops onto the pile by the fire for each player who has played; the count pops                               | 520ms each                                                           | ease-out            | `card-in`                                               | Gallery                                     | Pile shown                                  |
| Quest result | Shuffled and turned        | Face-down cards slide over each other, turn one at a time; the last lifts and waits (the held breath) before it turns         | Shuffle 520ms; turns at 0.6, 0.95 and 1.7s; outcome at 2.05s         | ease-out, ease-in   | `shuffle`, `card-success` / `card-fail`, `quest-fail`   | Yes (step opens, tap skips)                 | Faces and outcome shown                     |
| Quest result | Success / fail on the moon | The quest's moon grows into its outcome with one ring of light, the badge pops, its words fade in, the next moon brightens    | 560ms; ring 760ms; badge after 260ms; next at 420ms                  | spring, ease-out    | `quest-success` / `quest-fail`                          | Yes                                         | Outcome shown                               |
| Quest result | The score                  | The old number rolls up and away, the new one rolls in                                                                        | 260ms out, 340ms in                                                  | ease-in, spring     | `score`                                                 | Yes                                         | New score                                   |
| Quest result | The crown passes           | The crown lifts, arcs over and lands on the next seat clockwise                                                               | 620ms (at 2.35s in the result)                                       | travel              | `crown-pass`                                            | Yes                                         | Crown on the new leader                     |
| End of game  | The Assassin choosing      | A dashed coral ring moves from Good seat to Good seat, then snaps solid on the one named                                      | 320ms moves about 450ms apart; strike 420ms                          | ease-out, spring    | `assassin-aim`, `assassin-strike`                       | Gallery (no screen yet)                     | Ring on the named seat                      |
| End of game  | Good wins                  | First light rises from the horizon, stars pale, a few falling stars, the verdict rises                                        | Dawn 1.8s; stars 1.6s; falling stars 1.1s each; title at 1.2s        | ease-out, ease-in   | `good-wins`                                             | Gallery                                     | Dawn and title shown                        |
| End of game  | Evil wins                  | Stars go out one by one, a shadow slides over the moon, a coral ring burns round it, the verdict rises                        | Stars 600ms, 14ms apart; eclipse 1.1s; ring at 1.2s; title at 1.3s   | ease-in, travel     | `evil-wins`                                             | Gallery                                     | Eclipse and title shown                     |
| Connection   | Away, and back             | The seat's star dims and its edge turns dashed, "Away" with a moon pops in; on return it brightens                            | 420ms fade; label 250ms                                              | ease-out, spring    | `away`, `back`                                          | Seat ring supports it; mock has nobody away | Shown at once                               |
| Connection   | Reconnecting               | Table dims, a banner drops in with three stars pulsing in turn; on return it turns to a tick and the table brightens          | Banner 320ms; pulses 1.2s, 200ms apart (loop); fade 420ms            | ease-out            | `reconnected` on return only                            | Gallery                                     | Banner, no pulse                            |

### Privacy in the motion

- The face-down and face-up role card look and sound the same for every role. `clouds-part` and `constellation` are identical for Merlin and the Assassin.
- Approve and Reject lock with the same motion and the same `vote-lock` sound and buzz.
- Playing a card moves both cards the same way (both turn face down and merge into one before it rises), and `card-play` is the same for both. The motion does not show which card was played.
- Card backs in the quest result are one neutral design and colour; the face is only drawn as it turns.
- A quest's words ("Failed", the fail count) fade in with its moon, so the side panel does not give the result away while the cards are still turning.

### Reduced motion

`src/styles.css` cuts every animation and transition to almost nothing. `-theme.css` adds two things inside `.theme-starlit`: every animation and transition delay is set to zero (the sequences are timed with delays, which `src/styles.css` leaves alone), and the decorative loops are switched off or removed. Because every element's normal style is its end state, each screen and each gallery scene shows its final state at once. The gallery's timed scenes (counts, players joining) also jump to their last step under reduced motion. Sound still plays if it is switched on. This was checked: with reduced motion emulated, no finite animation is still running 400ms after any Starlit screen opens, and every gallery scene matches its resting end state 200ms after Play.

## Sound

Every sound is made in code with the Web Audio API (`src/client/sound/`), so there are no audio files, nothing to license and no new dependency. The folder does not import from `src/routes` or `src/design`, so the real game can keep it.

**Sound was checked by measurement, not by ear.** Nobody who built or tested it could listen. Each cue was rendered in Chromium through an `OfflineAudioContext` with the same output stage the page uses, and its length, peak level and audibility were measured. The levels and the character described below are design intent backed by those numbers; they need a listen on real phones.

### Design

- **One key:** D major pentatonic (D, E, F#, A, B). Any notes from it sound fine together, so cues can overlap. Good outcomes climb and land on D, bright; Evil outcomes fall and land on B (the relative minor, same five notes), with the top rolled off.
- **Instruments** (`synth.ts`): a music box (a sine with two short, quiet partials), a harp (two triangles a few cents apart through a closing low-pass filter, with a soft sine an octave down), a pad (pairs of detuned sines, slow in and out), breaths of band-passed noise (cloud, paper, air), a soft low knock, and a sliding sine. Attacks are 4 to 8ms so nothing clicks; decays are exponential and long.
- **Level:** a master gain of 0.7 into a compressor set as a gentle limiter (threshold -10dB, ratio 12:1, 2ms attack). The loudest single cue peaks at 0.27 (-11.5 dBFS); four copies of any cue at once stay under 0.8.
- **Voices:** at most 8 cues sound at once; the oldest fades out in 50ms to make room. The same cue asked for twice within 40ms plays once.
- **Off until switched on.** Sound starts off on every device, because browsers block audio before a tap and ten phones in one room should not all start chiming. The choice is stored in `localStorage` (`avalon:sound`), and every storage access is guarded. The `AudioContext` is created on demand and only after the page has had a gesture (`navigator.userActivation`), and resumed on the first tap. On the server, or in a browser without Web Audio, every call does nothing and never throws.
- **The switch** is on every Starlit screen: a small pill labelled "Sound" with On or Off and a speaker icon, `aria-pressed`. On a phone it sits just under the prototype bar beside each screen's eyebrow; from 640px wide it sits in the empty right end of the bar. It comes after the page in the DOM, so the page's own controls come first by keyboard and in tests. The gallery has its own Sound and Campfire ambience switches at the top.
- **Buzz:** `vote-lock` (14ms) and `card-play` (16ms) also call `navigator.vibrate`, guarded, and only when sound is on. It works on Android. iPhones have no Vibration API, so on an iPhone nothing happens.

### API

```
play(cue, { delay?, index? })   one cue; returns { stop() }
setEnabled(on) / isEnabled()     the remembered preference
useSoundToggle()                 { enabled, setEnabled, toggle } for a switch
useAmbience(on)                  the fire and night bed while on and shown
renderCue(context, out, cue, at, index)  any BaseAudioContext, for offline renders
createMasterChain(context)       the same output stage, for offline renders
```

`CueName` is a union of the 46 names below. Effects that play cues stop them in their clean-up, so a sound never outlives the screen that started it.

### Ambience

A campfire and a very quiet night, off unless the gallery's Campfire ambience switch is on (and Sound is on). It fades in over 2.5s and out over 1.2s.

- **Crackle:** an 11.7s buffer of seeded pops, single snaps and small clusters, through a band-pass at 2.4kHz. Pops that run past the end are written round to the start, so the loop has no seam.
- **Roar:** low-passed noise at 240Hz with a slow swell (0.13Hz).
- **Night bed:** sines on D3, A3 and D4 at very low level, each breathing at its own slow rate, through a low-pass; and a breath of wind (band-passed noise whose centre wanders). Oscillators never loop, so there is nothing to hear repeat.

Measured over a 30s offline render: peak 0.117, steady level (RMS) 0.007 to 0.016. At the loop points (7.3s and 11.7s) the largest sample-to-sample step is 0.0011, the same size as the steps around it (0.0003 to 0.0007): no click.

### Cues

Length is the scheduled length; peak is the measured peak of one cue rendered alone through the output stage (1.0 is full scale). Every cue was audible (above 0.001) from its start, and none was silent.

| Cue               | When it plays                            | What it sounds like                                                                        | Length | Peak  |
| ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ | ------ | ----- |
| `tap`             | A Continue button                        | One small high harp pluck                                                                  | 0.30s  | 0.045 |
| `toggle-on`       | A switch turned on                       | Two music-box notes stepping up                                                            | 0.36s  | 0.121 |
| `toggle-off`      | A switch turned off                      | Two duller notes stepping down                                                             | 0.36s  | 0.087 |
| `sound-on`        | Sound switched on                        | Three quick music-box notes rising                                                         | 0.42s  | 0.113 |
| `copy`            | Room code copied                         | Two bright high notes                                                                      | 0.36s  | 0.105 |
| `ready`           | You mark yourself ready                  | Two harp notes up                                                                          | 0.40s  | 0.128 |
| `unready`         | You take it back                         | One low, muted harp note                                                                   | 0.30s  | 0.052 |
| `pick`            | The leader lights a seat                 | A harp note, one step higher for each pick                                                 | 0.40s  | 0.061 |
| `unpick`          | The leader unlights a seat               | One low, muted harp note                                                                   | 0.30s  | 0.045 |
| `vote-in`         | Someone else's vote (or confirm) arrives | A tiny tick of paper and a soft muted note, the same for everyone                          | 0.22s  | 0.033 |
| `deal`            | Quest cards arrive in your hand          | Two soft paper flicks                                                                      | 0.26s  | 0.044 |
| `card-in`         | Another player's card lands on the pile  | A flick and a soft knock                                                                   | 0.26s  | 0.045 |
| `score`           | A side's score goes up                   | One high chime                                                                             | 0.36s  | 0.033 |
| `assassin-aim`    | The Assassin's mark moves to a seat      | A low muted pluck                                                                          | 0.26s  | 0.044 |
| `join`            | A player joins the lobby                 | One music-box note with a long tail; seat n plays the n-th note of a stacked D major chord | 1.75s  | 0.062 |
| `away`            | A player's phone goes to sleep           | Two harp notes falling to B                                                                | 0.70s  | 0.105 |
| `back`            | They come back                           | Two harp notes rising to D                                                                 | 0.60s  | 0.123 |
| `reconnected`     | Your own connection returns              | Three harp notes rising to A                                                               | 0.62s  | 0.162 |
| `all-ready`       | The last blocker clears in the lobby     | Five chimes rolled up a D major chord over a soft pad                                      | 1.85s  | 0.176 |
| `start`           | The host starts the game                 | A low pad swells under a breath of air, then a harp climbs four notes                      | 2.45s  | 0.196 |
| `title`           | The title arriving (gallery)             | Three soft notes rising, D, A, D                                                           | 1.45s  | 0.119 |
| `shooting-star`   | A shooting star (gallery)                | A faint falling whistle with a little air                                                  | 0.80s  | 0.032 |
| `clouds-part`     | The role card opens                      | A soft rising breath of air (the same for every role)                                      | 0.66s  | 0.044 |
| `constellation`   | The constellation draws                  | Five quiet chimes climbing, then one brighter note (the same for every role)               | 1.90s  | 0.090 |
| `clouds-close`    | The role card closes                     | A short falling breath                                                                     | 0.36s  | 0.062 |
| `confirm`         | "I have seen my role"                    | Two warm harp notes, A then D                                                              | 0.45s  | 0.142 |
| `all-confirmed`   | Everyone has seen their role (gallery)   | Four chimes rolled upward                                                                  | 1.40s  | 0.148 |
| `crown`           | The proposal step opens                  | Two high chimes with a glint of air                                                        | 0.66s  | 0.106 |
| `team-complete`   | The last seat of the team is lit         | Three chimes together, D, F#, A: a resolved chord                                          | 1.05s  | 0.168 |
| `propose`         | Propose team                             | A soft upward slide and a bright chime                                                     | 0.76s  | 0.092 |
| `vote-lock`       | You vote (either way)                    | A soft low knock and one chime; the same for Approve and Reject                            | 0.45s  | 0.084 |
| `suspense`        | The votes-revealed step opens            | A low dark swell, like a held breath                                                       | 0.86s  | 0.081 |
| `votes-turn`      | Every vote turns over                    | A flick and seven harp notes rolled in 140ms                                               | 0.62s  | 0.107 |
| `approved`        | The team is approved                     | Chimes climbing to D over a soft major pad                                                 | 1.42s  | 0.134 |
| `rejected`        | The team is rejected                     | Harp notes falling to B over a dark pad                                                    | 1.42s  | 0.169 |
| `track-advance`   | The rejected-team track moves on         | A dark low note and a knock                                                                | 0.60s  | 0.063 |
| `card-play`       | You play a quest card (either card)      | A flick, a breath of air and a soft knock as it lands; the same for both                   | 0.80s  | 0.104 |
| `shuffle`         | The quest's cards are shuffled           | Five quick paper flicks                                                                    | 0.50s  | 0.040 |
| `card-success`    | A Success card turns over                | A flick and a bright high harp note                                                        | 0.62s  | 0.094 |
| `card-fail`       | A Fail card turns over                   | A flick, a dark low harp note and a knock                                                  | 0.62s  | 0.131 |
| `quest-success`   | A quest succeeds                         | Chimes rising to D over a warm open chord, a shimmer of air                                | 2.60s  | 0.167 |
| `quest-fail`      | A quest fails                            | Harp notes falling to B over a dark chord, a low knock                                     | 2.60s  | 0.220 |
| `crown-pass`      | The crown moves to the next leader       | A soft upward slide and a chime                                                            | 0.76s  | 0.076 |
| `assassin-strike` | The Assassin names a player (gallery)    | A swish, a dark note, a low knock and a dark pad                                           | 1.45s  | 0.189 |
| `good-wins`       | Good wins (gallery)                      | A slow swell and seven chimes climbing to a high D                                         | 2.95s  | 0.225 |
| `evil-wins`       | Evil wins (gallery)                      | A dark B minor pad, harp notes falling to B, one low knock                                 | 2.95s  | 0.267 |

UI cues (the first fourteen) are under 0.42s; the longest stinger is under 3s. The offline renders were repeated with four copies of each cue stacked at once (the worst case of several seats triggering the same cue): the highest peak was 0.744 (`evil-wins`), still under 1.0.

## Privacy treatment

The idea: the role is written in the stars, and the sky is clouded over.

- The role screen opens with a notice ("Keep this screen to yourself. Look only when no one else can see.") and a card that is a patch of sky under two banks of cloud, with one instruction on it: "Press and hold to part the clouds".
- While the card is held (finger, mouse, or Space / Enter), the clouds slide apart, the card gains a warm rim, and the role appears: its constellation, the role name, Good or Evil with a shield or dagger, the one-line summary, and what the role knows with names ("These players are Evil: Tobias and Kay. Mordred is in this game and stays hidden from you.").
- On release the content is removed at once (it is not just covered: the elements are unmounted) and the clouds close over 280ms (twice as fast as they part). It also hides when the tab loses focus, through the shared `useHoldToReveal` hook.
- The card is sized so the whole revealed role fits on a 390 by 844 phone without scrolling, because you cannot scroll while holding.
- The face-down and face-up states use the same cloud colours for Good and Evil, so a glance at a closed card says nothing.
- Quest cards: after playing, the screen only says "Your card is played and locked." It does not keep or show which card it was. The copy says the cards are shuffled and nobody learns which was yours.
- Votes: before the reveal, seats only show "Voted" or "Waiting". Your own locked vote is shown on your own screen.

## How it maps to the inspiration

Closest to image 02 (the starry night camp). Taken from it: a deep blue sky dense with small stars of different sizes and tints, clouds with pink-lit undersides, hills fading into blue distance with tiny lights in the valley, a big dark tree framing one side, flat cel-shaded colour with fine outlines, and one pool of warm firelight on the grass.

Deliberately not copied: the composition is mirrored and redrawn from scratch (tree on the right, camp below it, valley to the left); there is no van, luggage, folding chair or any modern object. In their place is a medieval camp: a striped pavilion with a pennant, a banner, shields on crossed spears, a castle on the ridge and a sword in a stone. The hatched ink shading of the reference is replaced by flat two-tone shapes, and a crescent moon was added. No pixel of the image is used and it is not in the repo.

From the common thread of all three images: night, warm firelight against cool blue, cosy but secretive.

## What came from the ui-ux-pro-max skill

Searches were run with the skill's `scripts/search.py`, and its `quick-reference.md` and `pro-rules.md` were read.

Used:

- **Product match "Card & Board Game"**: recommends "3D & Hyperrealism + Flat Design" with Dark Mode (OLED) as a secondary style. The Flat Design half was taken (flat fills, simple shapes, clean lines). Its palette advice (felt green and dark wood) was not: wood belongs to another direction.
- **Style "Dark Mode (OLED)"** (returned for the night-sky query): midnight blue base, glow used sparingly, text contrast of 7:1 or more where possible. Followed: every ink pair is above 10:1 and most coloured text is above 7:1.
- **Style "Aurora UI"** (night-sky gradients): depth by layering colour, and slow ambient loops. Used loosely for the sky gradient and the slow loops; its mesh gradients and saturation were not used.
- **Font pairing "Soft Rounded"** (Varela Round + Nunito Sans, "soft, friendly, warm"): supports Nunito Sans as the body face. The `google-fonts` data confirmed Fraunces has the `SOFT`, `WONK` and `opsz` axes.
- **Colour results "Alarm & World Clock" and "Weather App"**: both pair a dark navy with amber, which supports the blue-plus-amber scheme. The actual values were picked by hand.
- **UX guidelines**: fixed bars must respect safe areas (the sticky bar pads with `env(safe-area-inset-bottom)`), reduced motion, press feedback on every control, no gesture-only actions (the hold has a keyboard equivalent).
- **Quick reference rules** applied throughout: 4.5:1 contrast, visible focus, colour-not-only, 44px touch targets with 8px or more between them, visible labels and helper text on inputs, `aria-live` for status changes, one primary action per screen, `min-h-dvh`, no decorative blur, 16px body text, semantic colour tokens.
- **Pro rules**: one icon family with one stroke width, no emoji, pressed states that do not shift layout.
- **design-system skill**: the three-layer token structure (primitive, semantic, component).

No database match, chosen by hand:

- A storybook or painted-illustration style. The query "storybook illustration night sky flat vector" returned only Dark Mode (OLED), Flat Design and Neubrutalism.
- The Fraunces + Nunito Sans pairing (a search for Fraunces in the pairing data returned nothing).
- The constellation motif, the moon quest track, the cloud-covered role card and all artwork.
- A press-and-hold privacy pattern. The nearest results were about press feedback and drag alternatives.
- All colour values.

For the motion and sound pass, the skill's `quick-reference.md` animation rules were read and `--domain ux` searches were run for motion timing and easing, reduced motion, and sound and haptic feedback. Taken from it:

- **`motion-meaning`**: every animation answers what happened, whose turn it is, or what we are waiting on. This is the test each moment in the gallery is captioned against.
- **`easing`** (decelerate on arrival, accelerate on leaving, linear for constant rotation): `--ease-out` for arrivals, `--ease-in` for chips turning away and clouds closing, linear for the slow turning "waiting" ring.
- **`exit-faster-than-enter`**: the clouds close in 280ms against 560ms to part. Here it also serves privacy.
- **`transform-performance`** and **`layout-shift-avoid`**: only transform, opacity and SVG stroke move; the Assassin's mark travels with `translate` in container units, not `left` and `top`.
- **`no-blocking-animation`** and **`interruptible`**: state changes on the tap; long sequences can be skipped with a tap.
- **`stagger-sequence`**: staggers of 55 to 120ms (code letters, constellation lines, lobby stars, quest cards).
- **`scale-feedback`**: the 2% press on buttons, kept from before.
- **Reduced motion** (High severity in the ux data): every moment has a static end state, and delays are zeroed as well as durations.
- **Continuous animation** ("infinite animations only for loading indicators"): on the table the only loops are the waiting ring and the reconnecting stars, both of which are waiting indicators.
- **Haptic feedback** ("confirmations and important actions, do not overuse"): a buzz on vote lock and card play only.
- **`duration-timing`** says not to treat 150 to 300ms as universal; the brief's ranges were used as a guide and the reveals take what they need (the quest result 2.95s, skippable).

Not taken: **`spring-physics`** (real springs need a library or WAAPI maths; a single overshoot curve, `--ease-spring`, is used for small pops instead). **`excessive-motion`** ("1 or 2 key elements per view") is followed on each functional moment, but the ending vignettes and the result sequence move several things in a planned order, because the sequence is the point.

One place the skill's advice was not followed in the original direction: "animate one or two key elements per view". The sky has many small ambient animations. They are slow, low-contrast, opacity or transform only, and off under reduced motion; the functional motion on each screen is still one thing at a time.

## Tweak studio

`/design/studio` puts every token of the theme on a dial and previews the real
prototype screens live, at phone (390 by 844) and wide (1440 by 900) width, in
iframes. It exists so the owner can refine Starlit by hand and hand the result
to Claude. Code: `src/design/tweaks/`.

- **What it dials.** All of the tokens in `.theme-starlit`, read from the
  live stylesheet, so there is no second copy of the defaults: every palette
  primitive, the semantic layer (each one picks a primitive from a swatch grid
  or takes a custom colour), the art colours, motion curves and durations,
  shapes, and the table layout with separate phone and wide values. On top of
  that it adds OKLCH hue, chroma and lightness shifts for the whole palette and
  for each colour family, the sky drawing (star count, pattern, twinkle ratio,
  village lights), and the root type scale.
- **Artwork versions.** The tent (striped pavilion, bell tent, ridge tent,
  none), the campfire (crossed logs, log tipi, cauldron, iron brazier) and
  the castle (small keep, fairytale spires, ruin, walled fortress, none) each
  have versions, all original inline SVG on the art tokens. The first of
  each is the original drawing and the default. `/design/starlit/artwork` is
  a contact sheet of every version; choosing one there or in the studio's
  Artwork section applies it everywhere through `SceneArtContext`
  (`-components/art/scene-context.tsx`), including the fire in the seat ring
  and the motion gallery.
- **Backdrops.** Four whole-scene alternatives to the vale, in
  `-components/art/backdrops.tsx`: Moonlit lake (the castle on an island,
  reflected, with the moon laid across the water), Clifftop by the sea (a
  headland camp, the castle on the far cliffs, sea stacks), Standing stones (a
  clearing walled in by pines, a trilithon behind the fire, fireflies) and
  Mountain pass (snowy peaks, the castle on a crag with a bridge and a
  waterfall). Each one draws the chosen tent, campfire and castle, placed by
  `backdrop-layout.ts`. They keep the vale's rules: same palette tokens, open
  sky for the star field, landmarks right of x 760 (clear of the title and
  form at 1440, inside the phone's crop at 390), and dark ground along the
  bottom edge. Only the landing and the motion gallery's arrival scene draw a
  backdrop; the seat ring and the other motion scenes pick up the fire alone.
- **3D landing heroes.** Three WebGL concepts built with three.js, picked as
  "Landing hero" (the drawn scene stays the default): Ember Isle (the camp on
  a floating island above a sea of cloud, a waterfall spilling into the void,
  the castle on a second island, circling stones), Lantern Lake (a mirror lake
  with a true reflection, paper lanterns rising off the water, an aurora, the
  castle lit on the far shore) and The Star Table (a round stone table for ten
  in a clearing, seat runes lighting one by one, a moonbeam, a turning dome of
  constellations). Code is in `-components/three`: `engine.ts` (renderer,
  bloom, pointer parallax, pausing off-screen, a still frame under reduced
  motion, rebuilding when a dial changes the colours), `kit.ts` and `props.ts`
  (sky, stars, flame, embers, pine, pavilion, castle, campfire) and one file
  per scene. Every colour is read from the `--art-*` tokens at runtime, so the
  palette and the studio's dials apply. three.js is about 143 KB gzip, in a
  chunk loaded only when a 3D hero is chosen, and never in the Worker. On a
  wide screen the camera's film offset slides the subject right of the title.
  Thumbnails on the artwork page draw one frame, keep it as an image and free
  the GPU. Not yet checked on a real phone or Safari: frame rate and battery
  there are the open question.
- **Tuning tokens.** Values that were hardcoded are now tokens at their old
  values, in the "Tuning dials" block of `-theme.css`: Fraunces SOFT and
  WONK, display, eyebrow, button and label weights and tracking, panel
  opacity, highlight and border, fire and star glow, sky gradient stops,
  star and cloud visibility, horizon height, and every ambient animation
  duration with one `--ambient-tempo` multiplier. With no dial set, the
  phone screenshots match the old ones pixel for pixel; the wide ones differ
  only by the new "Tweak studio" link in the prototype nav.
- **How it applies.** The dial lives in `localStorage`. The Starlit layout
  turns it into a `<style>` with a doubled `.theme-starlit` selector, and
  passes the sky options to `NightSky`. A token with a wide value gets its
  phone override only below 1024px. The server always renders the plain theme.
- **Checks.** A live WCAG table for the text pairs the design relies on.
  `src/design/tweaks/tweaks.test.ts` fails if the shipped theme or a
  proposed dial drops below its target.
- **Working with Claude.** Write notes on the dial and on single tokens
  ("warmer, but not orange"), then use Share: "Copy brief for Claude" gives
  Markdown with the notes, every change, contrast failures and the JSON to
  reload it. A share link (`?tweaks=...`) opens any Starlit screen with the
  dial applied, on any device, phones included. Claude proposes dials by
  adding them to `src/design/tweaks/presets.ts`; they appear under
  "Proposed by Claude". "Copy CSS diff" is the patch for `-theme.css` once
  a dial is final.
- **Phase 0.** When the tokens move to `:root`, change `THEME_SELECTOR` in
  `src/design/tweaks/catalog.ts` and the selector in the test's parser.

## Known gaps

- Built and looked at with the 7-player mock only. The seat layout is computed for 5 to 10 seats, but other counts have not been viewed. At 10 players on a phone a seat cell is about 70px wide, which will be tight for long names.
- Screens not designed yet: Lady of the Lake, assassination, game over, the table as seen by someone who is not the leader or not on the team, a rejected vote, and error or reconnecting states.
- The disabled Fail card with "Good players can only play Success" (required by the brief) tells anyone looking over a shoulder that the player is Good. The real game should think about this, for example by keeping both cards behind a hold.
- In the prototype the role text is passed to the card as React children, so it is in the page payload even while hidden. In the real game it should come from the private socket message and only be kept in memory.
- On a 1440 by 900 window the quest-card and quest-result steps are 945px and 923px tall, so they scroll slightly. The other table steps, the lobby, the role screen and the landing fit exactly.
- On a phone the vote history is a long list under the table. It probably wants to be a sheet or a collapsed section.
- Bright sparkle stars in the fixed sky can pass behind a page title while scrolling. They are a few pixels wide and titles stay readable, but text that must be guaranteed sits on a panel.
- With three start blockers at once (someone away, someone not ready, too many Evil roles) the sticky bar in the lobby is about 190px tall on a phone. It still works, but a long list of reasons should probably collapse to the first one plus "and 2 more".
- Sound was checked by measurement only (length, peak, not silent, no clicks at loop points), never by ear. The mix between cues, and how they sound on a phone speaker, needs a listen.
- Motion was checked in headless Chromium (video and still frames). Not yet on a real phone, in Safari, or on a slow device: the result sequence animates about twenty elements at once.
- The gallery's lobby, end-of-game and reconnecting scenes are new vignettes; the real screens for the assassination, the end of the game and a lost connection do not exist yet.
- A page's entrance replays every time it is opened. That is intended for the prototype; the real game should animate on changes in the room view, not on page open.
- The ambience is in the gallery only. The click-through has no fire crackle.
- The Assassin's mark and the crown use container query units (`cqw`, `cqh`) on the seat ring. They are supported in current browsers but not in old ones (Safari before 16).
- Checked in Chromium through Playwright only. Not yet checked on a real phone, in Safari, with the on-screen keyboard open over the sticky bar, or with a screen reader.
- The sky is about 430 SVG circles with around 90 animating opacity. It was smooth on a laptop; it has not been profiled on a low-end phone.
