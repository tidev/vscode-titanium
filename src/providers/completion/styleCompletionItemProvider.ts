
import { completion } from 'titanium-editor-commons';
import * as _ from 'underscore';
import project from '../../project';
import * as related from '../../related';
import * as alloyAutoCompleteRules from './alloyAutoCompleteRules';

import { CompletionItemKind, CompletionItemProvider, Range, SnippetString, workspace } from 'vscode';

/**
 * Alloy Style completion provider
 */
export class StyleCompletionItemProvider implements CompletionItemProvider {

	private completions: any;
	/**
	 * Provide completion items
	 *
	 * @param {TextDocument} document active text document
	 * @param {Position} position caret position
	 *
	 * @returns {Thenable|Array}
	 */
	public async provideCompletionItems (document, position) {
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character + 1));
		const prefixRange = document.getWordRangeAtPosition(position);
		const prefix = prefixRange ? document.getText(prefixRange) : null;

		if (!this.completions) {
			await this.loadCompletions();
		}
		// property value - foo: _ or foo: ba_
		if (/\s*\w+\s*:\s*\w*[(]?["'.]?\w*["'.]?[,]?$/.test(linePrefix)) {
			// first attempt Alloy rules (i18n, image etc.)
			let ruleResult;
			for (const rule of Object.values(alloyAutoCompleteRules)) {
				if (rule.regExp.test(linePrefix)) {
					ruleResult = await rule.getCompletions();
				}
			}
			if (ruleResult) {
				return ruleResult;
			} else {
				return this.getPropertyValueCompletions(linePrefix, prefix);
			}
		// property name - _ or fo_
		} else if (/^\s*\w*$/.test(linePrefix)) {
			return this.getPropertyNameCompletions(linePrefix, prefix, position, document);
			// class or id - ".foo_ or "#foo
		} else if (/^\s*['"][.#][\w*]["']?$/.test(linePrefix)) {
			return this.getClassOrIdCompletions(linePrefix, prefix, position, document);
			// tag - "Wind_ or "_
		} else if (/^\s*['"][\w*]["']?$/.test(linePrefix)) {
			return this.getTagCompletions(linePrefix, prefix, position, document);
		}
	}

	/**
	 * Get class or ID completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {String} prefix word prefix text
	 *
	 * @returns {Thenable}
	 */
	public getClassOrIdCompletions (linePrefix, prefix, position, document) {
		return new Promise(resolve => {
			const relatedFile = related.getTargetPath('xml');
			const fileName = relatedFile.split('/').pop();
			const quote = /'/.test(linePrefix) ? '\'' : '\"';
			const range = document.getWordRangeAtPosition(position, /\w+["']/);
			workspace.openTextDocument(relatedFile).then(file => {
				const completions = [];
				const values = [];
				let regex = /class="(.*?)"/g;
				if (/^['"]#\w*["']?$/.test(linePrefix)) {
					regex = /id="(.*?)"/g;
				}
				for (let matches = regex.exec(file.getText()); matches !== null; matches = regex.exec(file.getText())) {
					for (const value of matches[1].split(' ')) {
						if (value && value.length > 0 && !values.includes(value) && (!prefix || completion.matches(value, prefix))) {
							completions.push({
								label: value,
								kind: CompletionItemKind.Reference,
								detail: `${fileName}`,
								range,
								insertText: new SnippetString(`${value}${quote}: {\n\t\${1}\t\n}`)
							});
							values.push(value);
						}
					}
				}
				resolve(completions);
			});
		});
	}

	/**
	 * Get tag completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {String} prefix word prefix text
	 *
	 * @returns {Array}
	 */
	public getTagCompletions (linePrefix, prefix, position, document) {
		const completions = [];
		const range = document.getWordRangeAtPosition(position, /\w+["']/);
		const quote = /'/.test(linePrefix) ? '\'' : '\"';
		for (const [ key, value ] of Object.entries(this.completions.alloy.tags) as any[]) {
			if (!prefix || completion.matches(key, prefix)) {
				completions.push({
					label: key,
					kind: CompletionItemKind.Class,
					detail: value.apiName,
					range,
					insertText: new SnippetString(`${key}${quote}: {\n\t\${1}\t\n}`)
				});
			}
		}

		return completions;
	}

	/**
	 * Get property name completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {String} prefix word prefix text
	 * @param {Position} position caret position
	 * @param {TextDocument} document active text document
	 *
	 * @returns {Array}
	 */
	public getPropertyNameCompletions (linePrefix, prefix, position, document) {
		const parentObjName = this.getParentObjectName(position, document);
		const { properties, types } = this.completions.titanium;
		const innerProperties = {};
		const completions = [];

		// Lookup the property data
		const propertyData = properties[parentObjName];
		if (propertyData) {
			const propertyType = properties[parentObjName].type;
			const typeData = types[propertyType];
			if (typeData && typeData.properties && typeData.properties.length) {
				let completionProperty;
				if (properties[parentObjName]) {
					completionProperty = properties[parentObjName].type;
				}
				for (const property of types[completionProperty].properties) {
					innerProperties[property] = {};
				}
			}
		}

		const candidateProperties = _.isEmpty(innerProperties) ? properties : innerProperties;
		for (const property in candidateProperties) {
			if (!prefix || completion.matches(property, prefix)) {

				//
				// Object types
				//
				const jsObjectTypes = [ 'Font' ];
				if (jsObjectTypes.indexOf(properties[property].type) > -1) {
					completions.push({
						label: property,
						kind: CompletionItemKind.Property,
						insertText: new SnippetString(`${property}: {\n\t\${1}\t\n}`),

					});

					//
					// Value types
					//
				} else {
					completions.push({
						label: property,
						kind: CompletionItemKind.Property,
						insertText: `${property}: `
					});
				}
			}
		}
		return completions;
	}

	/**
	 * Get property value completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {String} prefix word prefix text
	 *
	 * @returns {Array}
	 */
	public getPropertyValueCompletions (linePrefix, prefix) {
		const { properties } = this.completions.titanium;
		let property;
		const matches = /^\s*(\S+)\s*:/.exec(linePrefix);
		if (matches && matches.length >= 2) {
			property = matches[1];
		}

		if (properties[property]) {
			return null;
		}

		const { values } = properties[property];
		if (!values) {
			return null;
		}

		const completions = [];
		for (const value of values) {
			if (!prefix || completion.matches(value, prefix)) {
				completions.push({
					label: value,
					kind: CompletionItemKind.Value
				});
			}
		}

		return completions;
	}

	/**
	 * Get parent object name
	 *
	 * @param {Position} position caret position
	 * @param {TextDocument} document active text document
	 *
	 * @returns {String}
	 */
	public getParentObjectName (position, document) {
		let lineNumber = position.line;
		while (lineNumber >= 0) {
			const line = document.lineAt(lineNumber).text;
			const regexResult = /^\s*(\S+)\s*:\s*\{/.exec(line);
			const propertyName = regexResult ? regexResult[1] : undefined;

			const parentNameIndex = (regexResult ? regexResult.index : undefined) || -1;
			if (parentNameIndex < line.lastIndexOf('}')) {
				return;
			}
			if (propertyName) {
				return propertyName.replace(/["#.]/g, '');
			}
			lineNumber--;
		}
	}

	public async loadCompletions () {
		const sdk = project.sdk()[0];
		this.completions = await completion.loadCompletions(sdk);
	}
}
