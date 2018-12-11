import { BaseNode } from './baseNode';
import { TargetNode } from './targetNode';

import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Commands } from '../../commands/common';
import { nameForPlatform } from '../../utils';

export class PlatformNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Expanded;
	public readonly contextValue: string = 'PlatformNode';
	public readonly platform: string;

	constructor (
		public readonly label: string
	) {
		super(label);
		this.label = nameForPlatform(label);
		this.platform = label;
		this.contextValue = 'PlatformNode';
	}

	public getChildren (): TargetNode[] {
		switch (this.platform) {
			case 'android':
				return [
					new TargetNode('Device', this.platform),
					new TargetNode('Emulator', this.platform)
				];
			case 'ios':
				return [
					new TargetNode('Device', this.platform),
					new TargetNode('Simulator', this.platform)
				];
			case 'windows':
				return [
					new TargetNode('Device', this.platform),
					new TargetNode('Emulator', this.platform)
				];
			default:
				break;
		}
	}

	get tooltip () {
		return this.label;
	}
}
