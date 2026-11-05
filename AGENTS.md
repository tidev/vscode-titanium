# Repository Guidelines

## Project Structure & Module Organization
Core extension code lives in `src/`. Use `src/extension.ts` as the entry point, with feature areas split into `src/commands`, `src/debugger`, `src/explorer`, `src/providers`, and `src/tasks`. Shared types and utilities live in `src/types`, `src/common`, and `src/utils.ts`.

Tests live under `src/test`: VS Code-hosted extension tests in `src/test/vscode`, reusable fixtures in `src/test/common/fixtures`, and the Node-only unit runner in `src/test/unit`. UI integration and smoke coverage stays in `src/test/integration`. Static extension assets live in `images/`, `snippets/`, `grammars/`, and `l10n/`. Generated build output goes to `out/` and should not be edited directly.

## Build, Test, and Development Commands
- `npm install`: install dependencies and Husky hooks.
- `npm run compile`: transpile TypeScript into `out/`.
- `npm run watch`: rebuild on change while developing in VS Code.
- `npm run lint`: run ESLint across `src/` and `scripts/`.
- `npm test`: run the VS Code-hosted test suite through `@vscode/test-cli`.
- `npm run test:unit`: run the direct Node unit runner.
- `npm run test:vscode`: run the VS Code-hosted suite explicitly.
- `npm run test:coverage`: run the VS Code-hosted suite once with coverage enabled.
- `npm run test:integration`: compile and run integration tests.
- `npm run test:smoke`: run smoke scenarios against the extension.
- `npm run generate-docs`: rebuild `doc/*.md` from `scripts/templates/*.ejs`.

For interactive debugging, open the repo in VS Code and launch the `Extension` or `Extension + Debugger` configuration described in `CONTRIBUTING.md`.

## Coding Style & Naming Conventions
This project uses TypeScript with `strict` mode enabled. Follow the existing style: tabs for indentation, semicolons, `camelCase` for functions and variables, `PascalCase` for classes/types, and descriptive file names such as `createApp.ts` or `titaniumDebugHelper.ts`. Run `npm run lint` before opening a PR; ESLint is configured via `.eslintrc` with Axway’s Node/TypeScript presets.

## Testing Guidelines
Write tests as `*.test.ts`; smoke-focused cases use `*.smoke.ts`. Put VS Code API and editor-facing tests under `src/test/vscode`, reserve `src/test/unit` for files that can run in plain Node without loading `vscode`, and keep new fixtures under `src/test/common/fixtures`. Run `npm test` for the main extension-host suite and `npm run test:integration` for UI or workflow changes.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits, for example `chore(ios): ...` and `test: ...`. Use `npm run commit` to create compliant messages through Commitizen. Before submitting a PR, make sure `npm run lint` passes, link the related issue, include relevant implementation details in the PR body, and complete the project CLA. Do not edit generated docs in `doc/` directly; update `scripts/templates/` and regenerate them instead.
