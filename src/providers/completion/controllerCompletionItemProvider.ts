import * as path from 'path';
import * as related from '../../related';
import * as utils from '../../utils';
import * as alloyAutoCompleteRules from './alloyAutoCompleteRules';

import { CompletionItem, CompletionItemKind, Position, Range, SnippetString, TextDocument, workspace } from 'vscode';
import { BaseCompletionItemProvider } from './baseCompletionItemProvider';
import { Project } from '../../project';
import { pathExists } from 'fs-extra';

/**
 * Alloy Controller completion provider
 */
export class ControllerCompletionItemProvider extends BaseCompletionItemProvider {
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
		const linePrefix = document.getText(new Range(position.line, 0, position.line, position.character));
		const project = await this.getProject(document);

		if (!project) {
			return [];
		}

		// Alloy XML ID - $._
		if (/\$\.([-a-zA-Z0-9-_]*)$/.test(linePrefix)) {
			return this.getIdCompletions(project);
		// Alloy XML ID property or function - $.tableView._
		} else if (/\$\.([-a-zA-Z0-9-_]*).([-a-zA-Z0-9-_]*)$/.test(linePrefix)) {
			return this.getMethodAndPropertyCompletions(linePrefix, project);
		// Titanium APIs - Ti.UI._ or Ti._
		} else if (/\s*(?:Ti|Titanium)\.?\S+/i.test(linePrefix)) {
			return this.getTitaniumApiCompletions(linePrefix, project);
		// Event name - $.tableView.addEventListener('click', ...)
		} else if (/\$\.([-a-zA-Z0-9-_]*)\.(add|remove)EventListener\(["']([-a-zA-Z0-9-_/]*)$/.test(linePrefix)) {
			return this.getEventNameCompletions(linePrefix, project);
		// require('')
		} else if (/require\(["']?([^'");]*)["']?\)?$/.test(linePrefix)) {
			const matches = linePrefix.match(/require\(["']?([^'");]*)["']?\)?$/);
			if (!matches) {
				return [];
			}
			const requestedModule = matches[1];
			const range = document.getWordRangeAtPosition(position, /([\w/.$]+)/);
			return this.getFileCompletions('lib', project, requestedModule, range);
		// Alloy.createController('')
		} else if (/Alloy\.(createController|Controllers\.instance)\(["']([-a-zA-Z0-9-_/]*["']?\)?)$/.test(linePrefix)) {
			return this.getFileCompletions('controllers', project);
		// Alloy.createModel('')
		} else if (/Alloy\.(createModel|Models\.instance|createCollection|Collections\.instance)\(["']([-a-zA-Z0-9-_/]*)$/.test(linePrefix)) {
			return this.getFileCompletions('models', project);
		// Alloy.createWidget('')
		} else if (/Alloy\.(createWidget|Widgets\.instance)\(["']([-a-zA-Z0-9-_/.]*)$/.test(linePrefix)) {
			return this.getWidgetCompletions(project);
		// Alloy APIs - Alloy._, but ignore Alloy.CFG. to fall through to else
		} else if (/(?:Alloy)\.?(?!.*CFG)\S+/.test(linePrefix)) {
			return this.getAlloyApiCompletions(linePrefix, project);
		} else {
			for (const rule of Object.values(alloyAutoCompleteRules)) {
				if (rule.regExp.test(linePrefix)) {
					if (rule.requireRange) {
						const range = document.getWordRangeAtPosition(position, rule.rangeRegex);
						return rule.getCompletions(project, range);
					}

					return rule.getCompletions(project);
				}
			}
		}

		return [ { label: 'Ti', kind: CompletionItemKind.Class } ];
	}

	/**
	 * Get ID completions
	 *
	 * @param {Project} project - The Titanium project instance
	 * @returns {Thenable}
	 */
	public async getIdCompletions (project: Project): Promise<CompletionItem[]> {
		const completions: CompletionItem[] = [];
		const relatedFile = await related.getTargetPath(project, 'xml');
		if (!relatedFile) {
			return completions;
		}
		const fileName = relatedFile.split('/').pop();
		const document = await workspace.openTextDocument(relatedFile);
		const regex = /id="(.+?)"/g;
		const ids: string[] = [];
		for (let matches = regex.exec(document.getText()); matches !== null; matches = regex.exec(document.getText())) {
			const id = matches[1];
			if (!ids.includes(id)) {
				completions.push({
					label: id,
					kind: CompletionItemKind.Reference,
					detail: fileName
				});
				ids.push(id);
			}
		}
		return completions;
	}

	/**
	 * Get controller member method and properties completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Project} project - The Titanium project instance
	 *
	 * @returns {Thenable}
	 */
	public async getMethodAndPropertyCompletions (linePrefix: string, project: Project): Promise<CompletionItem[]> {
		const { alloy, titanium } = await this.getCompletions(project);
		const { tags } = alloy;
		const { types } = titanium;

		const matches = linePrefix.match(/\$\.([-a-zA-Z0-9-_]*)\.?$/);

		if (!matches) {
			return [];
		}

		const id = matches[1];

		const completions: CompletionItem[] = [];
		const relatedFile = await related.getTargetPath(project, 'xml');
		if (!relatedFile) {
			return completions;
		}
		const document = await workspace.openTextDocument(relatedFile);
		let tagName;
		// eslint-disable-next-line security/detect-non-literal-regexp
		const regex = new RegExp(`id=["']${id}["']`, 'g');
		const ids = regex.exec(document.getText());
		if (ids) {
			const position = document.positionAt(ids.index);
			const closestId = document.getText(new Range(position.line, 0, position.line, position.character)).match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
			if (closestId) {
				tagName = closestId[1];
			}
		}

		if (tagName && tags[tagName]) {
			const { apiName } = tags[tagName];
			const tagObj = types[apiName];
			if (tagObj) {
				for (const value of tagObj.functions) {
					completions.push({
						label: value,
						kind: CompletionItemKind.Method,
						insertText: new SnippetString(`${value}($1)$0`)
					});
				}

				for (const value of tagObj.properties) {
					completions.push({
						label: value,
						kind: CompletionItemKind.Property,
						insertText: new SnippetString(`${value} = $1$0`)
					});
				}
			}
		}
		return completions;
	}

	/**
	 * Get Titanium API completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Project} project - The Titanium project instance
	 *
	 * @returns {Array}
	 */
	public async getTitaniumApiCompletions (linePrefix: string, project: Project): Promise<CompletionItem[]> {
		const { titanium } = await this.getCompletions(project);
		const { types } = titanium;

		const matches = linePrefix.match(/(Ti\.(?:(?:[A-Z]\w*|iOS|iPad)\.?)*)([a-z]\w*)*$/);
		const completions: CompletionItem[] = [];
		let apiName: string|undefined;
		let attribute: string|undefined;
		if (matches && matches.length === 3) {
			apiName = matches[1];
			if (apiName.lastIndexOf('.') === apiName.length - 1) {
				apiName = apiName.substr(0, apiName.length - 1);
			}
			attribute = matches[2];
		}

		if (attribute && ('iOS'.indexOf(attribute) === 0 || 'iPad'.indexOf(attribute) === 0)) {
			apiName += '.' + attribute;
			attribute = undefined;
		}

		if (!apiName) {
			return completions;
		}

		// suggest class completion
		if (!attribute || attribute.length === 0) {
			for (const key of Object.keys(types)) {
				if (key.indexOf(apiName) === 0 && key.indexOf('_') === -1) {
					const replaceSections = key.split('.');
					completions.push({
						label: key,
						kind: CompletionItemKind.Class,
						insertText: replaceSections[replaceSections.length - 1]
					});
				}
			}
		}

		// if type exists suggest function and properties
		const apiObj = types[apiName];
		if (apiObj) {
			for (const func of apiObj.functions) {
				if ((!attribute || utils.matches(func, attribute)) && func.indexOf('deprecated') === -1) {
					completions.push({
						label: func,
						kind: CompletionItemKind.Method
					});
				}
			}
			for (const property of apiObj.properties) {
				if ((!attribute || utils.matches(property, attribute)) && property.indexOf('deprecated') === -1) {
					completions.push({
						label: property,
						kind: CompletionItemKind.Property
					});
				}
			}
		}

		return completions;
	}

	/**
	 * Get Alloy API completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Project} project - The Titanium project instance
	 *
	 * @returns {Array}
	 */
	public async getAlloyApiCompletions (linePrefix: string, project: Project): Promise<CompletionItem[]> {
		const { alloy } = await this.getCompletions(project);
		const { types } = alloy;
		const matches = linePrefix.match(/(Alloy\.(?:(?:[A-Z]\w*)\.?)*)([a-z]\w*)*$/);
		const completions: CompletionItem[] = [];

		let apiName: string|undefined;
		let attribute: string|undefined;
		if (matches && matches.length === 3) {
			apiName = matches[1];
			if (apiName.lastIndexOf('.') === apiName.length - 1) {
				apiName = apiName.substr(0, apiName.length - 1);
			}
			attribute = matches[2];
		}

		if (!apiName) {
			return completions;
		}

		// suggest class completion
		if (!attribute || attribute.length === 0) {
			for (const key of Object.keys(types)) {
				if (key.indexOf(apiName) === 0 && key.indexOf('_') === -1) {
					const replaceSections = key.split('.');
					completions.push({
						label: key,
						kind: CompletionItemKind.Class,
						insertText: replaceSections[replaceSections.length - 1]
					});
				}
			}
		}

		// if type exists suggest function and properties
		const apiObj = types[apiName];
		if (apiObj) {
			for (const func of apiObj.functions) {
				if ((!attribute || utils.matches(func, attribute)) && func.indexOf('deprecated') === -1) {
					completions.push({
						label: func,
						kind: CompletionItemKind.Method
					});
				}
			}
			for (const property of apiObj.properties) {
				if ((!attribute || utils.matches(property, attribute)) && property.indexOf('deprecated') === -1) {
					completions.push({
						label: property,
						kind: CompletionItemKind.Property
					});
				}
			}
		}

		return completions;
	}

	/**
	 * Get event name completions
	 *
	 * @param {String} linePrefix line prefix text
	 * @param {Project} project - The Titanium project instance
	 *
	 * @returns {Thenable}
	 */
	public async getEventNameCompletions (linePrefix: string, project: Project): Promise<CompletionItem[]> {
		const { alloy, titanium } = await this.getCompletions(project);
		const { tags } = alloy;
		const { types } = titanium;
		const matches = /\$\.([-a-zA-Z0-9-_]*)\.(add|remove)EventListener\(["']([-a-zA-Z0-9-_/]*)$/.exec(linePrefix);
		const completions: CompletionItem[] = [];

		if (!matches) {
			return completions;
		}
		const id = matches[1];
		const relatedFile = await related.getTargetPath(project, 'xml');
		if (!relatedFile) {
			return completions;
		}
		const document = await workspace.openTextDocument(relatedFile);
		let tagName;
		// eslint-disable-next-line security/detect-non-literal-regexp
		const regex = new RegExp(`id=["']${id}["']`, 'g');
		const ids = regex.exec(document.getText());
		if (ids) {
			const position = document.positionAt(ids.index);
			const closestId = document.getText(new Range(position.line, 0, position.line, position.character)).match(/<([a-zA-Z][-a-zA-Z]*)(?:\s|$)/);
			if (closestId) {
				tagName = closestId[1];
			}
		}

		if (tagName && tags[tagName]) {
			const { apiName } = tags[tagName];
			const tagObj = types[apiName];
			for (const event of tagObj.events) {
				completions.push({
					label: event,
					kind: CompletionItemKind.Event,
					detail: apiName
				});
			}
		}
		return completions;
	}

	/**
	 * Get js file completions. Used to return controller, model and require references.
	 *
	 * @param {String} directory alloy directory
	 * @param {Project} project - The Titanium project instance
	 * @param {String} moduleName name of the module
	 * @param {Range} range the range of text to be replaced by the completion
	 *
	 * @returns {Thenable}
	 */
	public async getFileCompletions(directory: string, project: Project, moduleName?: string, range?: Range): Promise<CompletionItem[]> {
		const completions: CompletionItem[] = [];
		const filesPath = path.join(project.filePath, 'app', directory);
		if (moduleName && moduleName.startsWith('/')) {
			moduleName = moduleName.substring(0);
		}

		if (!await pathExists(filesPath)) {
			return completions;
		}

		const files = utils.filterJSFiles(filesPath);

		for (const file of files) {
			const relativePath = path.relative(filesPath, file.path);
			const value = `/${path.posix.format(path.parse(relativePath)).replace('.js', '')}`;
			const completionItem: CompletionItem = {
				label: value,
				kind: CompletionItemKind.Reference
			};
			if (range) {
				completionItem.range = range;
			}
			completions.push(completionItem);
		}
		return completions;
	}

	/**
	 * Get Widget completions
	 *
	 * @param {Project} project - The Titanium project instance
	 * @returns {Thenable}
	 */
	public async getWidgetCompletions (project: Project): Promise<CompletionItem[]> {
		const completions = [];
		const alloyConfigPath = path.join(project.filePath, 'app', 'config.json');
		const document = await workspace.openTextDocument(alloyConfigPath);
		const configObj = JSON.parse(document.getText());
		const dependencies = configObj.dependencies || {};
		for (const widgetName of Object.keys(dependencies)) {
			completions.push({
				label: widgetName,
				kind: CompletionItemKind.Reference
			});
		}
		return completions;
	}
}
