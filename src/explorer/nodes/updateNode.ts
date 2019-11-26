import { BaseNode } from './baseNode';

import { UpdateInfo } from 'titanium-editor-commons/updates';
import { TreeItemCollapsibleState } from 'vscode';

export class UpdateNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'UpdateNode';

	constructor (
		public readonly label: string,
		public readonly update: UpdateInfo
	) {
		super(label);
		this.contextValue = 'UpdateNode';
	}

	get tooltip (): string {
		return this.label;
	}
}
