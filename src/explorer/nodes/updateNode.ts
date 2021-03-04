import { BaseNode } from './baseNode';

import { UpdateInfo } from 'titanium-editor-commons/updates';
import { TreeItemCollapsibleState } from 'vscode';

export class UpdateNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'UpdateNode';
	public update: UpdateInfo;
	public parentNode: BaseNode;

	public constructor(label: string, update: UpdateInfo, parentnode: BaseNode) {
		super(label);
		this.update = update;
		this.parentNode = parentnode;
	}

	get tooltip (): string {
		return this.label;
	}
}
