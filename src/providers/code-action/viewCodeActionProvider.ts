import * as vscode from 'vscode';
import * as path from 'path';

import { BaseProvider } from '../baseProvider';
import { viewSuggestions as suggestions } from '../definition/common';
import { Commands } from '../../commands';

export class ViewCodeActionProvider extends BaseProvider implements vscode.CodeActionProvider {
	public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.Command[]> {
		const project = await this.getProject(document);
		if (!project) {
			return [];
		}
		const linePrefix = document.getText(new vscode.Range(range.end.line, 0, range.end.line, range.end.character));
		const wordRange = document.getWordRangeAtPosition(range.end);
		const word = wordRange ? document.getText(wordRange) : null;
		const codeActions: vscode.Command[] = [];

		if (!word || word.length === 0) {
			return codeActions;
		}

		for (const suggestion of suggestions) {
			if (suggestion.regExp.test(linePrefix)) {
				const suggestionFiles = await suggestion.files(project, document, word);
				const index = suggestionFiles.indexOf(path.join(project.filePath, 'app', 'styles', 'app.tss'));
				if (index >= 0) {
					suggestionFiles.splice(index, 1);
				}

				if (!suggestion.definitionRegExp || !suggestion.title) {
					continue;
				}

				const definitionRegexp = suggestion.definitionRegExp(word);
				const definitions = await this.getReferences(suggestionFiles, definitionRegexp, () => {
					return {};
				});
				if (!definitions?.length && suggestion.insertText) {
					const insertText = suggestion.insertText(word);
					if (!insertText) {
						continue;
					}
					for (const file of suggestionFiles) {
						codeActions.push({
							title: suggestion.title(path.parse(file).name),
							command: Commands.InsertCommandId,
							arguments: [ insertText, file ]
						});
					}
				} else if (!definitions?.length && suggestion.i18nString) {
					codeActions.push({
						title: 'Generate i18n string',
						command: Commands.InsertI18nStringCommandId,
						arguments: [ word, project ]
					});
				}
			}
		}
		return codeActions;
	}
}
