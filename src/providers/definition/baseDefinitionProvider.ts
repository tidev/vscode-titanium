import * as vscode from 'vscode';

import { DefinitionSuggestion } from './common';
import { BaseProvider } from '../baseProvider';

export class BaseDefinitionProvider extends BaseProvider implements vscode.DefinitionProvider {

	protected suggestions: DefinitionSuggestion[] = [];

	public async provideDefinition (document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Definition|vscode.DefinitionLink[]> {
		const project = await this.getProject(document);
		const results: vscode.DefinitionLink[] = [];

		if (!project) {
			return results;
		}
		const line = document.lineAt(position).text;
		const linePrefix = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
		const wordRange = document.getWordRangeAtPosition(position);
		const word = wordRange ? document.getText(wordRange) : undefined;

		const regExp = /['"]/g;
		let startIndex = 0;
		let endIndex = position.character;

		for (let matches = regExp.exec(line); matches !== null; matches = regExp.exec(line)) {
			if (matches.index < position.character) {
				startIndex = matches.index;
			} else if (matches.index > position.character) {
				endIndex = matches.index;
				break;
			}
		}

		const value = (startIndex && endIndex) ? line.substring(startIndex + 1, endIndex) : '';

		for (const suggestion of this.suggestions) {
			if (suggestion.regExp.test(linePrefix)) {
				if (suggestion.definitionRegExp) {
					const suggestionFiles = await suggestion.files(project, document, word, value);
					const definitionRegExp = suggestion.definitionRegExp(word || value);
					return await this.getReferences<vscode.Location>(suggestionFiles, definitionRegExp, (file: string, range: vscode.Range) => {
						return new vscode.Location(vscode.Uri.file(file), range);
					});
				} else {
					const files = await suggestion.files(project, document, word, value);
					for (const file of files) {
						const link: vscode.DefinitionLink = {
							originSelectionRange: new vscode.Range(position.line, startIndex, position.line, endIndex),
							targetRange: new vscode.Range(0, 0, 0, 0),
							targetUri: vscode.Uri.file(file)
						};
						results.push(link);
					}
				}
			}
		}
		return results;
	}

	/**
	 * Returns matching definitions from given files
	 *
	 * @param {Array} files files to search
	 * @param {RegExp} regExp search pattern
	 * @param {Function} callback function to return item to add to definitions array
	 *
	 * @returns {Array}
	*/
	public async getReferences<T> (files: string[]|string, regExp: RegExp, callback: (file: string, range: vscode.Range) => T): Promise<T[]> {
		const definitions = [];
		if (!Array.isArray(files)) {
			files = [ files ];
		}
		for (const file of files) {
			let document;
			try {
				document = await vscode.workspace.openTextDocument(file);
			} catch (error) {
				// ignore the error, it's most likely the file doesn't exist
				continue;
			}
			if (document.getText().length > 0) {
				const matches = regExp.exec(document.getText());
				if (!matches) {
					continue;
				}
				for (const match of matches) {
					const position = document.positionAt(matches.index);
					definitions.push(callback(file, new vscode.Range(position.line, position.character, position.line, 0)));
				}
			}
		}
		return definitions;
	}
}
