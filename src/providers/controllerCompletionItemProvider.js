const vscode = require('vscode');
const SnippetString = vscode.SnippetString;
const Range = vscode.Range;
const _ = require('underscore');
const path = require('path');
const find = require('find');
const utils = require('../utils');
const related = require('../related');
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
	provideCompletionItems(document, position) {
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
		const prefixRange = document.getWordRangeAtPosition(position);
		const prefix = prefixRange ? document.getText(prefixRange) : null;

		if (!this.completions) {
			this.completions = completionItemProviderHelper.loadCompletions();
		}
		console.log(linePrefix);
		// Alloy XML ID - $._
		if (/\$\.([-a-zA-Z0-9-_]*)$/.test(linePrefix)) {
			return this.getIdCompletions(linePrefix, prefix);
		// Alloy XML ID property or function - $.tableView._
		} else if (/\$\.([-a-zA-Z0-9-_]*).([-a-zA-Z0-9-_]*)$/.test(linePrefix)) {
			return this.getMethodAndPropertyCompletions(linePrefix, prefix);
		// Titanium APIs - Ti.UI._ or Ti._
		} else if (/(Ti.(?:(?:[A-Z]\w*|iOS|iPad)\.?)*)([a-z]\w*)*$/.test(linePrefix)) {
			return this.getTitaniumApiCompletions(linePrefix, prefix);
		// Event name - $.tableView.addEventListener('click', ...)
		} else if (/\$\.([-a-zA-Z0-9-_]*)\.(add|remove)EventListener\(["']([-a-zA-Z0-9-_/]*)$/.test(linePrefix)) {
			return this.getEventNameCompletions(linePrefix, prefix);
		// require('')
		} else if (/require\(["']([-a-zA-Z0-9-_/]*)$/.test(linePrefix)) {
			// return this.getRequireCompletions(linePrefix, prefix);
			return this.getFileCompletions('lib');
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
			_.find(alloyAutoCompleteRules, rule => ruleResult = rule.getCompletions(linePrefix, position, prefix));
			if (ruleResult) {
				return ruleResult;
			}
		}
	},

	/**
     * Get ID completions
     *
     * @returns {Thenable}
     */
	getIdCompletions() {
		return new Promise((resolve) => {
			const completions = [];
			const relatedFile = related.getTargetPath('xml');
			const fileName = relatedFile.split('/').pop();
			vscode.workspace.openTextDocument(relatedFile).then(document => {
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
				resolve(completions);
			});
		});

	},

	/**
     * Get controller member method and properties completions
     *
     * @param {String} linePrefix line prefix text
     *
     * @returns {Thenable}
     */
	getMethodAndPropertyCompletions(linePrefix) {
		return new Promise((resolve) => {
			let id = linePrefix.match(/\$\.([-a-zA-Z0-9-_]*)\.?$/)[1];
			const completions = [];
			const relatedFile = related.getTargetPath('xml');
			vscode.workspace.openTextDocument(relatedFile).then(document => {
				let tagName;
				let regex = new RegExp(`id=["']${id}["']`, 'g');
				let matches = regex.exec(document.getText());
				if (matches) {
					const position = document.positionAt(matches.index);
					matches = document.getText(new Range(position.line, 0, position.line, position.character)).match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
					if (matches) {
						tagName = matches[1];
					}
				} else {
					resolve([]);
					return;
				}

				if (tagName && this.completions.tags[tagName]) {
					let { apiName } = this.completions.tags[tagName];
					let tagObj = this.completions.types[apiName];
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
				resolve(completions);
			});
		});
	},

	/**
     * Get Titanium API completions
     *
     * @param {String} linePrefix line prefix text
     *
     * @returns {Array}
     */
	getTitaniumApiCompletions(linePrefix) {
		const matches = linePrefix.match(/(Ti.(?:(?:[A-Z]\w*|iOS|iPad)\.?)*)([a-z]\w*)*$/);
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
			_.each(this.completions.types, function (value, key) {
				if (key.indexOf(apiName) === 0 && key.indexOf('_') === -1) {
					completions.push({
						label: key,
						kind: vscode.CompletionItemKind.Class
					});
				}
			});
		}

		// if type exists suggest function and properties
		const apiObj = this.completions.types[apiName];
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
	getEventNameCompletions(linePrefix) {
		return new Promise((resolve) => {
			const matches = /\$\.([-a-zA-Z0-9-_]*)\.(add|remove)EventListener\(["']([-a-zA-Z0-9-_/]*)$/.exec(linePrefix);
			const id = matches[1];
			const completions = [];
			const relatedFile = related.getTargetPath('xml');
			vscode.workspace.openTextDocument(relatedFile).then(document => {
				let tagName;
				let regex = new RegExp(`id=["']${id}["']`, 'g');
				let matches = regex.exec(document.getText());
				if (matches) {
					const position = document.positionAt(matches.index);
					matches = document.getText(new Range(position.line, 0, position.line, position.character)).match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
					if (matches) {
						tagName = matches[1];
					}
				} else {
					resolve([]);
					return;
				}

				if (tagName && this.completions.tags[tagName]) {
					let { apiName } = this.completions.tags[tagName];
					let tagObj = this.completions.types[apiName];
					for (const event of tagObj.events) {
						completions.push({
							label: event,
							kind: vscode.CompletionItemKind.Event,
							detail: apiName
						});
					}
					resolve(completions);
				}
			});
		});
	},

	/**
     * Get js file completions. Used to return controller, model and require references.
     *
     * @param {String} directory alloy directory
     *
     * @returns {Thenable}
     */
	getFileCompletions(directory) {
		return new Promise((resolve) => {
			let completions = [];
			let filesPath = path.join(utils.getAlloyRootPath(), directory);
			if (utils.directoryExists(filesPath)) {
				find.file(/\.js$/, filesPath, (files) => {
					for (const file of files) {
						let value = '/' + file.replace(filesPath + path.sep, '').split('.')[0];
						completions.push({
							label: value,
							kind: vscode.CompletionItemKind.Reference
						});
					}
					resolve(completions);
				});
			}
		});
	},

	/**
     * Get Widget completions
     *
     * @returns {Thenable}
     */
	getWidgetCompletions() {
		return new Promise((resolve) => {
			const completions = [];
			let alloyConfigPath = path.join(utils.getAlloyRootPath(), 'config.json');
			vscode.workspace.openTextDocument(alloyConfigPath).then(document => {
				let configObj = JSON.parse(document.getText());
				for (let widgetName in (configObj ? configObj.dependencies : undefined)) {
					completions.push({
						label: widgetName,
						kind: vscode.CompletionItemKind.Reference
					});
				}
				resolve(completions);
			});
		});
	},
};

module.exports = ControllerCompletionItemProvider;
