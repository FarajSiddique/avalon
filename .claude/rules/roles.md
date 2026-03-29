---
paths:
  - "packages/server/src/**/*"
  - "packages/shared/src/**/*"
---

# Role Definitions

## Good Roles

### Merlin (required)
- Knows all Evil players **except Mordred**.
- Win condition: Good wins 3 Quests AND Assassin fails to identify Merlin.
- Risk: being too obvious hands Evil the win via assassination.
- UI colour: Blue `#4A8FE3`

### Percival (optional)
- Knows which players are Merlin and Morgana but **cannot tell them apart**.
- Must protect the real Merlin while being deceived by Morgana.
- Note: pair with Mordred or Morgana in 5-player games.
- UI colour: Blue

### Loyal Servant of Arthur (filler Good)
- No knowledge. Starts blind.
- UI colour: Blue

## Evil Roles

### Assassin (required)
- Knows all other Evil players (except Oberon).
- After Good wins 3 Quests: names one Good player as Merlin. Correct → Evil wins.
- UI colour: Red `#C73838`

### Minion of Mordred (filler Evil)
- Knows all other Evil players (except Oberon). No special power.
- UI colour: Red

### Mordred (optional)
- Knows all other Evil players (except Oberon).
- **Hidden from Merlin** — the one Evil player Merlin cannot see.
- Server: exclude Mordred from Merlin's `role_assigned` payload.
- UI colour: Red

### Morgana (optional)
- Knows all other Evil players (except Oberon).
- **Appears as Merlin to Percival** — both Merlin and Morgana raise thumbs for Percival.
- UI colour: Purple `#A050E0`

### Oberon (optional)
- **No knowledge at all.** Does not open eyes during Evil reveal.
- Other Evil players do not know Oberon exists.
- Server: exclude Oberon from all Evil knowledge lists; no Evil players in Oberon's list.
- UI colour: Purple/violet

## Knowledge Matrix

| Role | Knows Evil players | Knows Merlin | Visible to Merlin |
|---|---|---|---|
| Merlin | ✓ (except Mordred) | — | — |
| Percival | ✗ | ✓ (+ Morgana, indistinct) | ✓ |
| Loyal Servant | ✗ | ✗ | ✓ |
| Assassin | ✓ (except Oberon) | ✗ | ✓ |
| Minion of Mordred | ✓ (except Oberon) | ✗ | ✓ |
| Mordred | ✓ (except Oberon) | ✗ | **✗** |
| Morgana | ✓ (except Oberon) | ✗ | ✓ |
| Oberon | **✗** | ✗ | ✓ |
