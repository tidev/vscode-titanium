import { TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from './baseNode';
import { DeviceNode } from './deviceNode';
import { OSVerNode } from './osVerNode';

import appc from '../../appc';
import { Platform } from '../../types/common';
import { targetForName } from '../../utils';
import { DevelopmentTarget } from '../../types/cli';
import { BlankNode } from '../nodes';
import { ExtensionContainer } from '../../container';
import { GlobalState } from '../../constants';

export class TargetNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Collapsed;
	public readonly contextValue: string = 'TargetNode';
	public readonly targetId: DevelopmentTarget;

	constructor (
		public readonly label: string,
		public readonly platform: Platform
	) {
		super(label);
		this.targetId = targetForName(this.label) as DevelopmentTarget;
	}

	public getChildren (): Array<OSVerNode|DeviceNode|BlankNode> {
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
					for (const simVer of appc.iOSSimulatorVersions()) {
						devices.push(new OSVerNode(simVer, this.platform, this.label));
					}
					break;
				case 'Device':
					for (const device of appc.iOSDevices()) {
						let label = device.name;
						if (device.productVersion) {
							label = `${label} (${device.productVersion})`;
						}
						devices.push(new DeviceNode(label, this.platform, this.label, device.udid, this.targetId));
					}
					break;
			}
		} else if (this.platform === 'android') {
			switch (this.label) {
				case 'Device':
					for (const device of appc.androidDevices()) {
						devices.push(new DeviceNode(device.name, this.platform, this.label, device.id, this.targetId));
					}
					break;
				case 'Emulator':
					for (const [ type, emulators ] of Object.entries(appc.androidEmulators())) {
						for (const emulator of emulators) {
							let label = `${emulator.name}`;
							if (type === 'Genymotion') {
								label = `${label} (Genymotion)`;
							}
							devices.push(new DeviceNode(label, this.platform, this.label, emulator.id, this.targetId));
						}
					}
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
