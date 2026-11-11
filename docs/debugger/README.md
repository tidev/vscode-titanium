# Debugger

Technical reference for the `titanium-next` debug adapter. Each document covers one subsystem.

| Document | Topic |
|---|---|
| `android-attach.md` | Wire-level details of the V8 inspector endpoint on Android: SDK-side state machine, handshake substring match, message queuing. |
| `source-maps.md` | Build artifact layout per project type, V8-URL ↔ on-disk file convention, classic single-stage inline maps, Alloy two-stage map chain. |

## Glossary

- **DAP** — Debug Adapter Protocol. VS Code ↔ adapter.
- **CDP** — Chrome DevTools Protocol. Adapter ↔ V8 inspector (Android).
- **WIP** — WebKit Inspector Protocol. Adapter ↔ JavaScriptCore inspector (iOS).
- **V8 URL** — The `/`-rooted virtual path V8 uses to identify a script. Distinct from the on-disk path; mapping rules in `source-maps.md`.
- **Alloy intermediate** — A `.js` file under `<projectRoot>/Resources/<platform>/`, output of the Alloy compile and input to the SDK's babel pass.
