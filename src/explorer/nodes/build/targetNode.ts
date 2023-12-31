import { TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from '../baseNode';
import { DeviceNode } from './deviceNode';
import { DistributeNode } from './distributeNode';
import { OSVerNode } from './osVerNode';

import { Platform, ProjectType } from '../../../types/common';
import { targetForName } from '../../../utils';
import { DevelopmentTarget, PrettyDevelopmentTarget } from '../../../types/cli';
import { BlankNode } from '../../nodes';
import { ExtensionContainer } from '../../../container';
import { GlobalState } from '../../../constants';

export class TargetNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Collapsed;
	public readonly contextValue: string = 'TargetNode';
	public override readonly targetId: DevelopmentTarget;

	constructor (
		public override readonly label: PrettyDevelopmentTarget,
		public readonly platform: Platform,
		public readonly projectType?: ProjectType
	) {
		super(label);
		this.targetId = targetForName(this.label) as DevelopmentTarget;
	}

	public override getChildren (): Array<OSVerNode|DeviceNode|BlankNode> {
		const devices = [];

		// Check if we're refreshing the environment information currently and return early so that
		// the child nodes of each target display the message
		const refreshingEnvironment = ExtensionContainer.context.globalState.get<boolean>(GlobalState.RefreshEnvironment);
		if (refreshingEnvironment) {
			return [ new BlankNode('Refreshing environment') ];
		}

		if (this.platform === 'ios') {
			switch (this.label) {
				case 'Simulator':
					for (const simVer of ExtensionContainer.environment.iOSSimulatorVersions()) {
						devices.push(new OSVerNode(simVer, this.platform, this.label, this.projectType));
					}
					break;
				case 'Device':
					for (const device of ExtensionContainer.environment.iOSDevices()) {
						let label = device.name;
						if (device.productVersion) {
							label = `${label} (${device.productVersion})`;
						}
						devices.push(new DeviceNode(label, this.platform, this.label, device.udid, this.targetId, undefined, this.projectType));
					}
					break;
				case 'Package' as PrettyDevelopmentTarget:
					devices.push(new DistributeNode('Adhoc', this.platform, this.label, 'dist-adhoc'));
					devices.push(new DistributeNode('App Store', this.platform, this.label, 'dist-appstore'));
					break;
			}
		} else if (this.platform === 'android') {
			switch (this.label) {
				case 'Device':
					for (const device of ExtensionContainer.environment.androidDevices()) {
						devices.push(new DeviceNode(device.name, this.platform, this.label, device.id, this.targetId, undefined, this.projectType));
					}
					break;
				case 'Emulator':
					for (const [ type, emulators ] of Object.entries(ExtensionContainer.environment.androidEmulators())) {
						for (const emulator of emulators) {
							let label = `${emulator.name}`;
							if (type === 'Genymotion') {
								label = `${label} (Genymotion)`;
							}
							devices.push(new DeviceNode(label, this.platform, this.label, emulator.id, this.targetId, undefined, this.projectType));
						}
					}
					break;
				case 'Package' as PrettyDevelopmentTarget:
					devices.push(new DistributeNode('Play Store', this.platform, this.label, 'dist-playstore'));
					break;
			}
		}

		if (!devices.length) {
			devices.push(new BlankNode(`No ${this.label.toLowerCase()} detected`));
		}
		return devices;
	}

	get tooltip (): string {
		return this.label;
	}
}
