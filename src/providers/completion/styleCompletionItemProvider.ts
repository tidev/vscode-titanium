import { completion } from 'titanium-editor-commons';
import project from '../../project';
import * as related from '../../related';
import * as utils from '../../utils';
import * as alloyAutoCompleteRules from './alloyAutoCompleteRules';

import { CompletionItem, CompletionItemKind, CompletionItemProvider, Position, Range, SnippetString, TextDocument, workspace } from 'vscode';
import { Tag } from 'titanium-editor-commons/completions';

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
	 * @param {CancellationToken} token cancellation token
	 * @param {CompletionContext} context context for completion request
	 *
	 * @returns {Thenable|Array}
	 */
	public async provideCompletionItems (document: TextDocument, position: Position): Promise<CompletionItem[]> {
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character + 1));
		const prefixRange = document.getWordRangeAtPosition(position);
		const prefix = prefixRange ? document.getText(prefixRange) : undefined;
		const completions: CompletionItem[] = [];
		if (!this.completions) {
			await this.loadCompletions();
		}
		// property value - foo: _ or foo: ba_
		if (/\s*\w+\s*:\s*\w*[(]?["'.]?\w*["'.]?[,]?$/.test(linePrefix)) {
			// first attempt Alloy rules (i18n, image etc.)
			let ruleResult: CompletionItem[] = [];
			for (const rule of Object.values(alloyAutoCompleteRules)) {
				if (rule.regExp.test(linePrefix)) {
					ruleResult = await rule.getCompletions();
				}
			}
			if (ruleResult.length) {
				return ruleResult;
			} else {
				return this.getPropertyValueCompletions(linePrefix, position, document, prefix);
			}
		// property name - _ or fo_
		} else if (/^\s*\w*$/.test(linePrefix)) {
			return this.getPropertyNameCompletions(linePrefix, position, document, prefix);
			// class or id - ".foo_ or "#foo
		} else if (/^\s*['"][.#][\w*]["']?$/.test(linePrefix)) {
			return this.getClassOrIdCompletions(linePrefix, position, document, prefix);
			// tag - "Wind_ or "_
		} else if (/^\s*['"][\w*]["']?$/.test(linePrefix)) {
			return this.getTagCompletions(linePrefix, position, document, prefix);
		}

		return completions;
	}

	/**
	 * Get class or ID completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Position} position caret position
	 * @param {TextDocument} document text document for request
	 * @param {String} [prefix] word prefix text
	 *
	 * @returns {Thenable}
	 */
	public async getClassOrIdCompletions (linePrefix: string, position: Position, document: TextDocument, prefix?: string): Promise<CompletionItem[]> {
		const completions: CompletionItem[] = [];
		const values: string[] = [];
		const relatedFile = related.getTargetPath('xml');
		if (!relatedFile) {
			return completions;
		}
		const fileName = relatedFile.split('/').pop();
		const quote = /'/.test(linePrefix) ? '\'' : '"';
		const range = document.getWordRangeAtPosition(position, /\w+["']/);
		const file = await workspace.openTextDocument(relatedFile);
		let regex = /class="(.*?)"/g;
		if (/^['"]#\w*["']?$/.test(linePrefix)) {
			regex = /id="(.*?)"/g;
		}
		for (let matches = regex.exec(file.getText()); matches !== null; matches = regex.exec(file.getText())) {
			for (const value of matches[1].split(' ')) {
				if (value && value.length > 0 && !values.includes(value) && (!prefix || utils.matches(value, prefix))) {
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
		return completions;
	}

	/**
	 * Get tag completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Position} position caret position
	 * @param {TextDocument} document text document for request
	 * @param {String} [prefix] word prefix text
	 *
	 * @returns {Array}
	 */
	public getTagCompletions (linePrefix: string, position: Position, document: TextDocument, prefix?: string): CompletionItem[] {
		const completions: CompletionItem[] = [];
		const range = document.getWordRangeAtPosition(position, /\w+["']/);
		const quote = /'/.test(linePrefix) ? '\'' : '"';
		for (const [ key, value ] of Object.entries(this.completions.alloy.tags) as [ string, Tag ][]) {
			if (!prefix || utils.matches(key, prefix)) {
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
	 * @param {Position} position caret position
	 * @param {TextDocument} document text document for request
	 * @param {String} [prefix] word prefix text
	 *
	 * @returns {Array}
	 */
	public getPropertyNameCompletions (linePrefix: string, position: Position, document: TextDocument, prefix?: string): CompletionItem[] {
		const parentObjName = this.getParentObjectName(position, document);
		const { properties, types } = this.completions.titanium;
		const innerProperties: { [key: string]: unknown } = {};
		const completions: CompletionItem[] = [];

		if (!parentObjName) {
			return completions;
		}

		// Lookup the property data
		const propertyData: { description: string; type: string } = properties[parentObjName];
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

		const candidateProperties = Object.keys(innerProperties).length === 0 ? properties : innerProperties;
		for (const property in candidateProperties) {
			if (!prefix || utils.matches(property, prefix)) {

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
	 * @param {Position} position caret position
	 * @param {TextDocument} document text document for request
	 * @param {String} [prefix] word prefix text
	 *
	 * @returns {Array}
	 */
	public getPropertyValueCompletions (linePrefix: string, position: Position, document: TextDocument, prefix?: string): CompletionItem[] {
		const { properties } = this.completions.titanium;
		const range = document.getWordRangeAtPosition(position, /([\w".'$]+)/);
		const completions: CompletionItem[] = [];

		let property;
		const matches = /^\s*(\S+)\s*:/.exec(linePrefix);
		if (matches && matches.length >= 2) {
			property = matches[1];
		}

		if (!property || !properties[property]) {
			return completions;
		}

		const { values } = properties[property];
		if (!values) {
			return completions;
		}

		for (const value of values) {
			if (!prefix || utils.matches(value, prefix)) {
				completions.push({
					label: value,
					range,
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
	public getParentObjectName (position: Position, document: TextDocument): string|undefined {
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

	public async loadCompletions (): Promise<void> {
		const sdk = project.sdk()[0];
		this.completions = await completion.loadCompletions(sdk, completion.CompletionsFormat.v2);
	}
}
