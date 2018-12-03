const vscode = require('vscode');
const Range = vscode.Range;
const fs = require('fs');
const path = require('path');
const utils = require('../../utils');
const Appc = require('../../appc');

/**
 * Tiapp.xml completion provider
*/
const TiappCompletionItemProvider = {

	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable|Array}
	 */
	provideCompletionItems(document, position) {
		const linePrefix = document.lgetText(new Range(position.line, 0, position.line, position.character));
		const completions = [];
		let tag;
		const matches = /<([a-zA-Z][-a-zA-Z]*)(.*?)>(.*|$)/.exec(linePrefix);
		if (matches && matches.length >= 2) {
			tag = matches[1];
		}

		if (tag === 'sdk-version') {
			const sdkVer = /<sdk-version>([^<]*)<?/.exec(linePrefix);
			let sdkVersion;
			if (sdkVer) {
				sdkVersion = sdkVer[1];
			}
			const sdks = Appc.sdks();
			for (const sdk of sdks) {
				if (sdkVersion && !sdk.fullversion.includes(sdkVersion)) {
					continue;
				}
				completions.push({
					label: sdk.fullversion,
					kind: vscode.CompletionItemKind.Value
				});
			}
		} else if (tag === 'module') {
			const modulePath = path.join(vscode.workspace.rootPath, 'modules');
			if (!utils.directoryExists(modulePath)) {
				return;
			}
			const modules = {};
			for (const platform of TiappCompletionItemProvider.getDirectories(modulePath)) {
				const platformModulePath = path.join(vscode.workspace.rootPath, 'modules', platform);
				for (const moduleName of TiappCompletionItemProvider.getDirectories(platformModulePath)) {
					if (!modules[moduleName]) {
						modules[moduleName] = {};
					}
					const curModule = modules[moduleName];
					curModule.platform = (curModule.platform || []).concat(platform);
				};
			};
			for (let key in modules) {
				completions.push({
					label: key,
					detail: modules[key].platform.join(',')
				});
			}
		}

		return completions;
	},

	/**
     * Returns child directories for given path
     *
     * @param {String} srcpath path
     *
     * @returns {Array}
     */
	getDirectories(srcpath) {
		return fs.readdirSync(srcpath).filter(file => fs.statSync(path.join(srcpath, file)).isDirectory());
	}
};

module.exports = TiappCompletionItemProvider;
