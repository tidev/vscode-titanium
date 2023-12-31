import { BaseNode } from '../../baseNode';

import { TreeItemCollapsibleState } from 'vscode';
import { Platform } from '../../../../types/common';
import {  } from '../../../../types/cli';

export class ModuleBuildNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'ModuleBuildNode';

	constructor (
		public override readonly label: string,
		public readonly platform: Platform,
		public readonly target: string,
	) {
		super(label);
	}

	get tooltip (): string {
		return this.label;
	}
}
