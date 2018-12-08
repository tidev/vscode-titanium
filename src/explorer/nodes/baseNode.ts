import { TreeItem, TreeItemCollapsibleState } from 'vscode';
export default abstract class BaseNode {

	public readonly label: string;
	public abstract readonly contextValue: string;

	constructor (label) {
		this.label = label;
	}

	public getTreeItem (): TreeItem {
		return {
			label: this.label,
			collapsibleState: TreeItemCollapsibleState.Collapsed,
			contextValue: this.contextValue
		};
	}

	public getChildren (element: BaseNode): BaseNode[] | Promise<BaseNode[]>  {
		return [];
	}
}
