const vscode = require('vscode');
const SnippetString = vscode.SnippetString;
const Range = vscode.Range;
const _ = require('underscore');
const path = require('path');
const find = require('find');
const utils = require('../utils');
const related = require('../related');
const alloyAutoCompleteRules = require('./alloyAutoCompleteRules');

/**
 * Alloy View completion provider
*/
const ViewCompletionProvider = {

	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable|Array}
	 */
	provideCompletionItems(document, position) {
		const line = document.lineAt(position).text;
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
		const prefixRange = document.getWordRangeAtPosition(position);
		const prefix = prefixRange ? document.getText(prefixRange) : null;

		if (!this.completions) {
			this.loadCompletions();
		}

		// opening tag <_ or <Vie_
		if (/^\s*<\/?\w*$/.test(linePrefix)) {
			return this.getTagNameCompletions(line, linePrefix, prefix, position, prefixRange);
			// attribute <View _ or <View backg_
		} else if (/^\s*<\w+[\s+\w*="()']*\s+\w*$/.test(linePrefix)) {
			return this.getAttributeNameCompletions(linePrefix, position, prefix);
			// attribute value <View backgroundColor="_"
		} else if (/^\s*<\w+\s+[\s+\w*="()']*\w*="[\w('.]*$/.test(linePrefix)) {
			// first attempt Alloy rules (i18n, image etc.)
			let ruleResult;
			_.find(alloyAutoCompleteRules, rule => ruleResult = rule.getCompletions(linePrefix, position, prefix));
			if (ruleResult) {
				return ruleResult;
			} else {
				return this.getAttributeValueCompletions(linePrefix, position, prefix, document);
			}
		}
		// outside tag, test localised string function
		return alloyAutoCompleteRules.i18n.getCompletions(linePrefix, position, prefix);
	},

	/**
	 * Load completions list
	 *
	 * @returns {Object}
	*/
	loadCompletions() {
		this.completions = require('./completions');
		return _.extend(this.completions.properties, {
			id: {
				description: 'TSS id'
			},
			class: {
				description: 'TSS class'
			},
			platform: {
				type: 'String',
				description: 'Platform condition',
				values: [
					'android',
					'ios',
					'mobileweb',
					'windows'
				]
			}
		});
	},

	/**
	 * Get tag name completions
	 *
	 * @param {String} line line text
	 * @param {String} linePrefix line prefix text
	 * @param {String} prefix word prefix
	 * @param {Position} position caret position
	 * @param {Range} prefixRange work prefix range
	 *
	 * @returns {Array}
	 */
	getTagNameCompletions(line, linePrefix, prefix, position, prefixRange) {
		// ensure prefix contains valid characters
		if (!/^[a-zA-Z]+$/.test(prefix)) {
			return [];
		}
		const completions = [];
		const isClosing = new RegExp(`</${prefix || ''}$`).test(linePrefix);
		const useSnippet = new RegExp(`^\\s*</?${prefix || ''}\\s*>?\\s*$`).test(line);
		const range = prefixRange ? new Range(position.line, prefixRange.start.character, position.line, line.length) : new Range(position.line, position.character, position.line, line.length);
		for (let tag in this.completions.tags) {
			if (!prefix || this.matches(tag, prefix)) {
				let completion = {
					label: tag,
					kind: vscode.CompletionItemKind.Class,
					detail: this.completions.tags[tag].apiName
				};
				if (useSnippet) {
					completion.insertText = isClosing ? new SnippetString(`${tag}>`) : new SnippetString(`${tag}$1>$2</${tag}>`);
					completion.range = range;
				}
				completions.push(completion);
			}
		}
		return completions;
	},

	/**
	 * Get attribute name completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Position} position caret posiiton
	 * @param {String} prefix prefix text
	 *
	 * @returns {Array}
	 */
	getAttributeNameCompletions(linePrefix, position, prefix) {
		let completions = [];
		let tagName;
		const matches = linePrefix.match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
		if (matches) {
			tagName = matches[1];
		}
		let tagAttributes = this.getTagAttributes(tagName).concat([ 'id', 'class', 'platform', 'bindId' ]);
		let apiName = tagName;
		if (this.completions.tags[tagName] && this.completions.tags[tagName].apiName) {
			apiName = this.completions.tags[tagName].apiName;
		}
		let events = [];
		if (this.completions.types[apiName]) {
			events = this.completions.types[apiName].events;
		}

		//
		// Class properties
		//
		for (const attribute of tagAttributes) {
			if (!prefix || this.matches(attribute, prefix)) {
				completions.push({
					label: attribute,
					insertText: new SnippetString(`${attribute}="$1"$0`),
					kind: vscode.CompletionItemKind.Property
				});
			}
		}

		//
		// Event names - matches 'on' + event name
		//
		for (const event of events) {
			const attribute = `on${utils.capitalizeFirstLetter(event)}`;
			if (!prefix || this.matches(attribute, prefix)) {
				completions.push({
					label: attribute,
					kind: vscode.CompletionItemKind.Event,
					insertText: new SnippetString(`${attribute}="$1"$0`)
				});
			}
		}

		return completions;
	},

	/**
	 * Get attribute value completions
	 *
	 * @param {String} linePrefix text string upto posiiton
	 * @param {Position} position caret position
	 * @param {String} prefix word prefix
	 * @param {TextDocument} document active text document
	 *
	 * @returns {Thenable|Array}
	 */
	getAttributeValueCompletions(linePrefix, position, prefix, document) {
		let values;
		let tag;
		let matches = linePrefix.match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
		if (matches) {
			tag = matches[1];
		}
		let attribute = this.getPreviousAttribute(linePrefix, position);
		let completions = [];

		//
		// realted and global TSS
		//
		if (utils.getAlloyRootPath()) {

			return new Promise((resolve) => {
				if ((attribute === 'id') || (attribute === 'class')) {
					const relatedFile = related.getTargetPath('tss', document.fileName);
					const appTss = path.join(vscode.workspace.rootPath, 'app', 'styles', 'app.tss');

					const files = [];
					[ relatedFile, appTss ].forEach(file => {
						files.push(new Promise((resolve) => {
							vscode.workspace.openTextDocument(file).then(document => {
								if (document.getText().length > 0) {
									let regex = /["'](#)([a-z0-9_]+)[[\]=a-z0-9_]*["']\s*:\s*{/ig;
									if (attribute === 'class') {
										regex = /["'](\.)([a-z0-9_]+)[[\]=a-z0-9_]*["']\s*:\s*{/ig;
									}
									values = [];
									while ((matches = regex.exec(document.getText())) !== null) {
										values.push(matches[2]);
									}
									const fileName = path.parse(file).name;
									for (const value of values) {
										if (!prefix || this.matches(value, prefix)) {
											completions.push({
												label: value,
												kind: vscode.CodeActionKind.Reference,
												detail: fileName
											});
										}
									}
								}
								resolve();
							});
						}));
					});

					Promise.all(files).then(() => {
						resolve(completions);
					});

				} else if (attribute === 'src') {

					//
					// Require src attribute
					//
					if (tag === 'Require') {
						let controllerPath = path.join(utils.getAlloyRootPath(), 'controllers');
						if (utils.directoryExists(controllerPath)) {
							let files = find.fileSync(/\.js$/, controllerPath);
							const relatedControllerFile = related.getTargetPath('js', document.fileName);
							for (const file of files) {
								if (relatedControllerFile === file) {
									continue;
								}
								let value = utils.toUnixPath(file.replace(controllerPath, '').split('.')[0]);
								completions.push({
									label: value,
									kind: vscode.CompletionItemKind.Reference
								});
							}
						}

						resolve(completions);

						//
						// Widget src attribute
						//
					} else if (tag === 'Widget') {
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
					}
				} else {
					resolve([]);
				}
			});
		}

		//
		// Attribute values for prefix
		//
		if (completions.length === 0) {
			values = this.getAttributeValues(attribute);
			for (let value of values) {
				value = value.replace(/["']/g, '');
				if (!prefix || this.matches(value, prefix)) {
					completions.push({
						label: value,
						kind: vscode.CompletionItemKind.Value
					});
				}
			}
		}

		return completions;
	},

	/**
	 * Matches
	 *
	 * @param {String} text text to test
	 * @param {String} test text to look for
	 *
	 * @returns {Boolean}
	 */
	matches(text, test) {
		return new RegExp(test, 'i').test(text);
	},

	/**
	 * Get tag attributes
	 *
	 * @param {String} tag tag name
	 *
	 * @returns {Array}
	 */
	getTagAttributes(tag) {
		const type = this.completions.types[this.completions.tags[tag] ? this.completions.tags[tag].apiName : undefined];
		if (type) {
			return type.properties;
		}
		return [];
	},

	/**
	 * Get attribute values
	 *
	 * @param {String} attribute attribute name
	 *
	 * @returns {Array}
	 */
	getAttributeValues(attribute) {
		attribute = this.completions.properties[attribute];
		return (attribute ? attribute.values : undefined) ? (attribute ? attribute.values : undefined) : [];
	},

	/**
	 * Get previous attribute
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Position} position caret position
	 *
	 * @returns {String}
	 */
	getPreviousAttribute(linePrefix, position) {
		// Remove everything until the opening quote
		let quoteIndex = position.character - 1;
		while (linePrefix[quoteIndex] && !([ '"', '\'' ].includes(linePrefix[quoteIndex]))) {
			quoteIndex--;
		}
		linePrefix = linePrefix.substring(0, quoteIndex);
		const matches = /\s+([a-zA-Z][-a-zA-Z]*)\s*=\s*$/.exec(linePrefix);
		if (matches && matches.length >= 2) {
			return matches[1];
		}
	},
};

module.exports = ViewCompletionProvider;
