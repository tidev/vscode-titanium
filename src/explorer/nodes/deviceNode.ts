import BaseNode from './baseNode';

import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { targetForName } from '../../utils';

export default class DeviceNode extends BaseNode {

	public readonly contextValue: string = 'DeviceNode';

	constructor (
		public readonly label: string,
		public readonly platform: string,
		public readonly target: string,
		public readonly deviceId: string,
		public readonly targetId: string,
		public readonly version?: string
	) {
		super(label);
	}

	public getTreeItem (): TreeItem {
		return {
			label: this.label,
			collapsibleState: TreeItemCollapsibleState.None,
			contextValue: this.contextValue
		};
			// TODO: Do these get passed through?
			// deviceId: this.deviceId,
			// target: this.target,
			// targetId: this.targetId,
			// platform: this.platform,
	}

	get tooltip () {
		return this.label;
	}
}
