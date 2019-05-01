# Contributing

Interested in contributing? You can follow the information below to ensure your contribution goes smoothly and is a great experience.

## File an issue

For any contribution we first ask that you [file an issue](https://github.com/appcelerator/vscode-appcelerator-titanium/issues/new/choose), this helps us keep track of any necessary changes, as well as discuss and agree on a plan of action to ensure landing your changes goes as smoothly as possible.

## Getting set up for development

1. Just to be safe, remove or move your existing installation at `~/.vscode/extensions/???`
2. Fork into your GitHub account and clone your fork.
3. `cd` into and run `npm install` in your project.
4. Open the project in VS Code `code .`
5. Open the debug tab and click "Start Debugging" (the green play icon). The debugger will start a the TypeScript compiler in watch mode.

You're now up and running with the extension running in another workspace. When you make changes to the TypeScript the watch task will automatically compile then for you, and you just need to reload the extension yourself using the green restart button on the main window, or by click `Cmd+R` (Windows: `Ctrl+R`) in the extension window.

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
	- Runs `scripts/generate-settings-table.js` to ensure the configuration settings documentation is up to date.
	- Runs [standard-version](https://github.com/conventional-changelog/standard-version) to bump versions based on commit messages, updates the changelog, commits the files and tags a new release.
	- Runs `npx vsce package` to generate a new `.vsix` file ready for upload to the marketplace.
3. Push to the main repo with `git push` and `git push <appc remote> <tag>`.
4. Upload the `.vsix` file to the [marketplace](https://marketplace.visualstudio.com/manage).
5. Draft a new release on the [releases page](https://github.com/appcelerator/vscode-appcelerator-titanium/releases).
6. 🎉
