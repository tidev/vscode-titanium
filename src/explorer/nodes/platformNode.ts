import { BaseNode } from './baseNode';
import { TargetNode } from './targetNode';

import { TreeItemCollapsibleState } from 'vscode';
import { Platform, PlatformPretty } from '../../types/common';
import { nameForPlatform } from '../../utils';

export class PlatformNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Expanded;
	public readonly contextValue: string = 'PlatformNode';
	public readonly label: PlatformPretty;
	public readonly platform: Platform;

	constructor (platform: Platform) {
		super(platform);
		this.label = nameForPlatform(platform)!;
		this.platform = platform;
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
				return [];
		}
	}

	get tooltip (): string {
		return this.label;
	}
}
