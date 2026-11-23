# Durable Object facts the lobby rules depend on

Research for issue #14 (map #13). Checked on 2026-11-22 against the current Cloudflare docs (markdown versions of the pages). Where the docs are silent, this says so. Items marked "inference" are conclusions drawn from documented facts, not documented statements.

The project's `wrangler.jsonc` uses `compatibility_date` 2026-11-01 with `nodejs_compat` only. Several facts below depend on that date, so they are noted.

## 1. Hibernatable WebSocket attachments

**Size.** "Maximum serialized size is 16,384 bytes." The value can be anything the structured clone algorithm supports. For larger values, store the data in storage and keep its key as the attachment.
Source: https://developers.cloudflare.com/durable-objects/best-practices/websockets/ (section `WebSocket.serializeAttachment`)

**Survives hibernation?** Yes: "Serialized attachments persist through hibernation as long as the WebSocket remains healthy." They are lost when either side closes the connection. `deserializeAttachment()` returns the most recent value, or `null` if none exists. Changes to the object after the call are not kept unless `serializeAttachment` is called again (it is a copy, not a reference).
Source: same page.

**Cost of writing on every message.** The docs are silent. Nothing on the websockets page, the pricing page or the limits page says an attachment write is billed or rate-limited. Pricing lists storage writes, `setAlarm()` (one row written each) and requests; attachments are not mentioned in any of them.
Source: https://developers.cloudflare.com/durable-objects/platform/pricing/

**What the platform does bill per message.** Each incoming WebSocket message is a request, billed at a 20:1 ratio (100 messages count as 5 requests). Outgoing messages and protocol pings are free. Auto-responses from `setWebSocketAutoResponse()` cost no wall-clock time. A message that the app rejects still costs the same, so a budget protects CPU and storage writes, not the bill.
Source: https://developers.cloudflare.com/durable-objects/platform/pricing/ (footnotes 2 and 3)

**Can a per-socket budget (counter plus window start) live there?** Yes, size-wise: a counter and a timestamp are a few dozen bytes against a 16 KiB cap. Two cautions:

- `serializeAttachment` replaces the whole value. The attachment today is `{ playerId }`, so a budget needs to be part of the same object and written together with it, or one write drops the other.
- Inference: the object only hibernates after 10 seconds with no events (see the lifecycle source in question 2). An in-memory counter with a window of 10 seconds or less is therefore lost only when the socket has already been quiet for the whole window, so it loses nothing that matters. A longer window needs the attachment (or storage). A client that sends one message every 9 seconds never lets the object hibernate, so no reset is possible there either.
  Source for the 10 second figure: https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/

**For the lobby rules.** Message budget: put `{ playerId, windowStart, count }` in the attachment, write it only when the window rolls over or on every accepted message (the docs give no cost reason to avoid that, but also no guarantee, so measure with `pnpm test:cpu`). The in-memory option is cheaper and good enough for windows of 10 seconds or less.

## 2. Alarms

**One alarm per object.** "Each Durable Object is able to schedule a single alarm at a time by calling `setAlarm()`." Calling `setAlarm` when one is already scheduled overrides it.
Source: https://developers.cloudflare.com/durable-objects/api/alarms/

**Pattern for several deadlines.** The docs give the pattern directly: keep the schedule in storage, let `alarm()` process what is due, then call `setAlarm` for the next due time. When adding an event, only move the alarm earlier if the new time is before the current one (`getAlarm()`). Source: same page, "Scheduling multiple events with a single alarm".
Constraints that matter for the pattern:

- `getAlarm()` called inside a running `alarm()` returns `null` unless `setAlarm` was called since the handler started.
- `setAlarm` in the constructor can clobber an already-set alarm, because the constructor runs before `alarm()` on wake-up. Check `getAlarm()` first.
- `setAlarm` with a time at or before now runs the handler "in the immediate future" and does not cancel a running handler.
- Alarms "usually execute within a few milliseconds after the set time, but can be delayed by up to a minute due to maintenance or failures while failover takes place".
- Only one `alarm()` runs at a time per object.
  Sources: https://developers.cloudflare.com/durable-objects/api/alarms/ and https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ (section Alarms)

**Retries.** At-least-once execution. If `alarm()` throws, it is retried with exponential backoff from 2 seconds, at most 6 retries, and "only applies to the most recent `setAlarm()` call". After that the alarm is not run again until the next `setAlarm`. The docs recommend catching errors inside the handler and scheduling a new alarm before returning.
Source: https://developers.cloudflare.com/durable-objects/api/alarms/

**Across a deploy or restart.** The docs are silent on whether a pending alarm survives a deploy; they do not say it is lost either. What they do say:

- The default code update strategy is `deferred` with `max_delay` of 300 seconds. An active object keeps running the old code until it hibernates or hits `max_delay`, then resets with a fresh isolate and no in-memory state. `immediate` resets at once. Source: https://developers.cloudflare.com/durable-objects/deployments/durable-objects-code-updates/
- If an unexpected error terminates the object, "the `alarm()` handler may be re-instantiated on another machine" and runs from the beginning after a short delay. Source: https://developers.cloudflare.com/durable-objects/api/alarms/
- An event on a hibernated or inactive object, "like an alarm", runs the constructor and then the handler. Source: https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/
- Inference: the alarm time is stored by the platform with the object's storage (it is part of the Storage API), so a reset or restart should not drop it. Treat the room's own stored deadlines as the source of truth anyway, and re-arm from them on any wake-up if `getAlarm()` is `null`. `pnpm test:restart` is the proof for the local runtime.
- Local dev: Cloudflare says to restart `wrangler dev` after editing code when using alarms. Source: https://developers.cloudflare.com/durable-objects/platform/known-issues/

**`deleteAll()` and the alarm.** For compatibility dates on or after 2026-02-24, `deleteAll()` also deletes the active alarm. This project's date is 2026-11-01, so the existing expiry path (`deleteAll()` in `alarm()`) leaves no stray alarm. Source: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ (`deleteAll`)

**Billing.** Each `setAlarm()` is billed as one row written, and an alarm invocation counts as a request. An alarm handler can run for 15 minutes at most. Sources: https://developers.cloudflare.com/durable-objects/platform/pricing/ and https://developers.cloudflare.com/durable-objects/platform/limits/

**For the lobby rules.** Host hand-over: store the hand-over deadline in `RoomState` (for example `hostAwaySince`), compute one "what is due next" time as the minimum of room expiry and the hand-over deadline in a pure function, and have `alarm()` handle whichever is due, then re-arm. The 60-second window is "at least 60 seconds": allow up to a minute of extra delay, and re-check against the stored deadline when the alarm fires (the current alarm already does this for expiry).

## 3. Closing a socket with a custom code and reason

**Allowed codes.** By default Workers accept 1000 to 4999 except 1004, 1005, 1006 and 1015, which cannot be sent. An invalid code throws `InvalidAccessError`. With the `pedantic_wpt` compatibility flag the range narrows to 1000 and 3000 to 4999. For application-defined codes the docs say to use 4000 to 4999. This project's `CLOSE_ROOM_GONE = 4004` is valid in both modes. A kick code such as 4003 is also fine.
Source: https://developers.cloudflare.com/workers/runtime-apis/websockets/ (section `close()`)

**Reason length.** A reason requires a code (a reason without one throws `InvalidAccessError`). With the `websocket_close_reason_byte_limit` flag, on by default for compatibility dates on or after 2026-03-03 (so on for this project), a reason longer than 123 UTF-8 bytes throws `SyntaxError`. The runtime validates arguments even when the socket is already closing or closed, so a throw is possible in a handler that thinks it is safe. The existing `try/catch` in `closeSocket` already covers this; keep reasons short ASCII.
Source: same page.

**Does the browser see the reason?** The docs are silent on browsers. Cloudflare's pages only cover the Workers side, and no Cloudflare page says anything about Safari or iOS. This could not be verified from official Cloudflare docs, and the repo has no way to test iOS Safari. Do not depend on the reason string: the project already sends a `{ type: "closed", reason }` message before closing, which is the safer carrier. Keep the numeric close code as a secondary hint only. If the answer matters, test on a real iPhone.

**Handling close on the server.** A hibernatable socket that receives a Close frame must be answered with `close()` in `webSocketClose()`, and an abnormal disconnect (1006) has no frame to answer. The docs disagree slightly: the WebSockets best-practices page and the runtime API page say the reply is required even with `web_socket_auto_reply_to_close` (on by default from compatibility date 2026-04-07), while one example comment says calling `close()` is then optional. The existing `socketGone` calls `socket.close()` with no arguments, which is valid either way.
Sources: https://developers.cloudflare.com/durable-objects/best-practices/websockets/ and https://developers.cloudflare.com/workers/runtime-apis/websockets/ (State and error behavior)

**Deploys and sockets.** Hibernatable connections "remain connected when a Durable Object adopts new code after hibernating". A forced code update (`max_delay` reached before hibernation, or `immediate`) "disconnects WebSockets attached to the running instance". The page words the reason in terms of the Web Standard API, so it is not fully clear whether hibernatable sockets on an active object also drop; assume they can. The client must reconnect and `room:resume` after any drop (it already does).
Source: https://developers.cloudflare.com/durable-objects/best-practices/websockets/ (WebSocket disconnection during code updates)

**For the lobby rules.** Kick: `socket.close(4003, "kicked")` (or similar), preceded by a `closed` message with the reason, inside the same try/catch. The client keys its UI off the message, not the reason string.

## 4. What these facts break in the current `room-object.ts`

Load, change, save, project holds up: the platform holds outgoing messages until writes are flushed ("allowUnconfirmed" is off by default), so saving then publishing is safe. Source: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/ (`put`). Points that need care:

1. **`scheduleExpiryCheck` overwrites the one alarm with the expiry time only.** It runs in `create`, `socketGone` and `alarm`. Once a hand-over deadline exists, any of these calls would replace an earlier hand-over alarm with a later expiry time, and the hand-over would never fire. It must always compute the minimum of every deadline (rename `nextExpiryCheck` to something like `nextDue`).
2. **The `alarm()` handler can throw and give up.** A throw from `load()` or `deleteAll()` gives 6 retries, then nothing. Wrap it, and on failure re-arm with `setAlarm`.
3. **At-least-once and late alarms.** The handler can run twice, or up to a minute late. It must decide from stored deadlines and `now`, and be idempotent (hand-over must do nothing if the host is back).
4. **The attachment is a single value.** `serializeAttachment({ playerId })` in `seat` and in `fetch` replaces the whole attachment. Adding budget fields means every write has to carry both, or a helper that reads, merges and writes.
5. **Attachments vanish on close.** Anything needed after a socket closes (who left, when) must come from `RoomState`, as `emptySince` does now. A host-away timestamp belongs in `RoomState`, saved before the alarm is set.
6. **Do not call `setAlarm` in the constructor** without checking `getAlarm()`.
7. **`getAlarm()` is `null` inside a running `alarm()`**, so "is one already set?" checks do not work there. Compute the next time from state instead.
8. **Reasons over 123 bytes throw.** `closeSocket` takes a closed set of short reasons today, so it is fine. Keep it a closed set.

Nothing else in the load, change, save, project pattern conflicts with these facts. `connectedIds` reads live sockets and excludes the closing socket explicitly, which is right because the docs do not say whether a socket in `webSocketClose` is still listed by `getWebSockets()`.
