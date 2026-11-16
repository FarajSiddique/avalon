# Lavender Vigil

A cozy 16-bit role-playing game: the knights have made camp in a lavender field at dusk, and one of them is a traitor.

Route: `/design/lavender`. Code: `src/app/design/lavender/`.

## Mood

Dusk, not midnight. A violet sky banded down to a pink and orange horizon, a castle with lit windows, and one small fire that every screen comes back to. The interface is the menu system of a game cartridge: speech boxes with name plates, chunky stepped frames, buttons that drop a pixel when pressed, a cursor that blinks when it is your turn. Friendly on the surface, with one knight whose visor glints red every few seconds.

It does not use smooth gradients, blur, rounded corners or serif type. Those belong to the other two directions.

## Palette

Violet dominant, flat colours only. 20 primitives: 16 carry the interface, and 4 (`ember-700`, `steel-500`, `crimson-600`, `pine-700`) appear only as shading inside the artwork and on button lips.

### Primitives

| Token                    | Value     | Used for                                                    |
| ------------------------ | --------- | ----------------------------------------------------------- |
| `--lavender-plum-950`    | `#140c1f` | Wells, sprite outlines, hard shadows                        |
| `--lavender-plum-900`    | `#1e1330` | Canvas, the top of the sky                                  |
| `--lavender-plum-800`    | `#2a1b42` | Panels and speech boxes                                     |
| `--lavender-plum-700`    | `#3b2760` | Raised surfaces, quiet dividers, far hills                  |
| `--lavender-heather-600` | `#5a3f8f` | The lavender field, mid sky                                 |
| `--lavender-heather-500` | `#8363c2` | Frames around panels and controls                           |
| `--lavender-heather-400` | `#a184d9` | Lavender flowers, stones                                    |
| `--lavender-heather-300` | `#c6b2ee` | Muted text, flower tips, the tent                           |
| `--lavender-cream-100`   | `#f8efd8` | Text (moon cream), the moon, speech-box frames              |
| `--lavender-fire-500`    | `#f28b3c` | Campfire orange: primary actions, the team marker           |
| `--lavender-fire-300`    | `#ffd36b` | Flame yellow: focus ring, "now", warnings, castle windows   |
| `--lavender-ember-900`   | `#2b1408` | Text on orange, green and crimson                           |
| `--lavender-ember-700`   | `#74401f` | Logs, firelit earth, the shaded lip of the primary button   |
| `--lavender-steel-300`   | `#a9c8f5` | Good: moonlit armour                                        |
| `--lavender-steel-500`   | `#5d83c0` | Armour in shadow                                            |
| `--lavender-crimson-400` | `#f6788a` | Evil, Fail, Reject                                          |
| `--lavender-crimson-600` | `#b5304a` | The base of the flame, the castle banner, Reject button lip |
| `--lavender-pine-400`    | `#74d49a` | Success, Approve, Ready                                     |
| `--lavender-pine-700`    | `#1f4a40` | Pine trees, the grass of the clearing, Approve button lip   |
| `--lavender-pink-400`    | `#f29bb0` | The sunset band on the horizon                              |

### Semantic tokens

| Token             | Points at                                         | Value     |
| ----------------- | ------------------------------------------------- | --------- |
| `--canvas`        | `--lavender-plum-900`                             | `#1e1330` |
| `--surface`       | `--lavender-plum-800`                             | `#2a1b42` |
| `--well`          | `--lavender-plum-950`                             | `#140c1f` |
| `--ink`           | `--lavender-cream-100`                            | `#f8efd8` |
| `--ink-muted`     | `--lavender-heather-300`                          | `#c6b2ee` |
| `--line`          | `--lavender-plum-700`                             | `#3b2760` |
| `--line-strong`   | `--lavender-heather-500`                          | `#8363c2` |
| `--focus`         | `--lavender-fire-300`                             | `#ffd36b` |
| `--accent`        | `--lavender-fire-500`                             | `#f28b3c` |
| `--accent-strong` | `--lavender-fire-300`                             | `#ffd36b` |
| `--on-accent`     | `--lavender-ember-900`                            | `#2b1408` |
| `--accent-cool`   | `--lavender-steel-300`                            | `#a9c8f5` |
| `--good`          | `--lavender-steel-300`                            | `#a9c8f5` |
| `--evil`          | `--lavender-crimson-400`                          | `#f6788a` |
| `--success`       | `--lavender-pine-400`                             | `#74d49a` |
| `--fail`          | `--lavender-crimson-400`                          | `#f6788a` |
| `--warning`       | `--lavender-fire-300`                             | `#ffd36b` |
| `--display-font`  | Press Start 2P, then `"Courier New"`, `monospace` |           |
| `--body-font`     | VT323, then `"Courier New"`, `monospace`          |           |
| `--corner-sm`     | `0px`                                             |           |
| `--corner-md`     | `0px`                                             |           |
| `--corner-lg`     | `0px`                                             |           |

`--line` is a quiet divider inside panels and is decorative (1.38:1 on the canvas). Anything that marks the edge of a control uses `--line-strong` or brighter.

### Component tokens

All in `theme.css`, third layer. The ones that shape the direction:

- `--px`: one art pixel. 3px on phones and tablets, 4px from 1024px. Every sprite, frame, drop shadow and press offset is a whole multiple of it, so pixels stay square and the same size across a screen.
- `--frame-color`, `--frame-outline`, `--frame-drop`: the three colours of the stepped frame.
- `--button-*`: face, text, top highlight and bottom lip for the plain, primary, approve and reject buttons.
- `--seat-*`, `--track-*`: seat and quest-tile faces and frames.
- `--art-*`: every colour a sprite or scene uses (armour, flame, sky bands, field, pines, castle). Sprites never read primitives.
- `--plume-1` to `--plume-7` (each with a `-tip`): the seat colours. Crimson and steel are never plumes, because they mean Evil and Good.
- `--tick`, `--fire-loop`, `--blink-loop`, `--twinkle-loop`: motion timings.

### Contrast

Measured with `node scripts/contrast.mjs`. Every text and UI pair that appears on a screen:

| Pair                                             | Foreground | Background | Ratio   | Result                    |
| ------------------------------------------------ | ---------- | ---------- | ------- | ------------------------- |
| ink on canvas                                    | `#f8efd8`  | `#1e1330`  | 15.39:1 | AAA                       |
| ink on surface                                   | `#f8efd8`  | `#2a1b42`  | 13.74:1 | AAA                       |
| ink on surface-raised                            | `#f8efd8`  | `#3b2760`  | 11.14:1 | AAA                       |
| ink on well                                      | `#f8efd8`  | `#140c1f`  | 16.63:1 | AAA                       |
| ink-muted on canvas                              | `#c6b2ee`  | `#1e1330`  | 9.24:1  | AAA                       |
| ink-muted on surface                             | `#c6b2ee`  | `#2a1b42`  | 8.25:1  | AAA                       |
| ink-muted on surface-raised                      | `#c6b2ee`  | `#3b2760`  | 6.69:1  | AA                        |
| ink-muted on well                                | `#c6b2ee`  | `#140c1f`  | 9.98:1  | AAA                       |
| placeholder (ink-muted at 70%) on well           | `#9180b0`  | `#140c1f`  | 5.37:1  | AA                        |
| on-accent on accent (primary button, You tag)    | `#2b1408`  | `#f28b3c`  | 7.07:1  | AAA                       |
| on-accent on success (Approve, won quest tile)   | `#2b1408`  | `#74d49a`  | 9.64:1  | AAA                       |
| on-accent on fail (Reject, lost quest tile)      | `#2b1408`  | `#f6788a`  | 6.61:1  | AA                        |
| canvas on ink (name plate, tags)                 | `#1e1330`  | `#f8efd8`  | 15.39:1 | AAA                       |
| accent on surface-raised (Picked)                | `#f28b3c`  | `#3b2760`  | 5.19:1  | AA                        |
| accent on surface                                | `#f28b3c`  | `#2a1b42`  | 6.40:1  | AA                        |
| accent on canvas                                 | `#f28b3c`  | `#1e1330`  | 7.16:1  | AAA                       |
| accent-strong on well (room code, current quest) | `#ffd36b`  | `#140c1f`  | 13.41:1 | AAA                       |
| accent-strong on surface (On, Now, warnings)     | `#ffd36b`  | `#2a1b42`  | 11.08:1 | AAA                       |
| accent-strong on canvas (warnings)               | `#ffd36b`  | `#1e1330`  | 12.41:1 | AAA                       |
| success on canvas                                | `#74d49a`  | `#1e1330`  | 9.76:1  | AAA                       |
| success on surface                               | `#74d49a`  | `#2a1b42`  | 8.72:1  | AAA                       |
| success on surface-raised                        | `#74d49a`  | `#3b2760`  | 7.07:1  | AAA                       |
| success on well                                  | `#74d49a`  | `#140c1f`  | 10.55:1 | AAA                       |
| evil and fail on canvas                          | `#f6788a`  | `#1e1330`  | 6.69:1  | AA                        |
| evil and fail on surface                         | `#f6788a`  | `#2a1b42`  | 5.98:1  | AA                        |
| evil and fail on surface-raised                  | `#f6788a`  | `#3b2760`  | 4.85:1  | AA                        |
| evil and fail on well                            | `#f6788a`  | `#140c1f`  | 7.23:1  | AAA                       |
| good on canvas                                   | `#a9c8f5`  | `#1e1330`  | 10.30:1 | AAA                       |
| good on surface                                  | `#a9c8f5`  | `#2a1b42`  | 9.20:1  | AAA                       |
| UI: line-strong frame on canvas                  | `#8363c2`  | `#1e1330`  | 3.80:1  | AA large text and UI only |
| UI: line-strong frame on surface                 | `#8363c2`  | `#2a1b42`  | 3.40:1  | AA large text and UI only |
| UI: line-strong frame on well                    | `#8363c2`  | `#140c1f`  | 4.11:1  | AA large text and UI only |
| UI: focus ring on canvas                         | `#ffd36b`  | `#1e1330`  | 12.41:1 | AAA                       |
| UI: focus ring on surface                        | `#ffd36b`  | `#2a1b42`  | 11.08:1 | AAA                       |
| UI: accent frame on canvas                       | `#f28b3c`  | `#1e1330`  | 7.16:1  | AAA                       |
| UI: switch knob (ink-muted) on well              | `#c6b2ee`  | `#140c1f`  | 9.98:1  | AAA                       |
| UI: switch knob on (accent-strong) on ember-700  | `#ffd36b`  | `#74401f`  | 5.92:1  | AA                        |
| UI: ink frame on canvas                          | `#f8efd8`  | `#1e1330`  | 15.39:1 | AAA                       |

The landing tagline sits on the top three sky bands, which are the canvas, surface and surface-raised colours, so the first three rows cover it. `line-strong` is only ever a frame, never text.

## Fonts

| Role    | Family         | Weight | Sizes                                                                                                     | Licence |
| ------- | -------------- | ------ | --------------------------------------------------------------------------------------------------------- | ------- |
| Display | Press Start 2P | 400    | Wordmark 40px (72px wide screen), titles 24px (32px), headings 16px, buttons 14px, labels 12px, tags 10px | OFL 1.1 |
| Body    | VT323          | 400    | Body 22px, secondary 20px, names 22 to 24px, inputs 24px. Never below 20px.                               | OFL 1.1 |

Both load in `layout.tsx` with `next/font/google` (`subsets: ["latin"]`, `display: "swap"`), are exposed as `--font-lavender-display` and `--font-lavender-body` on the wrapper, and are wired to `--display-font` and `--body-font` in `theme.css`.

What was tried, in 390px-wide screenshots on the plum canvas:

- **Press Start 2P + VT323** (the skill's "Pixel Retro" pairing). Press Start 2P is very wide, so it is kept to short lines: the wordmark, headings, button labels and uppercase labels. VT323 at 16px is too small to read (small x-height), comfortable at 22px, and its digits are unmistakable.
- **Pixelify Sans** for display and for body. Rejected: its digits are ambiguous at interface sizes. "2 of 7" reads as "8 of 1" and the G in the room code "KNGT" reads as a 6. This game is full of counts and codes.
- **Silkscreen** for display. Capitals only and wider still than Press Start 2P. No gain.
- **Jersey 10, 15 and 20** for body. Very readable and heavier than VT323, but 15 and 20 render as a smooth condensed sans at body sizes and stop looking like pixels.

Chosen: Press Start 2P for display, VT323 at 22px for body.

## Texture and illustration

All artwork is original work created for this repo (the repo's licence applies). Nothing is traced or copied from the inspiration images, and they are not in the repo.

How each piece is made:

- **Sprites** (`_components/pixel/sprites.ts`): arrays of strings with a colour key, one character per art pixel. `PixelSprite` turns one into an inline SVG with `shape-rendering: crispEdges`, sized `calc(var(--px) * columns)`. This covers the knight's helm (the mascot and every seat's avatar, recoloured by plume), the seated knight's body, three campfire frames, the logs and stones, the big star, the grail and skull on the quest cards, and 18 one-colour icons that take `currentColor`.
- **The pixel raster** (`pixel-canvas.ts`): a small grid you paint rectangles and sprites onto, which then emits one SVG path per colour. Everything larger than a sprite is drawn by code onto this raster.
- **The dusk scene** (`dusk-scene.tsx`): banded sky with one early scanline of the next colour at each band (a banded stand-in for a blend), seeded stars, cloud streaks, a crescent moon cut from two discs, far hills, a castle built from towers, parapets and stepped spires with lit windows and a banner, pines in three-row tiers, a lavender field drawn as rows that grow taller towards the viewer, a clearing with a tent, three seated knights and the fire, and two rows of dark bushes that break the lower edge into the page. Three layouts share the code: a phone scene (256 by 168 art pixels), a wide scene (480 by 216, used from 768px) and a low strip of hills (640 by 48) along the foot of the wide lobby and role screens.
- **The great helm** on the face-down role card (`great-helm.tsx`): drawn by code at the screen's own pixel size, 36 by 44 art pixels, not an enlarged copy of the small helm.
- **The clearing** on the wide table screen (`camp-ground.tsx`): a stepped ellipse of grass with the fire in the middle; the seven seats are placed around it.
- **Stepped frames** (`.lv-frame` in `theme.css`): 17 hard box-shadows, no blur. One pixel of frame colour in a plus shape (which notches the corners), one pixel of dark outline, then the outline again one pixel lower as a drop shadow.
- **Speech boxes** (`DialogBox`): a cream frame with a name plate sitting on the top edge, as in a role-playing game.
- **Dither** (`.lv-dither`, `.lv-card-back`, disabled buttons): a checker made with a hard-stop `conic-gradient`, one or two art pixels per square. This is the only gradient function used, and it has no soft stops.

## Motion

Everything uses `steps()`. Nothing eases and nothing fades.

| Animation           | Where                                                | Duration and timing                                   |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Campfire            | Landing scene, wide table                            | 3 frames, 480ms loop, `steps(1, end)` (160ms a frame) |
| Sparks              | Above the fire                                       | 1920ms loop, 3 positions then gone, `steps(1, end)`   |
| Twinkling stars     | Scenes                                               | 2400ms loop, off for 15% of it, staggered by 410ms    |
| The traitor's glint | Third knight on the landing                          | 6400ms loop, red visor for about 500ms                |
| Blinking cursor     | "Create a room", the current quest in the side panel | 1000ms loop, on half, off half                        |
| Bobbing arrow       | Current quest tile, "Hold to peek"                   | 640ms loop, one art pixel down and back               |
| Press               | Buttons, seats, cards, the role card                 | Instant: one art pixel down, drop shadow removed      |
| Card pop            | The three result cards                               | 320ms, `steps(2, end)`, staggered by 160ms            |

Reduced motion: `globals.css` cuts every animation to a single 0.01ms run. Each animated element's base style is its resting frame, so nothing is left broken: the first flame frame stays, sparks and the glint stay hidden, stars stay lit, the cursor stays visible, arrows stay still, cards sit in place. Checked with `prefers-reduced-motion: reduce` emulated: no running animations.

## Privacy treatment

- **The role card is a closed visor.** Face down it shows a checkered card back, a great helm with its visor shut, and a small box: "Hold to peek. Keep it hidden." A speech box above it says "For your eyes only: shield your screen. The card shows only while you hold it."
- **Holding opens it** (`useHoldToReveal`): role name, alignment as a shape plus a word (shield and "Good", horned mask and "Evil"), the one-line summary, and what the role knows with names and helms. Merlin sees "Tobias and Kay are Evil" and the note that Mordred stays hidden from him. The Assassin sees "Kay and Bram are Evil too".
- **Letting go closes it at once**, as does the tab losing focus. The secret text is only in the page while it is shown. Keyboard users hold Space or Enter. A polite live region reads the role to screen readers while it is held.
- **The quest card.** After you play, the bar says "Card played and locked" without naming the card. A second hold control, "Hold to check your card", shows which one you played while held.
- **Votes** show as a sealed-letter icon and the word "Voted" until all are in. Nothing on a seat hints at the choice.
- Seat plumes never use crimson or steel, so an avatar's colour can never be read as an alignment.

## How it maps to the inspiration

Closest to image 01 (the knight by a campfire in a lavender field).

Qualities kept: the dusk palette (violet sky, pink horizon, cream moon), warm firelight as the single accent against cool violet, a castle with lit windows on a hill, pine silhouettes, a field in three violet tones, and the feeling of resting between battles.

Deliberately not copied: the composition and the figure. The reference has one realistically proportioned knight lying beside the fire. Here three small front-facing knights sit around the fire by a tent, which is the point of the game (a group, and one of them false). The castle, moon, pines, field and fire are all drawn from scratch by code at a much lower resolution, with a limited palette and no soft shading. From images 02 and 03 only the shared thread is taken: night, warm light against cool colour, cozy but secretive.

## From the ui-ux-pro-max skill

Database matches that were used:

- Style search "pixel art retro game": style `pixel-art`. Taken from it: box-shadow pixel borders, no anti-aliased edges, a `--pixel-size` variable (here `--px`), a limited palette, frame-by-frame sprite animation, a blinking cursor, instant transitions, and its accessibility conditions (4.5:1 text, keyboard, visible focus, reduced motion).
- Typography search "pixel retro game": pairing "Pixel Retro" (Press Start 2P with VT323), with its note that Press Start 2P is very wide and VT323 suits body text. Google Fonts search confirmed Pixelify Sans and VT323 are in the database.
- UX searches: touch target size and pressed states, reduced motion, "animate one or two key elements per view" (each screen has at most the fire, a few stars and one prompt moving), safe areas for fixed bars, and focus indicators of at least 2px at 3:1.
- `references/quick-reference.md` and `references/pro-rules.md`: visible labels on inputs, `aria-live` for status changes, no emoji as icons, one primary action per screen, pressed states that do not shift layout, fixed bars with safe-area padding and scroll padding so focus is not hidden.
- The design-system skill: the three-layer token structure (primitive, semantic, component) in `theme.css`.

No database match, chosen by hand:

- The palette. Colour search "dusk violet lavender game" returned "Sleep Tracker" and "Meditation & Mindfulness", which do not fit. The 20 colours were picked by hand from the idea of a dusk camp and tuned with the contrast script.
- The product match "Card & Board Game" recommends "3D & Hyperrealism + Flat Design" with felt green and dark wood. Only the flat part applies; the rest was set aside for the brief's direction.
- UX search "hold to reveal secret privacy" returned nothing. The privacy treatment follows the repo's own rules.
- The rejection of Pixelify Sans and the Jersey family comes from my own screenshots, not from the database.
- The skill says state changes should animate smoothly. This direction snaps on purpose (the same skill's `pixel-art` style calls for instant transitions).

## Known gaps

- **Seat layout is tuned for 7.** The phone grid is four columns (10 players would need three rows or a fifth column with shorter labels), the ring on the wide screen is sized for seven seats, and there are seven plume colours. The full game needs a rule for 8 to 10.
- **Not designed yet:** the Lady of the Lake step, the assassination, the game-over screen, and error or reconnecting states.
- **The disabled Fail card tells an onlooker you are Good.** The brief asks for it to be shown that way. The real game should consider keeping the hand face down until held, as the role card is.
- **Tall content on short phones.** At 390 by 844 the quest step's speech box is partly under the fixed action bar until you scroll. The counts and the buttons are always visible.
- **Markup weight.** The scenes are inline SVG paths: about 49 KB for the phone scene, 98 KB for the wide one, 42 KB for the strip, and a server-rendered page carries them twice (HTML and the React payload). For the real game they should be exported once as static SVG files or drawn to a canvas.
- **Scene width.** The wide scene is 1920px across at 4px a pixel. Wider windows show plain canvas at the sides.
- **VT323 at 22px is off its 16px grid,** so it is anti-aliased rather than pixel-crisp. Readability was chosen over crispness. Press Start 2P at 14px (buttons) has the same trade-off.
- **Full-page screenshots of phone screens** show the fixed action bar in the middle of the page. That is how full-page capture treats fixed elements; in a browser it sits at the bottom.
- Pressed and hover states on buttons use a brightness filter and a one-pixel offset only; there is no sound, which this style would suit.
