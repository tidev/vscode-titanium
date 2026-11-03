# Android attach

The Android V8 inspector endpoint and the SDK-side state machine the adapter cooperates with. SDK sources referenced below live in the Titanium SDK:

- `android/runtime/v8/src/java/org/appcelerator/kroll/runtime/v8/JSDebugger.java`
- `android/runtime/v8/src/native/InspectorClient.cpp`

## Endpoint

The inspector listens on the port supplied to `ti build --debug-port <port>` inside the device/emulator. The endpoint serves a single WebSocket route at `/`. There are no HTTP routes — requesting `/json` or `/json/list` (the standard Chrome DevTools target-discovery URLs) returns `404`. The adapter connects directly to `ws://<host>:<port>` with no target enumeration step.

## SDK-side startup wait

`Runtime.runIfWaitingForDebugger` is a standard CDP method whose purpose is exactly to release a debugger-wait at startup (the same handshake Chrome uses with `--inspect-brk`). What's Titanium-specific is *where* the wait lives and *how* the message is detected.

At app start, before any user JS executes, `JSDebugger.waitForDebugger()` blocks the JS thread on `waitLock.wait()` for up to 60 000 ms. The wait is implemented on the SDK side, outside V8; V8 itself is not paused. Two things end the wait early:

1. A timeout (60 s elapsed) — the SDK continues without an established inspector session.
2. A handshake match from `notifyDebuggerOfRuntimeStart()`, fired from the WebSocket message-receive handler whenever an inbound message satisfies `message.contains("\"Runtime.runIfWaitingForDebugger\"")`. The detection is a literal substring match on the raw frame text, not a parsed CDP method dispatch; V8 never sees the message in this path.

The adapter sends a standard CDP `Runtime.runIfWaitingForDebugger` request, which serialises to a frame containing the substring and satisfies the predicate.

## Inbound message queuing during the wait

While `waitForDebugger()` is blocked, the WebSocket receive handler appends each inbound frame to `JSDebugger.initialMessages` rather than dispatching it to V8. After the wait ends, `sendInitialMessages()` drains the queue into V8 in arrival order.

Any CDP request sent during the wait produces no response until the wait ends. Sequential `await connection.send(...)` therefore deadlocks if the awaited message is anything other than the handshake — the awaited response cannot arrive until V8 processes the queue, which cannot happen until the handshake message arrives, which is blocked behind the awaited send.

The adapter sends the initial CDP batch with `Promise.all` so the handshake message reaches the SDK alongside any domain-enable requests.

## Trace logging

Attach configurations accept `"trace": true`. Every adapter event is emitted as a DAP `OutputEvent` prefixed with `titanium-next [+<ms-since-attach>]`. The millisecond offset makes the wait and handshake timing visible in the Debug Console.
