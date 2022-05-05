import { BaseNode } from './baseNode';
import { TargetNode } from './targetNode';
import { DistributeNode } from './distributeNode';
import { ModuleBuildNode } from './moduleBuildNode';
import { ModulePackageNode } from './modulePackageNode';

import { TreeItemCollapsibleState } from 'vscode';
import { Platform, PlatformPretty } from '../../types/common';
import { nameForPlatform } from '../../utils';
import { ExtensionContainer } from '../../container';

export class PlatformNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Expanded;
	public readonly contextValue: string = 'PlatformNode';
	public override readonly label: PlatformPretty;
	public readonly platform: Platform;

	constructor (platform: Platform) {
		super(platform);
		this.label = nameForPlatform(platform);
		this.platform = platform;
		this.contextValue = 'PlatformNode';
	}

	public override getChildren (): Array<DistributeNode|TargetNode>|Array<ModuleBuildNode|ModulePackageNode> {
		// Detect the first project to see whether we show the full explorer or a limited explorer
		const project = Array.from(ExtensionContainer.projects.values())[0];
		if (project.type === 'module') {
			return [
				new ModuleBuildNode('Build', this.platform, this.label),
				new ModulePackageNode('Package', this.platform, this.label)
			];
		}

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
