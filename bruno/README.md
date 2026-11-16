# Bruno collection

HTTP requests for the app. Open this folder in Bruno, or run it from the
command line against a running server:

```bash
pnpm dev            # in another terminal
pnpm test:api       # runs the collection with the "local" environment
```

There is one request today (`health`). Rooms and the game use Socket.IO, not
HTTP, so they are tested with Vitest and Playwright instead.
