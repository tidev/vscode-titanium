import { TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from './baseNode';

export class ErrorNode extends BaseNode {
	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public readonly contextValue = 'ErrorNode';

	get tooltip (): string {
		return this.label;
	}
}
