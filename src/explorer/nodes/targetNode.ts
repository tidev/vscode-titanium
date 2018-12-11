import { TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from './baseNode';
import { DeviceNode } from './deviceNode';
import { OSVerNode } from './osVerNode';

import appc from '../../appc';
import { targetForName } from '../../utils';

export class TargetNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Collapsed;
	public readonly contextValue: string = 'TargetNode';
	public readonly targetId: string;

	constructor (
		public readonly label: string,
		public readonly platform: string
	) {
		super(label);
		this.targetId = targetForName(this.label);
	}

	public getChildren () {
		const devices = [];
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
					for (const [ type, emulators ] of Object.entries(appc.androidEmulators()) as any) {
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
		} else if (this.platform === 'windows') {
			switch (this.label) {
				case 'Device':
					for (const device of appc.windowsDevices()) {
						// console.log(device);
					}
					devices.push(new DeviceNode('ws-local', this.platform, 'ws-local', null, this.targetId));
					break;
				case 'Emulator':
					for (const emulator of appc.windowsEmulators()['10.0']) {
						const label = emulator.name.replace('Mobile Emulator ', '');
						devices.push(new DeviceNode(label, this.platform, 'wp-emulator', emulator.udid, this.targetId));
					}
					break;
			}
		}
		return devices;
	}

	get tooltip () {
		return this.label;
	}
}
