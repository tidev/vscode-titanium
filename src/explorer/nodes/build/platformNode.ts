import * as semver from 'semver';
import { BaseNode } from '../baseNode';
import { TargetNode } from './targetNode';
import { DistributeNode } from './distributeNode';
import { ModuleBuildNode } from '../build/module/moduleBuildNode';
import { ModulePackageNode } from '../build/module/modulePackageNode';

import { TreeItemCollapsibleState } from 'vscode';
import { Platform, PlatformPretty } from '../../../types/common';
import { nameForPlatform } from '../../../utils';
import { ExtensionContainer } from '../../../container';
import { DeviceNode } from './deviceNode';

export class PlatformNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Expanded;
	public readonly contextValue: string = 'PlatformNode';
	public override readonly label: PlatformPretty;
	public readonly platform: Platform;

	constructor (platform: Platform) {
		super(platform);
		this.label = nameForPlatform(platform);
		this.platform = platform;
	}

	public override getChildren (): Array<DistributeNode|TargetNode>|Array<ModuleBuildNode|ModulePackageNode|TargetNode> {
		// Detect the first project to see whether we show the full explorer or a limited explorer
		const project = Array.from(ExtensionContainer.projects.values())[0];
		if (project.type === 'module') {
			return this.getModuleChildrenNodes();
		} else {
			return this.getAppChildrenNodes();
		}
	}

	get tooltip (): string {
		return this.label;
	}

	private getModuleChildrenNodes() {
		const selectedSDK = ExtensionContainer.environment.selectedSdk();

		if (selectedSDK && semver.gte(selectedSDK.version, '12.1.0')) {
			switch (this.platform) {
				case 'android':
					return [
						new ModulePackageNode('Package', this.platform, this.label),
						new TargetNode('Device', this.platform, 'module'),
						new TargetNode('Emulator', this.platform, 'module'),
					];
				case 'ios':
					return [
						new ModulePackageNode('Package', this.platform, this.label),
						new TargetNode('Device', this.platform, 'module'),
						new TargetNode('Simulator', this.platform, 'module'),
					];
				default:
					return [];
			}
		} else {
			return [
				new ModuleBuildNode('Build', this.platform, this.label),
				new ModulePackageNode('Package', this.platform, this.label)
			];
		}
	}

	private getAppChildrenNodes() {
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
					new DeviceNode('macOS', this.platform, 'macos', '', 'macos'),
					new DistributeNode('Ad Hoc', this.platform, this.label, 'dist-adhoc'),
					new DistributeNode('App Store', this.platform, this.label, 'dist-appstore'),
					new DistributeNode('macOS App Store', this.platform, this.label, 'dist-macappstore'),

				];
			default:
				return [];
		}
	}
}
