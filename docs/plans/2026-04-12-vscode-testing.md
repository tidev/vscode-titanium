# VS Code Testing Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split tests into fast Node unit tests, VS Code extension-host tests, and existing UI integration tests.

**Architecture:** Keep pure logic tests on a direct Mocha runner, move `vscode`-dependent suites to a dedicated VS Code-hosted test tree, and remove coverage collection from the extension-host path. Update CI so only Linux runs coverage and only Linux uses Xvfb.

**Tech Stack:** TypeScript, Mocha, NYC, `@vscode/test-cli`, GitHub Actions

---

### Task 1: Add dedicated test scripts and dependencies

**Files:**
- Modify: `package.json`

**Step 1: Write the failing expectation**

Expected scripts after this task:

- `test`
- `test:unit`
- `test:vscode`
- `test:ci`
- `test:coverage`

Expected dependency after this task:

- `@vscode/test-cli`

**Step 2: Run current script inventory**

Run: `node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts).sort())"`

Expected: no dedicated `test:unit`, `test:vscode`, `test:ci`, or `test:coverage`

**Step 3: Write minimal script changes**

- Keep `pretest` compiling TypeScript.
- Point `test` to the fast Node unit path.
- Add a VS Code-hosted script for editor-facing tests.
- Add a combined `test:ci` script.
- Add a coverage script that only wraps Node unit tests.

**Step 4: Verify the new script inventory**

Run: `node -e "const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2))"`

Expected: the new test scripts are present and distinct.

### Task 2: Split runners into Node and VS Code host

**Files:**
- Create: `src/test/unit/run.ts`
- Create: `src/test/vscode/index.ts`
- Create: `src/test/vscode/runTest.ts`
- Modify: `src/test/unit/index.ts`

**Step 1: Write the failing shape**

Expected runtime behavior:

- Node unit runner loads only `src/test/unit/suite/**/*.test.js`
- VS Code runner loads only `src/test/vscode/suite/**/*.test.js`
- Coverage setup lives only in the Node unit runner

**Step 2: Create the Node runner**

- Move the current Mocha discovery logic into `src/test/unit/run.ts`
- Keep optional `nyc` coverage there

**Step 3: Create the VS Code-hosted runner**

- Keep a VS Code launch entrypoint under `src/test/vscode/runTest.ts`
- Add a matching Mocha suite loader under `src/test/vscode/index.ts`
- Use the existing fixture workspace

**Step 4: Verify runner compile**

Run: `npm run compile`

Expected: `out/test/unit/run.js` and `out/test/vscode/runTest.js` exist

### Task 3: Move VS Code-dependent suites to the new tree

**Files:**
- Create: `src/test/vscode/suite/...`
- Delete: `src/test/unit/suite/...` for moved files

**Step 1: Write the failing inventory**

Run: `find src/test/unit/suite -name '*.ts' | sort`

Expected after this task: only pure Node suites remain in `src/test/unit/suite`

**Step 2: Move VS Code-dependent suites**

Move these suites to `src/test/vscode/suite` while preserving subfolders:

- `related.test.ts`
- all suites under `providers/`

**Step 3: Fix relative imports if needed**

- Update moved tests to keep imports correct after relocation

**Step 4: Verify test tree split**

Run: `find src/test/unit/suite src/test/vscode/suite -name '*.ts' | sort`

Expected: Node-only suites in `unit`, editor-facing suites in `vscode`

### Task 4: Adopt the VS Code test CLI

**Files:**
- Create: `.vscode-test.js`
- Modify: `package.json`

**Step 1: Write the failing expectation**

Expected: `npm run test:vscode` runs the dedicated VS Code suite without using the old direct `node ./out/test/unit/runTest.js` path.

**Step 2: Add the config**

- Configure `@vscode/test-cli` with the extension development path, test workspace, and compiled test entrypoint.

**Step 3: Point the script at the CLI**

- Use the CLI instead of a handwritten launch command where possible.

**Step 4: Verify the command path**

Run: `node -e "const p=require('./package.json'); console.log(p.scripts['test:vscode'])"`

Expected: the script references the VS Code test CLI.

### Task 5: Update CI to match the split

**Files:**
- Modify: `.github/workflows/ci.yml`

**Step 1: Write the failing expectation**

Current problem:

- all OSes run coverage-heavy `npm test`
- all OSes use the Xvfb wrapper

**Step 2: Update the matrix jobs**

- Linux unit job: run `npm run test:coverage`
- Cross-platform VS Code job: run `npm run test:vscode`
- Use Xvfb only when `runner.os == 'Linux'`

**Step 3: Keep package gating intact**

- Ensure `Package` still depends on lint and test jobs

**Step 4: Verify workflow shape**

Run: `sed -n '1,220p' .github/workflows/ci.yml`

Expected: coverage only on Linux, no Xvfb wrapper on macOS/Windows

### Task 6: Verify the split end to end

**Files:**
- No code changes expected

**Step 1: Run the fast unit path**

Run: `npm test`

Expected: only Node unit tests run, no VS Code startup logs

**Step 2: Run the VS Code-hosted path**

Run: `npm run test:vscode`

Expected: moved editor-facing suites pass

**Step 3: Run the combined CI path**

Run: `npm run test:ci`

Expected: unit tests and VS Code-hosted tests both pass

**Step 4: Run lint and compile**

Run: `npm run lint && npm run compile`

Expected: no new errors introduced by the split

**Step 5: Commit**

```bash
git add package.json package-lock.json .github/workflows/ci.yml .vscode-test.js src/test/unit src/test/vscode docs/plans
git commit -m "test: split node and vscode-hosted test suites"
```
