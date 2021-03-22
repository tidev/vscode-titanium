import { BaseNode } from './baseNode';

import { TreeItemCollapsibleState } from 'vscode';
import { Platform } from '../../types/common';
import { DeploymentTarget } from '../../types/cli';

export class DistributeNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'DistributeNode';

	constructor (
		public readonly label: string,
		public readonly platform: Platform,
		public readonly target: string,
		public readonly targetId: DeploymentTarget
	) {
		super(label);
	}

	get tooltip (): string {
		return this.label;
	}
}
