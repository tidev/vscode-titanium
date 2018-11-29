const vscode = require('vscode');
const SnippetString = vscode.SnippetString;
const Range = vscode.Range;
const _ = require('underscore');
const path = require('path');
const utils = require('../../utils');
const related = require('../../related');
const alloyAutoCompleteRules = require('./alloyAutoCompleteRules');
const completionItemProviderHelper = require('./completionItemProviderHelper');

/**
 * Alloy Controller completion provider
*/
const ControllerCompletionItemProvider = {

	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable|Array}
	 */
	async provideCompletionItems(document, position) {
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
		const prefixRange = document.getWordRangeAtPosition(position);
		const prefix = prefixRange ? document.getText(prefixRange) : null;

		if (!this.completions) {
			await this.loadCompletions();
		}

		// Alloy XML ID - $._
		if (/\$\.([-a-zA-Z0-9-_]*)$/.test(linePrefix)) {
			return this.getIdCompletions(linePrefix, prefix);
		// Alloy XML ID property or function - $.tableView._
		} else if (/\$\.([-a-zA-Z0-9-_]*).([-a-zA-Z0-9-_]*)$/.test(linePrefix)) {
			return this.getMethodAndPropertyCompletions(linePrefix, prefix);
		// Titanium APIs - Ti.UI._ or Ti._
		} else if (/(?:Ti|Titanium)\.?\S+/i.test(linePrefix)) {
			return this.getTitaniumApiCompletions(linePrefix, prefix);
		// Event name - $.tableView.addEventListener('click', ...)
		} else if (/\$\.([-a-zA-Z0-9-_]*)\.(add|remove)EventListener\(["']([-a-zA-Z0-9-_/]*)$/.test(linePrefix)) {
			return this.getEventNameCompletions(linePrefix, prefix);
		// require('')
		} else if (/require\(["']?([^'");]*)["']?\)?$/.test(linePrefix)) {
			const matches = linePrefix.match(/require\(["']?([^'");]*)["']?\)?$/);
			const requestedModule = matches[1];
			// return this.getRequireCompletions(linePrefix, prefix);
			return this.getFileCompletions('lib', requestedModule);
		// Alloy.createController('')
		} else if (/Alloy\.(createController|Controllers\.instance)\(["']([-a-zA-Z0-9-_/]*["']?\)?)$/.test(linePrefix)) {
			// return this.getControllerCompletions(linePrefix, prefix);
			return this.getFileCompletions('controllers');
		// Alloy.createModel('')
		} else if (/Alloy\.(createModel|Models\.instance|createCollection|Collections\.instance)\(["']([-a-zA-Z0-9-_/]*)$/.test(linePrefix)) {
			// return this.getControllerCompletions(linePrefix, prefix);
			return this.getFileCompletions('models');
		// Alloy.createWidget('')
		} else if (/Alloy\.(createWidget|Widgets\.instance)\(["']([-a-zA-Z0-9-_/.]*)$/.test(linePrefix)) {
			return this.getWidgetCompletions(linePrefix, prefix);
		} else {
			let ruleResult;
			for (const rule of Object.values(alloyAutoCompleteRules)) {
				if (rule.regExp.test(linePrefix)) {
					ruleResult = await rule.getCompletions(linePrefix, position, prefix);
				}
			}
			if (ruleResult) {
				return ruleResult;
			}
		}

		return [ { label: 'Ti', kind: vscode.CompletionItemKind.Class } ];
	},

	/**
     * Get ID completions
     *
     * @returns {Thenable}
     */
	async getIdCompletions() {
		const completions = [];
		const relatedFile = related.getTargetPath('xml');
		const fileName = relatedFile.split('/').pop();
		const document = await vscode.workspace.openTextDocument(relatedFile);
		let matches;
		let regex = /id="(.+?)"/g;
		const ids = [];
		while ((matches = regex.exec(document.getText())) !== null) {
			const id = matches[1];
			if (!ids.includes(id)) {
				completions.push({
					label: id,
					kind: vscode.CompletionItemKind.Reference,
					detail: fileName
				});
				ids.push(id);
			}
		}
		return completions;
	},

	/**
     * Get controller member method and properties completions
     *
     * @param {String} linePrefix line prefix text
     *
     * @returns {Thenable}
     */
	async getMethodAndPropertyCompletions(linePrefix) {
		const { tags } = this.completions.alloy;
		const { types } = this.completions.titanium;

		let id = linePrefix.match(/\$\.([-a-zA-Z0-9-_]*)\.?$/)[1];
		const completions = [];
		const relatedFile = related.getTargetPath('xml');
		const document = await vscode.workspace.openTextDocument(relatedFile);
		let tagName;
		let regex = new RegExp(`id=["']${id}["']`, 'g');
		let matches = regex.exec(document.getText());
		if (matches) {
			const position = document.positionAt(matches.index);
			matches = document.getText(new Range(position.line, 0, position.line, position.character)).match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
			if (matches) {
				tagName = matches[1];
			}
		}

		if (tagName && tags[tagName]) {
			let { apiName } = tags[tagName];
			let tagObj = types[apiName];
			if (tagObj) {
				for (const value of tagObj.functions) {
					completions.push({
						label: value,
						kind: vscode.CompletionItemKind.Method,
						insertText: new SnippetString(`${value}($1)$0`)
					});
				}

				for (const value of tagObj.properties) {
					completions.push({
						label: value,
						kind: vscode.CompletionItemKind.Property,
						insertText: new SnippetString(`${value} = $1$0`)
					});
				}
			}
		}
		return completions;
	},

	/**
     * Get Titanium API completions
     *
     * @param {String} linePrefix line prefix text
     *
     * @returns {Array}
     */
	getTitaniumApiCompletions(linePrefix) {
		const { types } = this.completions.titanium;
		const matches = linePrefix.match(/(Ti\.(?:(?:[A-Z]\w*|iOS|iPad)\.?)*)([a-z]\w*)*$/);
		let apiName;
		let attribute;
		if (matches && matches.length === 3) {
			apiName = matches[1];
			if (apiName.lastIndexOf('.') === apiName.length - 1) {
				apiName = apiName.substr(0, apiName.length - 1);
			}
			attribute = matches[2];
		}

		if ('iOS'.indexOf(attribute) === 0 || 'iPad'.indexOf(attribute) === 0) {
			apiName += '.' + attribute;
			attribute = null;
		}

		const completions = [];
		// suggest class completion
		if (!attribute || attribute.length === 0) {
			_.each(types, function (value, key) {
				if (key.indexOf(apiName) === 0 && key.indexOf('_') === -1) {
					const replaceSections = key.split('.');
					completions.push({
						label: key,
						kind: vscode.CompletionItemKind.Class,
						insertText: replaceSections[replaceSections.length - 1]
					});
				}
			});
		}

		// if type exists suggest function and properties
		const apiObj = types[apiName];
		if (apiObj) {
			for (const func of apiObj.functions) {
				if ((!attribute || completionItemProviderHelper.matches(func, attribute)) && func.indexOf('deprecated') === -1) {
					completions.push({
						label: func,
						kind: vscode.CompletionItemKind.Method
					});
				}
			}
			for (const property of apiObj.properties) {
				if ((!attribute || completionItemProviderHelper.matches(property, attribute)) && property.indexOf('deprecated') === -1) {
					completions.push({
						label: property,
						kind: vscode.CompletionItemKind.Property
					});
				}
			}
		}

		return completions;
	},

	/**
     * Get event name completions
     *
     * @param {String} linePrefix line prefix text
     *
     * @returns {Thenable}
     */
	async getEventNameCompletions(linePrefix) {
		const { tags } = this.completions.alloy;
		const { types } = this.completions.titanium;
		const matches = /\$\.([-a-zA-Z0-9-_]*)\.(add|remove)EventListener\(["']([-a-zA-Z0-9-_/]*)$/.exec(linePrefix);
		const id = matches[1];
		const completions = [];
		const relatedFile = related.getTargetPath('xml');
		const document = await vscode.workspace.openTextDocument(relatedFile);
		let tagName;
		let regex = new RegExp(`id=["']${id}["']`, 'g');
		let idMatches = regex.exec(document.getText());
		if (idMatches) {
			const position = document.positionAt(idMatches.index);
			idMatches = document.getText(new Range(position.line, 0, position.line, position.character)).match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
			if (idMatches) {
				tagName = idMatches[1];
			}
		}

		if (tagName && tags[tagName]) {
			let { apiName } = tags[tagName];
			let tagObj = types[apiName];
			for (const event of tagObj.events) {
				completions.push({
					label: event,
					kind: vscode.CompletionItemKind.Event,
					detail: apiName
				});
			}
		}
		return completions;
	},

	/**
     * Get js file completions. Used to return controller, model and require references.
     *
     * @param {String} directory alloy directory
	 * @param {String} moduleName name of the module
     *
     * @returns {Thenable}
     */
	getFileCompletions(directory, moduleName) {
		const completions = [];
		const filesPath = path.join(utils.getAlloyRootPath(), directory);
		if (moduleName.startsWith('/')) {
			moduleName = moduleName.substring(0);
		}
		if (utils.directoryExists(filesPath)) {
			const files = utils.filterJSFiles(filesPath);

			for (const file of files) {
				const value = `/${path.posix.relative(filesPath, file.path).replace('.js', '')}`;
				completions.push({
					label: value,
					kind: vscode.CompletionItemKind.Reference
				});
			}
			console.log(completions);
			return completions;
		}
	},

	/**
     * Get Widget completions
     *
     * @returns {Thenable}
     */
	async getWidgetCompletions() {
		const completions = [];
		let alloyConfigPath = path.join(utils.getAlloyRootPath(), 'config.json');
		const document = await vscode.workspace.openTextDocument(alloyConfigPath);
		let configObj = JSON.parse(document.getText());
		for (let widgetName in (configObj ? configObj.dependencies : undefined)) {
			completions.push({
				label: widgetName,
				kind: vscode.CompletionItemKind.Reference
			});
		}
		return completions;
	},

	async loadCompletions() {
		this.completions = await completionItemProviderHelper.loadCompletions();
	}
};

module.exports = ControllerCompletionItemProvider;
