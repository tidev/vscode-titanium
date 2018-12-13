## Getting set up for development

1. Just to be safe, remove or move your existing installation at `~/.vscode/extensions/???`
2. Fork into your GitHub account and clone your fork.
3. `cd` into and run `npm install` in your project.
4. Open the project in VS Code `code .`
5. Open the debug tab and click "Start Debugging" (the green play icon). The debugger will start a the TypeScript compiler in watch mode.

You're now up and running with the extension running in another workspace. When you make changes to the TypeScript the watch task will automatically compile then for you, and you just need to reload the extension yourself using the green restart button on the main window, or by click `Cmd+R` (Windows: `Ctrl+R`) in the extension window.

## Sending in a PR

When sending in a PR please make sure you do the following:

- Commit using `npm run commit`
	- This ensure that the commit follows the [Conventional Commits](https://www.conventionalcommits.org/) standard used by the project. This is validated on a `git commit` using git hooks via husky.
- `npm run lint` passes
	- This is also validated on a `git commit` using git hooks via husky.
- When making the PR, please make sure to contain as much relevant info as possible in the PR body.
- Make sure to sign the [Axway CLA](https://cla.axway.com/).
