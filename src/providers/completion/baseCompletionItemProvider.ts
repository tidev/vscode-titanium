import { CompletionsData, CompletionsFormat as Format, loadCompletions } from 'titanium-editor-commons/completions';
import { Project } from '../../project';
import * as vscode from 'vscode';
import { BaseProvider } from '../baseProvider';

export const CompletionsFormat = Format.v3;

export abstract class BaseCompletionItemProvider extends BaseProvider implements vscode.CompletionItemProvider {
	public CompletionsFormat = CompletionsFormat;
	public completionsMap = new Map<string, CompletionsData>();

	public abstract provideCompletionItems (document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]>

	public async getCompletions (proj: Project): Promise<CompletionsData> {
		const sdk = proj.sdk()[0];

		let completions = this.completionsMap.get(sdk);
		if (completions) {
			return completions;
		}

		completions = await loadCompletions(sdk, this.CompletionsFormat);
		this.completionsMap.set(sdk, completions);
		return completions;
	}
}
