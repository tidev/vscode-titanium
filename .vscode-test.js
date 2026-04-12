const path = require('path');
const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({
	coverage: {
		exclude: [ 'src/test/**', 'liveview/**', 'titanium-cli/**' ]
	},
	tests: [ {
		files: 'out/test/vscode/suite/**/*.test.js',
		extensionDevelopmentPath: __dirname,
		srcDir: 'src',
		workspaceFolder: path.resolve(__dirname, 'src', 'test', 'common', 'fixtures', 'alloy-project'),
		launchArgs: [ '--disable-extensions' ],
		mocha: {
			color: true,
			timeout: process.env.DEBUG ? 99999 : 5000,
			ui: 'bdd'
		}
	} ]
});
