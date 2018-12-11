import { BaseNode } from './baseNode';

import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { targetForName } from '../../utils';

export class DeviceNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.None;
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

	get tooltip () {
		return this.label;
	}
}
