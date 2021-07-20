# Contributing

Interested in contributing? You can follow the information below to ensure your contribution goes smoothly and is a great experience.

## File an issue

For any contribution we first ask that you [file an issue](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/new/choose), this helps us keep track of any necessary changes, as well as discuss and agree on a plan of action to ensure landing your changes goes as smoothly as possible.

## Getting set up for development

1. Fork into your GitHub account and clone your fork
2. `cd` into and run `npm install` in the directory
3. Open the project in VS Code `code .`
4. Open the debug tab, select the "Extension" debug target and click "Start Debugging" (the green play icon). 

## Working on the debugger

1. `cd` into and run `npm install` in the directory
2. Open the project in VS Code `code .`
3. Open the debug tab, select the "Extension + Debugger" debug target and click "Start Debugging" (the green play icon).
4. Configure your Titanium project for debugging, and add `"debugServer": 4711` to your launch configuration. For example:

```json
{
	"name": "Launch on iOS",
	"type": "titanium",
	"request": "launch",
	"platform": "ios",
	"debugServer": 4711
}
```

You're now up and running with the extension running in another workspace. When you make changes to the TypeScript the watch task will automatically compile then for you, and you just need to reload the extension yourself using the green restart button on the main window, or by click `Cmd+R` (Windows: `Ctrl+R`) in the extension window. If you're debugging the debugger and the extension make sure to select the correct target in the Debug Toolbar when reloading.

If you want to test debugging from the build tree view, then you will need to set the `debugServer` property in the debug configuration passed to the `vscode.debug.startDebugging` call in the Debug command

## Writing tests

There are two type of tests in the extension, unit tests and integration tests. Unit tests focus on testing the smaller utilities function that are used in the code, whereas the integration tests focus on testing the areas where we depend on interaction with tooling.

All tests are written using [mocha](https://mochajs.org/) and [chai expect](https://www.chaijs.com/api/bdd/).

### Unit tests

Unit tests live under the `src/test/unit` folder, you can run these tests using the `npm run test` command or one of the `Extension Tests` launch configurations.

### Integration tests

Integration tests live under the `src/test/integration` folder, you can run these tests using the `runUITests.sh` script in the root of the project. The automation is written using [vscode-extension-tester](https://github.com/redhat-developer/vscode-extension-tester), you can find a guide to using the automation package in their [wiki](https://github.com/redhat-developer/vscode-extension-tester/wiki).

The tests run outside of VS Code in a node process, so you are unable to use any code that references the `vscode` package.

## Documentation

A lot of features in VS Code are statically defined in the package.json. For example, task definitions, debug configurations, commands etc. To ensure that our documentation is always correct, and to remove the maintenance burden we generate the specific parts of the documentation from this content.

Because of this, the markdown files in `docs` should not be edited directly. Instead edit the files in `scripts/templates` and then run the `npm run generate-docs` script to update the content in `docs`.

## Sending in a PR

When sending in a PR please make sure you do the following:

- Commit using `npm run commit`, making sure to reference your issue ID when the prompting asks.
	- This ensure that the commit follows the [Conventional Commits](https://www.conventionalcommits.org/) standard used by the project. This is validated on a `git commit` using git hooks via husky.
- `npm run lint` passes
	- This is also validated on a `git commit` using git hooks via husky.
- When making the PR, please make sure to contain as much relevant info as possible in the PR body.
- Make sure to sign the [Axway CLA](https://cla.axway.com/).

## Releasing

To release of the extension the following needs to be followed:

1. Ensure that your local `master` branch is completely up to date with the main repo.
2. Run `npm run release`, which performs the following
	- Runs `scripts/render.js` to ensure the documentation is up to date.
	- Runs [standard-version](https://github.com/conventional-changelog/standard-version) to bump versions based on commit messages, updates the changelog, commits the files and tags a new release.
	- Runs `npx vsce package` to generate a new `.vsix` file ready for upload to the marketplace.
3. Push to the main repo with `git push` and `git push <appc remote> <tag>`.
4. Upload the `.vsix` file to the [marketplace](https://marketplace.visualstudio.com/manage).
5. Draft a new release on the [releases page](https://github.com/appcelerator/vscode-appcelerator-titanium/releases).
6. 🎉
