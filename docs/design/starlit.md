# Starlit Vale

A painted storybook night: a camp on a hill above a sleeping valley, a deep blue sky full of stars, and one small warm fire where the secrets are told.

Prototype: `/design/starlit`. Code: `src/app/design/starlit/`.

## Mood

Calm, wide and quiet. Most of every screen is open sky in deep blue. The only warm things are the campfire and whatever the player can act on, so amber always means "this is yours to press" or "this star is lit". Shapes are soft and round. The game's structure is drawn as constellations: seats are stars joined by fine dotted lines, the team is a brighter constellation inside the ring, and the five quests are five moons on a line.

It is the open-air direction of the three. No wood, no parchment, no pixels, no square frames.

## Palette

Blue dominant. All values live in `theme.css` under `.theme-starlit`.

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

Defined after the semantic layer and built only from it or from primitives: `--panel-bg` (the surface at 92% opacity), `--panel-border`, `--panel-highlight`, `--panel-shadow`, `--chart-bg` (the well at 90%, behind the seat ring), `--bar-bg`, `--surface-raised`, `--glow-fire`, `--glow-star`, `--button-height` (52px), `--button-radius`, `--input-height` (54px), `--seat-size`, `--seat-cell`, `--ring-height`, `--moon-size`, `--skycard-height`, `--ease-out`, `--dur-control` (250ms), `--dur-reveal` (420ms), and one `--art-*` token for every colour used in the illustrations. Seat, ring, moon and card sizes are overridden once at 1024px.

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

Both are on Google Fonts under the SIL Open Font License 1.1. They load in `layout.tsx` with `next/font/google` as variable fonts (`Fraunces` with the `SOFT`, `WONK` and `opsz` axes; `Nunito_Sans` with its default axes), `display: "swap"`, Latin subset, and are exposed as `--font-fraunces` and `--font-nunito-sans` on the wrapper. `theme.css` wires those to `--display-font` and `--body-font`. Fraunces is set with `"SOFT" 100, "WONK" 0`: the fully soft cut, without the leaning "wonky" letters, with optical sizing on. Both families were legible in every screenshot at both widths, so the pairing from the brief was kept.

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

Controls use one curve and one duration: 250ms `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out) on colour, border, shadow and a 2% press scale.

| Animation           | Where                                                                                            | Duration and easing                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Twinkle             | About one star in five, each with its own duration and a negative delay so they are out of phase | 3 to 7.5s, ease-in-out, opacity only, loops                            |
| Shooting star       | Sky, upper right                                                                                 | 19s cycle, visible for about 1.1s of it, ease-out                      |
| Cloud drift         | Landing and horizon clouds                                                                       | 110s and 160s, ease-in-out, 46px there and back                        |
| Fire glow breathing | Landing, ring, horizon                                                                           | 3.4s, ease-in-out, alternating                                         |
| Flame flicker       | Three flames, two tempos                                                                         | 1.3s and 0.9s, ease-in-out, alternating                                |
| Sparks              | Four, staggered                                                                                  | 3.2s, ease-out, loops                                                  |
| Pennant             | Tent                                                                                             | 4.5s, ease-in-out, alternating                                         |
| Star lights up      | A seat joining the team                                                                          | 250ms ease-out: rays scale and turn in, disc fills                     |
| Clouds part         | Role card on press                                                                               | 420ms ease-out, the two banks slide apart and fade                     |
| Role appears        | Role card content                                                                                | 250ms rise and fade after 90ms; constellation lines draw in over 700ms |
| Cards turn up       | Quest result                                                                                     | 250ms rise and fade, 120ms apart                                       |
| Tally appears       | Votes revealed                                                                                   | 250ms rise and fade                                                    |

Reduced motion: `globals.css` cuts every animation and transition to nothing. On top of that, `theme.css` switches the looping animations off outright (`animation: none`) and removes the shooting star and the sparks. Every keyframe animation is written so the element's normal style is its resting state (entrance animations only define `from`), so nothing is left invisible or half-way. All screenshots for this spec were checked with reduced motion on, and the click-through was run with it off.

## Privacy treatment

The idea: the role is written in the stars, and the sky is clouded over.

- The role screen opens with a notice ("Keep this screen to yourself. Look only when no one else can see.") and a card that is a patch of sky under two banks of cloud, with one instruction on it: "Press and hold to part the clouds".
- While the card is held (finger, mouse, or Space / Enter), the clouds slide apart, the card gains a warm rim, and the role appears: its constellation, the role name, Good or Evil with a shield or dagger, the one-line summary, and what the role knows with names ("These players are Evil: Tobias and Kay. Mordred is in this game and stays hidden from you.").
- On release the content is removed at once (it is not just covered: the elements are unmounted) and the clouds close over 420ms. It also hides when the tab loses focus, through the shared `useHoldToReveal` hook.
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

One place the skill's advice was not followed: "animate one or two key elements per view". The sky has many small ambient animations. They are slow, low-contrast, opacity or transform only, and off under reduced motion; the functional motion on each screen is still one thing at a time.

## Known gaps

- Built and looked at with the 7-player mock only. The seat layout is computed for 5 to 10 seats, but other counts have not been viewed. At 10 players on a phone a seat cell is about 70px wide, which will be tight for long names.
- Screens not designed yet: Lady of the Lake, assassination, game over, the table as seen by someone who is not the leader or not on the team, a rejected vote, and error or reconnecting states.
- The disabled Fail card with "Good players can only play Success" (required by the brief) tells anyone looking over a shoulder that the player is Good. The real game should think about this, for example by keeping both cards behind a hold.
- In the prototype the role text is passed to the card as React children, so it is in the page payload even while hidden. In the real game it should come from the private socket message and only be kept in memory.
- On a 1440 by 900 window the quest-card and quest-result steps are 945px and 923px tall, so they scroll slightly. The other table steps, the lobby, the role screen and the landing fit exactly.
- On a phone the vote history is a long list under the table. It probably wants to be a sheet or a collapsed section.
- Bright sparkle stars in the fixed sky can pass behind a page title while scrolling. They are a few pixels wide and titles stay readable, but text that must be guaranteed sits on a panel.
- With three start blockers at once (someone away, someone not ready, too many Evil roles) the sticky bar in the lobby is about 190px tall on a phone. It still works, but a long list of reasons should probably collapse to the first one plus "and 2 more".
- Checked in Chromium through Playwright only. Not yet checked on a real phone, in Safari, with the on-screen keyboard open over the sticky bar, or with a screen reader.
- The sky is about 430 SVG circles with around 90 animating opacity. It was smooth on a laptop; it has not been profiled on a low-end phone.
