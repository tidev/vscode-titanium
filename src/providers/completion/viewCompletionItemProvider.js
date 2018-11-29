const vscode = require('vscode');
const SnippetString = vscode.SnippetString;
const Range = vscode.Range;
const path = require('path');
const utils = require('../../utils');
const related = require('../../related');
const alloyAutoCompleteRules = require('./alloyAutoCompleteRules');
const completionItemProviderHelper = require('./completionItemProviderHelper');

/**
 * Alloy View completion provider
*/
const ViewCompletionItemProvider = {

	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable|Array}
	 */
	async provideCompletionItems(document, position) {
		const line = document.lineAt(position).text;
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
		const prefixRange = document.getWordRangeAtPosition(position);
		const prefix = prefixRange ? document.getText(prefixRange) : null;

		if (!this.completions) {
			await this.loadCompletions();
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
			for (const rule of Object.values(alloyAutoCompleteRules)) {
				if (rule.regExp.test(linePrefix)) {
					ruleResult = await rule.getCompletions(linePrefix, position, prefix);
				}
			}
			if (ruleResult) {
				return ruleResult;
			} else {
				return await this.getAttributeValueCompletions(linePrefix, position, prefix, document);
			}
		}
		// outside tag, test localised string function
		return await alloyAutoCompleteRules.i18n.getCompletions(linePrefix, position, prefix);
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
		const { tags } = this.completions.alloy;
		const completions = [];
		const isClosing = new RegExp(`</${prefix || ''}$`).test(linePrefix);
		const useSnippet = new RegExp(`^\\s*</?${prefix || ''}\\s*>?\\s*$`).test(line);
		const range = prefixRange ? new Range(position.line, prefixRange.start.character, position.line, line.length) : new Range(position.line, position.character, position.line, line.length);
		for (const tag in tags) {
			if (!prefix || completionItemProviderHelper.matches(tag, prefix)) {
				let completion = {
					label: tag,
					kind: vscode.CompletionItemKind.Class,
					detail: tags[tag].apiName
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
		const { tags } = this.completions.alloy;
		const { types } = this.completions.titanium;
		let completions = [];
		let tagName;
		const matches = linePrefix.match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
		if (matches) {
			tagName = matches[1];
		}
		let tagAttributes = this.getTagAttributes(tagName).concat([ 'id', 'class', 'platform', 'bindId' ]);
		let apiName = tagName;
		if (tags[tagName] && tags[tagName].apiName) {
			apiName = tags[tagName].apiName;
		}
		let events = [];
		if (types[apiName]) {
			events = types[apiName].events;
		}

		//
		// Class properties
		//
		for (const attribute of tagAttributes) {
			if (!prefix || completionItemProviderHelper.matches(attribute, prefix)) {
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
			if (!prefix || completionItemProviderHelper.matches(attribute, prefix)) {
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
	async getAttributeValueCompletions(linePrefix, position, prefix, document) {
		let values;
		let tag;
		let matches = linePrefix.match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
		if (matches) {
			tag = matches[1];
		}
		let attribute = this.getPreviousAttribute(linePrefix, position);
		const completions = [];

		//
		// Related and global TSS
		//
		if (attribute === 'id' || attribute === 'class') {
			const relatedFile = related.getTargetPath('tss', document.fileName);
			const appTss = path.join(vscode.workspace.rootPath, 'app', 'styles', 'app.tss');

			const files = [];
			async function getCompletions(file) {
				const document = await vscode.workspace.openTextDocument(file);
				if (document.getText().length) {
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
						if (!prefix || completionItemProviderHelper.matches(value, prefix)) {
							completions.push({
								label: value,
								kind: vscode.CodeActionKind.Reference,
								detail: fileName
							});
						}
					}
				}
			}

			for (const file of [ relatedFile, appTss ]) {
				files.push(getCompletions(file));
			}

			await Promise.all(files);
			return completions;

		} else if (attribute === 'src') {

			//
			// Require src attribute
			//
			if (tag === 'Require') {
				const controllerPath = path.join(utils.getAlloyRootPath(), 'controllers');
				if (utils.directoryExists(controllerPath)) {
					const files = utils.filterJSFiles(controllerPath);
					const relatedControllerFile = related.getTargetPath('js', document.fileName);
					for (const file of files) {
						if (relatedControllerFile === file.path) {
							continue;
						}
						const value = utils.toUnixPath(file.path.replace(controllerPath, '').split('.')[0]);
						completions.push({
							label: value,
							kind: vscode.CompletionItemKind.Reference
						});
					}
				}
				return completions;
			//
			// Widget src attribute
			//
			} else if (tag === 'Widget') {
				let alloyConfigPath = path.join(utils.getAlloyRootPath(), 'config.json');
				const document = await vscode.workspace.openTextDocument(alloyConfigPath);
				const configObj = JSON.parse(document.getText());
				for (const widgetName in (configObj ? configObj.dependencies : undefined)) {
					completions.push({
						label: widgetName,
						kind: vscode.CompletionItemKind.Reference
					});
				}
				return completions;
			}
		}

		//
		// Attribute values for prefix
		//
		if (completions.length === 0) {
			values = this.getAttributeValues(attribute);
			for (let value of values) {
				value = value.replace(/["']/g, '');
				if (!prefix || completionItemProviderHelper.matches(value, prefix)) {
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
	 * Get tag attributes
	 *
	 * @param {String} tag tag name
	 *
	 * @returns {Array}
	 */
	getTagAttributes(tag) {
		const { tags } = this.completions.alloy;
		const { types } = this.completions.titanium;
		const type = types[tags[tag] ? tags[tag].apiName : undefined];
		if (type) {
			return type.properties;
		}
		return [];
	},

	/**
	 * Get attribute values
	 *
	 * @param {String} attributeName attribute name
	 *
	 * @returns {Array}
	 */
	getAttributeValues(attributeName) {
		const { properties } = this.completions.titanium;
		const attribute = properties[attributeName];
		if (attribute) {
			return attribute.values;
		}
		return [];
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

	async loadCompletions() {
		this.completions = await completionItemProviderHelper.loadCompletions();
	}
};

module.exports = ViewCompletionItemProvider;
