import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'underscore';
import appc from '../../appc';
import * as utils from '../../utils';

import { CompletionItemKind, CompletionItemProvider, Range, workspace } from 'vscode';
/**
 * Tiapp.xml completion provider
 */

export class TiappCompletionItemProvider implements CompletionItemProvider {

	private completions: object;
	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable|Array}
	 */
	public provideCompletionItems (document, position) {
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
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
			const sdks = appc.sdks();
			for (const sdk of sdks) {
				if (sdkVersion && !sdk.fullversion.includes(sdkVersion)) {
					continue;
				}
				completions.push({
					label: sdk.fullversion,
					kind: CompletionItemKind.Value
				});
			}
		} else if (tag === 'module') {
			const modulePath = path.join(workspace.rootPath, 'modules');
			if (!utils.directoryExists(modulePath)) {
				return;
			}
			const modules: any = {};
			for (const platform of this.getDirectories(modulePath)) {
				const platformModulePath = path.join(workspace.rootPath, 'modules', platform);
				for (const moduleName of this.getDirectories(platformModulePath)) {
					if (!modules[moduleName]) {
						modules[moduleName] = {};
					}
					modules[moduleName] = (modules[moduleName].platform || []).concat(platform);
				}
			}
			for (const [ key, value ] of Object.entries(modules)) {
				completions.push({
					label: key,
					// detail: value.platform.join(',')
				});
			}
		}

		return completions;
	}

	/**
	 * Returns child directories for given path
	 *
	 * @param {String} srcpath path
	 *
	 * @returns {Array}
	 */
	private getDirectories (srcpath) {
		return fs.readdirSync(srcpath).filter(file => fs.statSync(path.join(srcpath, file)).isDirectory());
	}
}
