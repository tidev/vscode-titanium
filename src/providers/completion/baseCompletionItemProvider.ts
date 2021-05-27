import { completion } from 'titanium-editor-commons';
import { Project } from '../../project';
import * as vscode from 'vscode';
import { BaseProvider } from '../baseProvider';

export const CompletionsFormat = completion.CompletionsFormat.v3;

export abstract class BaseCompletionItemProvider extends BaseProvider implements vscode.CompletionItemProvider {
	public CompletionsFormat = CompletionsFormat;
	public completions: any
	public completionsMap = new Map<string, any>();

	public abstract provideCompletionItems (document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]>

	public async loadCompletions (sdk: string): Promise<void> {
		if (!this.completions) {
			this.completions = await completion.loadCompletions(sdk, this.CompletionsFormat);
			this.completionsMap.set(sdk, this.completions);
		}
	}

	public async getCompletions (proj: Project): Promise<any> {
		const sdk = proj.sdk()[0];
		if (!this.completionsMap.has(sdk)) {
			await this.loadCompletions(sdk);
		}

		return this.completionsMap.get(sdk);
	}
}
