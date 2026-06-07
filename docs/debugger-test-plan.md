# Debug adapter test plan

Defines what "functional" means for the debugger. Serves as the regression checklist when Apple or Google ships a new OS version, and as the reference for what each piece of debug functionality should do.

## Layers

Three layers of testing. Each layer is cheaper, runs more often, and catches a different class of bug.

| Layer | Runs | Scope | Catches |
|---|---|---|---|
| Unit | Every PR | Pure functions: source map resolution, breakpoint state, plist parsing, message dispatch | Logic bugs in isolation |
| DAP-server-with-mock-backend | Every PR | Full DAP request/response cycles against canned target traces (one mock per backend) | Integration bugs in the DAP server without touching real targets |
| Real-target integration | Local only — on demand for iOS releases and pre-release validation | Real iOS sim / Android emulator / device against fixture projects | "Apple changed something in the OS" bugs that no mock catches |

No nightly CI for the real-target layer. Available locally and run deliberately when an iOS release lands or before a vscode-titanium release.

## Test fixtures

Two fixture Titanium projects committed under `test/fixtures/`:

- **`classic-app/`** — a minimal Titanium classic project with a few JS files, a known function with a known breakpoint location, console output, an HTTP call for async context.
- **`alloy-app/`** — a minimal Alloy project with controllers, views, models, a widget, and Alloy-compiled output to exercise source map resolution against the preprocessing pipeline. Includes a TypeScript controller to exercise `.ts` → `.js` source maps too.

Fixtures should stay stable — the test plan exercises them in increasing depth, but the projects themselves shouldn't churn.

## Feature matrix

What a working debugger does. Items marked `(out of scope)` are not goals; left in the list for completeness so they don't accidentally get assumed-in.

**Session lifecycle**

- [ ] Attach to running app
- [ ] Detach cleanly (no orphaned sockets, target keeps running)
- [ ] Disconnect cleanly (no orphaned sockets, target may terminate)
- [ ] Restart session (DAP `restart`)
- [ ] Multiple sequential sessions in the same VS Code instance leave no residue
- [ ] Concurrent sessions on different targets *(out of scope)*

**Breakpoints**

- [ ] Set line breakpoint
- [ ] Remove line breakpoint
- [ ] Hit line breakpoint, pause, see correct file + line
- [ ] Set conditional breakpoint, hit only when condition true
- [ ] Set hit-count breakpoint, hit only after N occurrences
- [ ] Set logpoint, log message appears in debug console without pausing
- [ ] Exception breakpoint (caught) — pause when an exception is caught
- [ ] Exception breakpoint (uncaught) — pause on unhandled exception
- [ ] Breakpoint set before script loaded — verifies once script parses
- [ ] Breakpoint in a file that's source-mapped — pause at the source line, not the compiled line

**Stepping**

- [ ] Continue (`F5`)
- [ ] Step over
- [ ] Step into
- [ ] Step out
- [ ] Step across an async boundary *(out of scope — no async stacks)*

**Inspection**

- [ ] Call stack visible while paused, frames named meaningfully
- [ ] Scopes visible (local, closure, global) per frame
- [ ] Variables visible per scope with correct values
- [ ] Object expansion works (nested objects, arrays)
- [ ] Hover over identifier shows value
- [ ] Watch expression updates as state changes
- [ ] Evaluate arbitrary expression in debug console while paused
- [ ] Evaluate references the paused frame's scope chain
- [ ] `__` Kroll internal properties do not leak into variables panel

**Console output**

- [ ] `console.log` reaches debug console
- [ ] `console.warn` / `console.error` reach debug console with right severity
- [ ] Uncaught exceptions surface in debug console with stack trace
- [ ] Native log output does *not* duplicate into debug console

**Source maps**

- [ ] Alloy controller (.js after compilation) maps back to source view file
- [ ] Alloy TS controller (.ts → .js) maps through both transforms
- [ ] Widget files in `app/widgets/*/controllers/` map correctly
- [ ] Lib files in `app/lib/` map correctly
- [ ] Stack trace shows source paths, not compiled paths

## Configuration matrix

What we run the feature matrix against. Kept deliberately light — one minimum + one current per axis is enough to catch real problems without exploding the matrix.

**iOS simulator** — minimum supported iOS, latest stable iOS

**iOS physical device** (manual only) — minimum supported iOS, latest stable iOS

**Android emulator** — minimum supported API level, latest stable

**Android physical device** — opportunistic; not required for a release

Minimum supported tracks Titanium SDK's `minIosVersion` — the debugger supports the same range the SDK does, so no separate floor to maintain.

## Manual device checklist

Compact form for use before a release that touches the device path.

Per device:

1. Developer Mode on, device paired and trusted.
2. `go-ios` reachable from PATH or via the configured setting.
3. Build and install the `alloy-app` fixture.
4. From VS Code, attach via the Titanium debug type.
5. Hit a known breakpoint in a controller. Confirm correct file + line.
6. Step over, step into, step out. Confirm correct movement.
7. Hover over a variable. Confirm value.
8. Evaluate `Ti.Platform.osname` in debug console. Confirm result.
9. Set a conditional breakpoint. Confirm only-when-true behavior.
10. Trigger a `console.log`. Confirm output reaches debug console.
11. Disconnect. Confirm clean teardown.
12. Reattach. Confirm second session works without restart.

Repeat for each device in the configuration matrix.

## Failure modes to watch for

Observed historically with the current stack; worth specifically checking in any rework:

- Breakpoints set before scripts load — should get verified once parsed, not stay unverified silently
- Source-mapped breakpoints landing on the wrong line (off-by-one source map issue)
- Variables panel showing internal `__id`, `__index`, etc.
- Stuck "paused" state when the debugger is detached mid-step
- Source map URLs that resolve to local filesystem paths the editor can't open
- Multiple debug sessions leaving sockets bound on subsequent attach attempts
- `go-ios` not on PATH producing a cryptic error instead of an actionable one

## Updating this plan

When Apple ships a new iOS major:

1. The "latest stable" axis updates to the new version.
2. Run the manual checklist on the new version.
3. Add any version-specific failures observed to "Failure modes to watch for."

When Titanium SDK bumps `minIosVersion`:

1. The "minimum supported" axis updates to the new floor.
