import { completion } from 'titanium-editor-commons';
import { Project } from '../../project';
import * as vscode from 'vscode';
import { ExtensionContainer } from '../../container';
import * as utils from '../../utils';

export const CompletionsFormat = completion.CompletionsFormat.v3;

export abstract class BaseCompletionItemProvider implements vscode.CompletionItemProvider {
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

	public async getProject (document: vscode.TextDocument): Promise< Project|undefined> {
		const filePath = document.uri.fsPath;
		const projectDir = await utils.findProjectDirectory(filePath);
		return ExtensionContainer.projects.get(projectDir);
	}
}
