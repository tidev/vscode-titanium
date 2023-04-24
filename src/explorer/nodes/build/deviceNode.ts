import { BaseNode } from '../baseNode';

import { TreeItemCollapsibleState } from 'vscode';
import { Platform, ProjectType } from '../../../types/common';
import { DevelopmentTarget } from '../../../types/cli';

export class DeviceNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'DeviceNode';

	constructor (
		public override readonly label: string,
		public readonly platform: Platform,
		public readonly target: string,
		public override readonly deviceId: string,
		public override readonly targetId: DevelopmentTarget,
		public override readonly version?: string,
		public readonly projectType?: ProjectType
	) {
		super(label);

		if (projectType === 'module') {
			this.contextValue = 'ModuleDeviceNode';
		}
	}

	get tooltip (): string {
		return this.label;
	}
}
