import { BaseNode } from './baseNode';
import { TreeItemCollapsibleState } from 'vscode';
import { UpdateNode } from './updateNode';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { BlankNode } from './blankNode';
import { ExtensionContainer } from '../../container';

export class UpdatesNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Collapsed;
	public readonly contextValue: string = 'UpdatesNode';

	private updateInfo: UpdateInfo[] = [];

	public async getChildren(): Promise<Array<BlankNode|UpdateNode>> {
		try {
			this.updateInfo = await ExtensionContainer.getUpdates();
		} catch (error) {
			return [ new BlankNode('Failed to get updates') ];
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
