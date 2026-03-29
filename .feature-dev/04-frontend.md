# Frontend Implementation: Ephemeral JWT Authentication

## Skipped — No New Frontend Components

This feature is a server-side authentication layer. No new UI screens or components are required.

## Client Integration Changes Required

When the client is implemented, it must be updated as follows:

### 1. POST /rooms (create room)
Send `playerName` in the request body. Store the returned `token` in memory.

```ts
const res = await fetch('/rooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerName }),
});
const { code, token } = await res.json();
// store token in Zustand store — NOT localStorage
```

### 2. POST /rooms/:code/join (join room)
Replace the `join_room` WebSocket event. Call this HTTP endpoint first, then open the socket.

```ts
const res = await fetch(`/rooms/${code}/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ playerName }),
});
const { token } = await res.json();
// store token in Zustand store
```

### 3. Socket.io connection
Pass the token in the Socket.io `auth` handshake object.

```ts
const socket = io(SERVER_URL, {
  auth: { token },
});

socket.on('unauthorized', (err) => {
  // token expired or invalid — redirect to lobby
});
```

### 4. Remove join_room event
The client must no longer emit `join_room`. Room membership is established server-side during the HTTP join.
