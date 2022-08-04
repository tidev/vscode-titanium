import { BaseNode } from './baseNode';
import { TreeItemCollapsibleState } from 'vscode';
import { UpdateNode } from './updateNode';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { BlankNode } from './blankNode';
import { ExtensionContainer } from '../../container';
import { ErrorNode } from './errorNode';

export class UpdatesNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Collapsed;
	public readonly contextValue: string = 'UpdatesNode';

	private updateInfo: UpdateInfo[] = [];

	public override async getChildren(): Promise<Array<BlankNode|UpdateNode>> {
		try {
			this.updateInfo = await ExtensionContainer.getUpdates();
		} catch (error) {
			ExtensionContainer.outputChannel.appendLine('Failed to get updates, error was:');
			if (error instanceof Error) {
				ExtensionContainer.outputChannel.appendLine(error?.stack || '');
			} else {
				ExtensionContainer.outputChannel.appendLine(error as string);
			}

			return [ new ErrorNode('Failed to get updates') ];
		}

		if (!this.updateInfo.length) {
			return [ new BlankNode('You\'re fully up to date!') ];
		}

		const updates = [];
		for (const update of this.updateInfo) {
			const { currentVersion, latestVersion, productName } = update;
			const label = `${productName}: ${currentVersion || 'Not Installed'} -> ${latestVersion}`;
			updates.push(new UpdateNode(label, update, this));
		}

		return updates;

	}

	get tooltip (): string {
		return this.label;
	}
}
