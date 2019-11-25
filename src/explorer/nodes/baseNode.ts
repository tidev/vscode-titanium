import { TreeItem, TreeItemCollapsibleState } from 'vscode';
export abstract class BaseNode {

	public abstract readonly collapsibleState: TreeItemCollapsibleState;
	public abstract readonly contextValue: string;
	public readonly deviceId: string | undefined;
	public readonly label: string;
	public readonly targetId: string | undefined;
	public readonly version?: string | undefined;
	constructor (label: string) {
		this.label = label;
	}

	public getTreeItem (element: BaseNode): TreeItem {
		return element;
	}

	public getChildren (element: BaseNode): BaseNode[] | Promise<BaseNode[]>  {
		return [];
	}
}
