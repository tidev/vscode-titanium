import { completion } from 'titanium-editor-commons';
import project from '../../project';
import * as vscode from 'vscode';

export const CompletionsFormat = completion.CompletionsFormat.v3;

export abstract class BaseCompletionItemProvider implements vscode.CompletionItemProvider {
	public CompletionsFormat = CompletionsFormat;
	public completions: any

	public abstract provideCompletionItems (document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]>

	public async loadCompletions (): Promise<void> {
		const sdk = project.sdk()[0];

		if (!this.completions) {
			this.completions = await completion.loadCompletions(sdk, this.CompletionsFormat);
		}
	}
}
