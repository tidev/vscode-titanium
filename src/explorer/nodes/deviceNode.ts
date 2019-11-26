import { BaseNode } from './baseNode';

import { TreeItemCollapsibleState } from 'vscode';
import { Platform } from '../../types/common';

export class DeviceNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'DeviceNode';

	constructor (
		public readonly label: string,
		public readonly platform: Platform,
		public readonly target: string,
		public readonly deviceId: string,
		public readonly targetId: string,
		public readonly version?: string
	) {
		super(label);
	}

	get tooltip (): string {
		return this.label;
	}
}
