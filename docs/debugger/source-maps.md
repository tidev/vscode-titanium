# Source maps

Mapping rules between the running engine's view of a script and the user's source file.

## Project structure

Two project types, different output shapes:

| Project type | Source location | Identifier |
|---|---|---|
| Classic | `Resources/`, with `Resources/<platform>/` for per-platform overrides | (no `app/alloy.js`) |
| Alloy | `app/`, compiled to a `Resources/<platform>/` intermediate before the SDK packaging step | `app/alloy.js` present |

The resolver detects project type by checking for `app/alloy.js`.

Both types support per-platform overrides at the source level:

- **Classic**: `Resources/<platform>/foo.js` overrides `Resources/foo.js`. The build collapses both into one deployed file; the chosen source is recorded in the resulting map's `sources[]`.
- **Alloy**: `app/controllers/<platform>/foo.js` overrides `app/controllers/foo.js`. The override is recorded in the Alloy `.map`'s `sources[]`. Holds for controllers, lib files, and widget controllers.

## Android

### Build artifact layout

| Path | Classic | Alloy |
|---|---|---|
| `Resources/<platform>/` (Alloy intermediate, between Alloy compile and SDK babel pass) | — | yes |
| `build/map/Resources/<platform>/<relpath>.js.map` (Alloy → user-source map) | — | yes (one per Alloy artifact) |
| `build/android/assets/<relpath>.js` (deployed JS) | yes | yes |
| `build/android/assets/<relpath>.js` trailing `//# sourceMappingURL=data:…base64,…` (babel inline map) | yes | yes |

The deployed JS always carries an inline source map at the end of the file. Classic stops there; Alloy has a second standalone map sidecar under `build/map/`.

### V8 URL ↔ on-disk file

V8 reports script URLs as `/`-rooted virtual paths. They correspond to the deployed file's path relative to `build/android/assets/`:

| V8 URL | On-disk |
|---|---|
| `/app.js` | `build/android/assets/app.js` |
| `/alloy/controllers/index.js` | `build/android/assets/alloy/controllers/index.js` |
| `/lib/helper.js` | `build/android/assets/lib/helper.js` |

### Classic: single-stage inline maps

Classic has no standalone `.map` files. Every deployed `.js` ends with `//# sourceMappingURL=data:application/json;charset=utf-8;base64,…` whose decoded payload references the user source directly.

Example (`build/android/assets/utils.js` from a project with `Resources/utils.js` and `Resources/android/utils.js`):

```json
{
  "sources": ["utils.js"],
  "sourceRoot": "/abs/path/to/project/Resources/android"
}
```

→ resolves to `/abs/path/to/project/Resources/android/utils.js`, the Android override.

Single-stage lookup is enough.

### Alloy: two-stage chained maps

The Alloy build runs in two passes:

1. **Alloy compile**: `app/controllers/index.js` (and the framework's controller wrapper template) → `Resources/<platform>/alloy/controllers/index.js`. Emits a sidecar `.map` at `build/map/Resources/<platform>/alloy/controllers/index.js.map`.
2. **SDK babel pass**: `Resources/<platform>/alloy/controllers/index.js` → `build/<platform>/assets/alloy/controllers/index.js`. Emits an inline `data:` map appended to the deployed file.

The two maps cover disjoint segments of the pipeline. Neither one alone is sufficient.

#### Inline map sources are placeholders

The babel inline map names its sources by what babel was told the input file was. For Alloy-generated intermediates, that ends up as bare names that don't exist on disk:

```json
{
  "sources": ["template.js", "index.js"],
  "sourceRoot": "/abs/path/to/project"
}
```

`template.js` and `index.js` don't exist anywhere in the source tree. They're babel's record of the two logical inputs Alloy stitched together (controller wrapper + user code). The mappings themselves — line/column deltas — are accurate against the intermediate file's contents.

#### Alloy map has the real source paths

The sidecar `.map` written by the Alloy compiler references the user source:

```json
{
  "sources": ["template.js", "app/controllers/android/index.js"],
  "file": "/abs/path/to/project/Resources/android/alloy/controllers/index.js",
  "sourceRoot": "/abs/path/to/project"
}
```

`sources[0]` is the wrapper template (still a placeholder; not a user file). `sources[1]` is the real user file, including platform-override path when applicable.

#### How the two maps are used

The inline and sidecar maps don't combine the same way for every Alloy artifact. Two patterns appear, picked by comparing source-array lengths:

**Same number of sources (controllers, widgets, lib files).** The inline placeholder name at index `i` corresponds to the sidecar's real source name at index `i`. Inline's `originalPositionFor` already returns line/col in the user-source coordinate space — babel was effectively handed the user file directly. The resolver:

1. Calls `inline.originalPositionFor(generatedLine, col)` → `(placeholder, userLine, userCol)`.
2. Looks up the user-source path from the sidecar at the same index as the placeholder.
3. Returns `(userPath, userLine, userCol)`.

No chaining through intermediate line numbers is needed; the placeholder source name is only used as a key to find the corresponding sidecar source.

**Different source counts (entry `app.js`).** The inline map has one source (`app.js`); the sidecar has two (framework template + `app/alloy.js`). Inline is mapping to the alloy intermediate file (`Resources/<platform>/app.js`), not the user source. The resolver chains through:

1. `inline.originalPositionFor(generatedLine, col)` → `(intermediateLine, intermediateCol)`.
2. `alloy.originalPositionFor(intermediateLine, intermediateCol)` → `(userPath, userLine, userCol)`.
3. Returns `(userPath, userLine, userCol)`.

The strategy is selected at init from source-count equality. `SourceMapGenerator.applySourceMap` is not used for composition — it matches by source name, and the placeholder names don't line up with the sidecar's source array.

#### Sources to filter from `Loaded Scripts`

The wrapper template (`template.js`, plus the framework `app.js` template under `<alloy install>/Alloy/template/app.js`) is internal scaffolding. The resolver drops sources that don't exist on disk under the project root so they don't surface in the user-facing Loaded Scripts list.

## iOS

To be documented in Phase 2.
