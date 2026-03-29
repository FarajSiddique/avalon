---
paths:
  - "packages/client/src/**/*"
---

# Design System

## Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#0D1220` | Page background |
| `bg-surface` | `#1A2438` | Panel/card background |
| `bg-card` | `#141B2D` | Nested card background |
| `gold` | `#C8A84B` | Primary accent, logo, headings |
| `gold-light` | `#E8CC7A` | Highlighted text, room codes |
| `text-primary` | `#F5EFE8` | Main body text |
| `text-secondary` | `#8A9CB8` | Muted/supporting text |
| `border` | `#2B3D60` | Subtle borders |
| `good` | `#4A8FE3` | Good alignment (blue) |
| `evil` | `#C73838` | Evil alignment (red) |
| `evil-special` | `#A050E0` | Morgana / Oberon (purple) |
| `success` | `#30D984` | Ready states, quest success |
| `warning` | `#F2A52E` | Not ready, status warnings |

Never hardcode hex values — always use the CSS variable tokens defined in `globals.css`.

## Typography

- **Font:** Inter (Regular, Medium, Semi Bold, Bold, Extra Bold)
- **Scale:** 44px (role name) → 38px (game title) → 22px (logo) → 16px (CTA) → 14px (body) → 12px (supporting) → 11px (labels/caps)
- **Caps labels:** 8–14% letter spacing

## Component Rules

- **shadcn/ui** for standard interactive UI: Button, Card, Switch, Badge, Avatar, Separator
- **Custom Tailwind** for all game-specific visuals: role cards, glow effects, phase indicators, decorative dividers
- Role cards use coloured borders + inner glow to signal alignment immediately
- All hidden-information screens must show a privacy banner

## Design Language

- Dark navy backgrounds with gold accents — Arthurian / medieval dark fantasy
- Good = Blue; Evil = Red; Morgana/Oberon = Purple; Neutral UI = Gold/Navy
- No light mode

## Figma File

`https://www.figma.com/design/XLtDnvcmHHXwx1VKYGTT5T`

| Screen | Status |
|---|---|
| Lobby — Join Room | ✅ Done |
| Role Reveal — Merlin | ✅ Done |
| Role Reveal — Percival | ✅ Done |
| Role Reveal — Loyal Servant | ✅ Done |
| Role Reveal — Assassin | ✅ Done |
| Role Reveal — Minion of Mordred | ✅ Done |
| Role Reveal — Mordred | ✅ Done |
| Role Reveal — Morgana | ✅ Done |
| Role Reveal — Oberon | ✅ Done |
| Team Building | ⬜ Not started |
| Team Vote | ⬜ Not started |
| Quest Phase | ⬜ Not started |
| Quest Result | ⬜ Not started |
| Assassination Phase | ⬜ Not started |
| Game End — Good Wins | ⬜ Not started |
| Game End — Evil Wins | ⬜ Not started |
