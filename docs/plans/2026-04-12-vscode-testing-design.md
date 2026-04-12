# VS Code Testing Split Design

## Goal

Split the repository's tests into clear runtime layers so fast logic tests do not boot VS Code, extension-host tests are named and run as such, and UI flows stay isolated in the existing integration suite.

## Current Problems

- `npm test` launches a full Extension Development Host even though only 11 of 14 suites require `vscode`.
- Coverage is collected inside the VS Code host on every OS, which dominates CI time.
- The current `src/test/unit` name is misleading because most suites are extension-host integration tests.

## Proposed Structure

### `src/test/unit`

Pure Node tests only. These suites must not import `vscode` or depend on extension activation. They run directly with Mocha.

Current status:

- The folder is intentionally empty after the split.
- Existing “unit” candidates all load modules that import `vscode` at module scope, so they belong in the VS Code-hosted layer until production code is decoupled further.

### `src/test/vscode`

Extension-host tests that rely on `vscode`, open editors, or exercise providers through the VS Code API. These run in the Extension Development Host using the VS Code test runner.

### `src/test/integration`

Keep the current `vscode-extension-tester` UI flows unchanged as the slowest, highest-level suite.

## Scripts and CI

- `npm test`: run the main VS Code-hosted suite.
- `npm run test:vscode`: run extension-host tests.
- `npm run test:ci`: run unit tests, then extension-host tests.
- `npm run test:coverage`: collect coverage once through the VS Code test CLI.

CI should run:

- Ubuntu: `test:coverage` and `test:vscode`
- macOS and Windows: `test:vscode`

Use `xvfb` only on Linux, matching the VS Code CI guidance.

## Runner Choice

Adopt `@vscode/test-cli` for extension-host tests. It is the current higher-level runner on top of `@vscode/test-electron` and better matches current VS Code extension testing guidance.

## Success Criteria

- `npm test` is materially faster than the current default.
- CI no longer gathers coverage inside the VS Code host on macOS or Windows.
- Test folder names and scripts reflect the actual runtime layer.
- Existing provider and editor-facing tests still pass under the VS Code-hosted runner.
