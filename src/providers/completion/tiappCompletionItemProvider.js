const vscode = require('vscode');
const Range = vscode.Range;
const _ = require('underscore');
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
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
		const completions = [];
		let tag;
		const matches = /<([a-zA-Z][-a-zA-Z]*)(.*?)>(?:\s*|$)/.exec(linePrefix);
		if (matches && matches.length >= 2) {
			tag = matches[1];
		}

		if (tag === 'sdk-version') {
			const sdks = Appc.sdks();
			for (let idx in sdks) {
				completions.push({
					label: sdks[idx].fullversion,
					kind: vscode.CompletionItemKind.Value
				});
			}
		} else if (tag === 'module') {
			const modulePath = path.join(vscode.workspace.rootPath, 'modules');
			if (!utils.directoryExists(modulePath)) {
				return;
			}
			const modules = {};
			_.each(TiappCompletionItemProvider.getDirectories(modulePath), platform => {
				const platformModulePath = path.join(vscode.workspace.rootPath, 'modules', platform);
				return _.each(TiappCompletionItemProvider.getDirectories(platformModulePath), moduleName => {
					if (!modules[moduleName]) {
						modules[moduleName] = {};
					}
					const curModule = modules[moduleName];
					return curModule.platform = (curModule.platform || []).concat(platform);
				});
			});
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
