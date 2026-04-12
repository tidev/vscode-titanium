# Repository Guidelines

## Project Structure & Module Organization
Core extension code lives in `src/`. Use `src/extension.ts` as the entry point, with feature areas split into `src/commands`, `src/debugger`, `src/explorer`, `src/providers`, and `src/tasks`. Shared types and utilities live in `src/types`, `src/common`, and `src/utils.ts`.

Tests live under `src/test`: unit tests in `src/test/unit`, integration and smoke coverage in `src/test/integration`, and reusable fixtures in `src/test/common/fixtures`. Static extension assets live in `images/`, `snippets/`, `grammars/`, and `l10n/`. Generated build output goes to `out/` and should not be edited directly.

## Build, Test, and Development Commands
- `npm install`: install dependencies and Husky hooks.
- `npm run compile`: transpile TypeScript into `out/`.
- `npm run watch`: rebuild on change while developing in VS Code.
- `npm run lint`: run ESLint across `src/` and `scripts/`.
- `npm test`: run unit tests with coverage enabled.
- `npm run test:integration`: compile and run integration tests.
- `npm run test:smoke`: run smoke scenarios against the extension.
- `npm run generate-docs`: rebuild `doc/*.md` from `scripts/templates/*.ejs`.

For interactive debugging, open the repo in VS Code and launch the `Extension` or `Extension + Debugger` configuration described in `CONTRIBUTING.md`.

## Coding Style & Naming Conventions
This project uses TypeScript with `strict` mode enabled. Follow the existing style: tabs for indentation, semicolons, `camelCase` for functions and variables, `PascalCase` for classes/types, and descriptive file names such as `createApp.ts` or `titaniumDebugHelper.ts`. Run `npm run lint` before opening a PR; ESLint is configured via `.eslintrc` with Axway’s Node/TypeScript presets.

## Testing Guidelines
Write unit tests as `*.test.ts`; smoke-focused cases use `*.smoke.ts`. Keep new fixtures under `src/test/common/fixtures` and prefer small, behavior-focused tests. Run `npm test` for unit coverage and `npm run test:integration` for tooling or VS Code workflow changes.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits, for example `chore(ios): ...` and `test: ...`. Use `npm run commit` to create compliant messages through Commitizen. Before submitting a PR, make sure `npm run lint` passes, link the related issue, include relevant implementation details in the PR body, and complete the project CLA. Do not edit generated docs in `doc/` directly; update `scripts/templates/` and regenerate them instead.
