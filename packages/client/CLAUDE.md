# Client Package

React 19 + TypeScript + Vite 6 frontend. Design tokens, colour palette, typography,
component rules, and Figma screen inventory are in `.claude/rules/design-system.md` —
loaded automatically when editing client files.

## Stack

- Tailwind CSS + shadcn/ui (themed via CSS variables in `src/globals.css`)
- Zustand for client state
- Socket.io client for real-time events

## Conventions

- One component per file, PascalCase filename matching component name
- `src/screens/` — full game screen components
- `src/components/` — shared UI primitives
- `src/stores/` — Zustand stores
- `src/lib/socket.ts` — single Socket.io instance, imported where needed; never create multiple connections
- Co-locate styles with components using Tailwind classes — no separate CSS files per component
