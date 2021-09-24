import * as path from 'path';
import * as related from '../../related';
import * as utils from '../../utils';
import * as alloyAutoCompleteRules from './alloyAutoCompleteRules';

import { CompletionItem, CompletionItemKind, Position, Range, SnippetString, TextDocument, workspace } from 'vscode';
import { BaseCompletionItemProvider } from './baseCompletionItemProvider';
import { Project } from '../../project';
import { pathExists } from 'fs-extra';
/**
 * Alloy View completion provider
 */
export class ViewCompletionItemProvider extends BaseCompletionItemProvider {
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
		const project = await this.getProject(document);

		if (!project) {
			return [];
		}

		const line = document.lineAt(position).text;
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
		const prefixRange = document.getWordRangeAtPosition(position);
		const prefix = prefixRange ? document.getText(prefixRange) : undefined;

		// opening tag <_ or <Vie_
		if (/^\s*<\/?\w*$/.test(linePrefix)) {
			return this.getTagNameCompletions(line, linePrefix, position, project, prefixRange, prefix);
			// attribute <View _ or <View backg_
		} else if (/^\s*<\w+[\s+\w*="()']*\s+\w*[/]?[>]?$/.test(linePrefix)) {
			return this.getAttributeNameCompletions(linePrefix, position, project, prefix);
			// attribute value <View backgroundColor="_"
		} else if (/^\s*<\w+\s+([\s+\w*="()']*\w*="[\w('./]*"?)*[/]?[>]?$/.test(linePrefix)) {
			// first attempt Alloy rules (i18n, image etc.)
			let ruleResult;
			for (const rule of Object.values(alloyAutoCompleteRules)) {
				if (rule.regExp.test(linePrefix)) {
					ruleResult = await rule.getCompletions(project);
				}
			}
			if (ruleResult) {
				return ruleResult;
			} else {
				return await this.getAttributeValueCompletions(linePrefix, position, document, project, prefix);
			}
		}
		// outside tag, test localised string function
		return await alloyAutoCompleteRules.i18nAutoComplete.getCompletions(project);
	}

	/**
	 * Get tag name completions
	 *
	 * @param {String} line line text
	 * @param {String} linePrefix line prefix text
	 * @param {Position} position caret position
	 * @param {Project} project - The Titanium project instance
	 * @param {Range} prefixRange work prefix range
	 * @param {String} [prefix] word prefix
	 *
	 * @returns {Array}
	 */
	public async getTagNameCompletions (line: string, linePrefix: string, position: Position, project: Project, prefixRange?: Range, prefix?: string): Promise<CompletionItem[]> {
		// ensure prefix contains valid characters
		if (prefix && !/^[a-zA-Z]+$/.test(prefix)) {
			return [];
		}

		const { alloy } = await this.getCompletions(project);
		const { tags } = alloy;
		const completions: CompletionItem[] = [];
		// eslint-disable-next-line security/detect-non-literal-regexp
		const isClosing = new RegExp(`</${prefix || ''}$`).test(linePrefix);
		// eslint-disable-next-line security/detect-non-literal-regexp
		const useSnippet = new RegExp(`^\\s*</?${prefix || ''}\\s*>?\\s*$`).test(line);
		const range = prefixRange ? new Range(position.line, prefixRange.start.character, position.line, line.length) : new Range(position.line, position.character, position.line, line.length);
		for (const tag in tags) {
			if (!prefix || utils.matches(tag, prefix)) {
				const completionItem: CompletionItem = {
					label: tag,
					kind: CompletionItemKind.Class,
					detail: tags[tag].apiName
				};
				if (useSnippet) {
					completionItem.insertText = isClosing ? new SnippetString(`${tag}>`) : new SnippetString(`${tag}$1>$2</${tag}>`);
					completionItem.range = range;
				}
				completions.push(completionItem);
			}
		}
		return completions;
	}

	/**
	 * Get attribute name completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Position} position caret position
	 * @param {Project} project - The Titanium project instance
	 * @param {String} [prefix] word prefix
	 *
	 * @returns {Array}
	 */
	public async getAttributeNameCompletions (linePrefix: string, position: Position, project: Project, prefix?: string): Promise<CompletionItem[]> {
		const { alloy, titanium } = await this.getCompletions(project);
		const { tags } = alloy;
		const { types } = titanium;
		const completions: CompletionItem[] = [];
		let tagName: string|undefined;
		const matches = linePrefix.match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
		if (matches) {
			tagName = matches[1];
		}

		if (!tagName) {
			return completions;
		}

		const tagAttributes = [ 'id', 'class', 'platform', 'bindId', ...await this.getTagAttributes(tagName, project) ];
		let apiName = tagName;
		if (tags[tagName] && tags[tagName].apiName) {
			apiName = tags[tagName].apiName;
		}
		let events: string[] = [];
		if (types[apiName]) {
			events = types[apiName].events;
		}

		//
		// Class properties
		//
		for (const attribute of tagAttributes) {
			if (!prefix || utils.matches(attribute, prefix)) {
				completions.push({
					label: attribute,
					insertText: new SnippetString(`${attribute}="$1"$0`),
					kind: CompletionItemKind.Property
				});
			}
		}

		//
		// Event names - matches 'on' + event name
		//
		for (const event of events) {
			const attribute = `on${utils.capitalizeFirstLetter(event)}`;
			if (!prefix || utils.matches(attribute, prefix)) {
				completions.push({
					label: attribute,
					kind: CompletionItemKind.Event,
					insertText: new SnippetString(`${attribute}="$1"$0`)
				});
			}
		}

		return completions;
	}

	/**
	 * Get attribute value completions
	 *
	 * @param {String} linePrefix text string upto posiiton
	 * @param {Position} position caret position
	 * @param {TextDocument} document active text document
	 * @param {Project} project - The Titanium project instance
	 * @param {String} [prefix] word prefix
	 *
	 * @returns {Thenable|Array}
	 */
	public async getAttributeValueCompletions (linePrefix: string, position: Position, document: TextDocument, project: Project, prefix?: string): Promise<CompletionItem[]> {
		let values;
		let tag;
		const matches = linePrefix.match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
		const range = document.getWordRangeAtPosition(position, /([\w.$]+)/);
		if (matches) {
			tag = matches[1];
		}
		const attribute = this.getPreviousAttribute(linePrefix, position);
		const completions: CompletionItem[] = [];

		//
		// Related and global TSS
		//
		if (attribute === 'id' || attribute === 'class') {
			const relatedFile = await related.getTargetPath(project, 'tss', document.fileName);
			const appTss = path.join(project.filePath, 'app', 'styles', 'app.tss');

			const files = [];
			// FIXME: This function should be refactored, it's weird that it mutates the completions array
			async function getCompletions (file: string): Promise<void> {
				const doc = await workspace.openTextDocument(file);
				if (doc.getText().length) {
					let regex = /["'](#)([a-z0-9_]+)[[\]=a-z0-9_]*["']\s*:\s*{/ig;
					if (attribute === 'class') {
						regex = /["'](\.)([a-z0-9_]+)[[\]=a-z0-9_]*["']\s*:\s*{/ig;
					}
					values = [];
					for (let mtchs = regex.exec(doc.getText()); mtchs !== null; mtchs = regex.exec(doc.getText())) {
						values.push(mtchs[2]);
					}
					const fileName = path.parse(file).name;
					for (const value of values) {
						if (!prefix || utils.matches(value, prefix)) {
							completions.push({
								label: value,
								kind: CompletionItemKind.Reference,
								detail: fileName
							});
						}
					}
				}
			}

			for (const file of [ relatedFile, appTss ]) {
				if (!file) {
					continue;
				}
				files.push(getCompletions(file));
			}

			await Promise.all(files);
			return completions;

		} else if (attribute === 'src') {

			//
			// Require src attribute
			//
			if (tag === 'Require') {
				const controllerPath = path.join(project.filePath, 'app', 'controllers');
				if (!await pathExists(controllerPath)) {
					return completions;
				}

				const files = utils.filterJSFiles(controllerPath);
				const relatedControllerFile = await related.getTargetPath(project, 'js', document.fileName);
				for (const file of files) {
					if (relatedControllerFile === file.path) {
						continue;
					}
					const value = utils.toUnixPath(file.path.replace(controllerPath, '').split('.')[0]);
					completions.push({
						label: value,
						kind: CompletionItemKind.Reference
					});
				}
				return completions;
			//
			// Widget src attribute
			//
			} else if (tag === 'Widget') {
				const alloyConfigPath = path.join(project.filePath, 'app', 'config.json');
				const doc = await workspace.openTextDocument(alloyConfigPath);
				const configObj = JSON.parse(doc.getText());
				for (const widgetName of Object.keys(configObj.dependencies)) {
					completions.push({
						label: widgetName,
						kind: CompletionItemKind.Reference
					});
				}
				return completions;
			}
		} else if (attribute === 'module') {
			const libDirectory = path.join(project.filePath, 'app', 'lib');
			const files = utils.filterJSFiles(libDirectory);
			const createFunction = `create${tag}`;

			for (const file of files) {
				const document = await workspace.openTextDocument(file.path);
				if (document.getText().includes(createFunction)) {
					const value = utils.toUnixPath(file.path.replace(libDirectory, '').split('.')[0]);
					completions.push({
						label: value,
						kind: CompletionItemKind.Reference,
						detail: document.fileName
					});
				}
			}
		}

		//
		// Attribute values for prefix
		//
		if (completions.length === 0 && attribute) {
			values = await this.getAttributeValues(attribute, project);
			for (let value of values) {
				value = value.replace(/["']/g, '');
				if (!prefix || utils.matches(value, prefix)) {
					completions.push({
						label: value,
						range,
						kind: CompletionItemKind.Value
					});
				}
			}
		}

		return completions;
	}

	/**
	 * Get tag attributes
	 *
	 * @param {String} tag tag name
	 * @param {Project} project - The Titanium project instance

	 * @returns {Array}
	 */
	public async getTagAttributes (tag: string, project: Project): Promise<string[]> {
		const { alloy, titanium } = await this.getCompletions(project);
		const { tags } = alloy;
		const { types } = titanium;
		const apiName = tags[tag]?.apiName;
		const type = types[apiName];
		if (type) {
			return type.properties;
		}
		return [];
	}

	/**
	 * Get attribute values
	 *
	 * @param {String} attributeName attribute name
	 *@param {Project} project - The Titanium project instance

	 * @returns {Array}
	 */
	public async getAttributeValues (attributeName: string, project: Project): Promise<string[]> {
		const { titanium } = await this.getCompletions(project);
		const { properties } = titanium;
		const attribute = properties[attributeName];
		if (attribute) {
			return attribute.values;
		}
		return [];
	}

	/**
	 * Get previous attribute
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Position} position caret position
	 *
	 * @returns {String}
	 */
	public getPreviousAttribute (linePrefix: string, position: Position): string|undefined {
		// Remove everything until the opening quote
		let quoteIndex = position.character - 1;
		while (linePrefix[quoteIndex] && !([ '"', '\'' ].includes(linePrefix[quoteIndex]))) {
			quoteIndex--;
		}
		linePrefix = linePrefix.substring(0, quoteIndex);
		const matches = /\s+([a-zA-Z][-a-zA-Z]*)\s*=\s*/.exec(linePrefix);
		if (matches && matches.length >= 2) {
			return matches[1];
		}
	}
}
