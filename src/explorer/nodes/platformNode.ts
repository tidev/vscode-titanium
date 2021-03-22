import { BaseNode } from './baseNode';
import { TargetNode } from './targetNode';

import { TreeItemCollapsibleState } from 'vscode';
import { Platform, PlatformPretty } from '../../types/common';
import { nameForPlatform } from '../../utils';
import { DistributeNode } from './distributeNode';

export class PlatformNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Expanded;
	public readonly contextValue: string = 'PlatformNode';
	public readonly label: PlatformPretty;
	public readonly platform: Platform;

	constructor (platform: Platform) {
		super(platform);
		this.label = nameForPlatform(platform);
		this.platform = platform;
		this.contextValue = 'PlatformNode';
	}

	public getChildren (): Array<DistributeNode|TargetNode> {
		switch (this.platform) {
			case 'android':
				return [
					new TargetNode('Device', this.platform),
					new TargetNode('Emulator', this.platform),
					new DistributeNode('Play Store', this.platform, this.label, 'dist-playstore')
				];
			case 'ios':
				return [
					new TargetNode('Device', this.platform),
					new TargetNode('Simulator', this.platform),
					new DistributeNode('Ad Hoc', this.platform, this.label, 'dist-adhoc'),
					new DistributeNode('App Store', this.platform, this.label, 'dist-appstore')

				];
			default:
				return [];
		}
	}

	get tooltip (): string {
		return this.label;
	}
}
