import * as path from 'path';
import * as vscode from 'vscode';
import * as definitionProviderHelper from './definitionProviderHelper';

import { viewSuggestions as suggestions } from './common';

export class ViewCodeActionProvider implements vscode.CodeActionProvider {
	public async provideCodeActions (document: vscode.TextDocument, range: vscode.Range) {
		const linePrefix = document.getText(new vscode.Range(range.end.line, 0, range.end.line, range.end.character));
		const wordRange = document.getWordRangeAtPosition(range.end);
		const word = wordRange ? document.getText(wordRange) : null;
		const codeActions = [];
		// const word = range ? document.getText(range) : null;
		// console.log(linePrefix + ' ' + word);

		if (!word || word.length === 0) {
			return;
		}

		for (const suggestion of suggestions) {
			if (suggestion.regExp.test(linePrefix)) {
				const suggestionFiles = suggestion.files(document, word);
				const definitionRegexp = suggestion.definitionRegExp!(word);
				const definitions: any = await definitionProviderHelper.getReferences(suggestionFiles, definitionRegexp);
				if ((!definitions || definitions.length === 0) && suggestion.insertText) {
					const insertText = suggestion.insertText(word);
					if (insertText) {
						suggestionFiles.forEach((file: string) => {
							codeActions.push({
								title: suggestion.title!(path.parse(file).name),
								command: definitionProviderHelper.insertCommandId,
								arguments: [ insertText, file ]
							});
						});
					}
				} else if ((!definitions || definitions.length === 0) && suggestion.i18nString) {
					codeActions.push({
						title: 'Generate i18n string',
						command: definitionProviderHelper.insertI18nStringCommandId,
						arguments: [ word ]
					});
				}
			}
		}
		return codeActions;
	}
}
