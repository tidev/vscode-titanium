import * as path from 'path';
import * as related from '../../related';
import * as vscode from 'vscode';

import { DefinitionSuggestion } from './common';
import { BaseProvider } from '../baseProvider';
import { Project } from '../../project';

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
}
