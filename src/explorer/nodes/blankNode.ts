import { TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from './baseNode';

export class BlankNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'BlankNode';

	constructor (
		public readonly label: string,
	) {
		super(label);
		this.contextValue = 'BlankNode';
	}

	get tooltip () {
		return this.label;
	}
}
