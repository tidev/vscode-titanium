import * as vscode from 'vscode';
import { provideCodeActions } from './definitionProviderHelper';
import { viewSuggestions as suggestions } from './common';

export class ViewCodeActionProvider implements vscode.CodeActionProvider {
	public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.Command[]> {
		return provideCodeActions(document, range, suggestions);
	}
}
