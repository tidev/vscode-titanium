import { TreeItemCollapsibleState } from 'vscode';
import { BaseNode } from './baseNode';
import { DeviceNode } from './deviceNode';
import { OSVerNode } from './osVerNode';

import * as semver from 'semver';
import appc from '../../appc';
import { Platform } from '../../types/common';
import { targetForName } from '../../utils';

export class TargetNode extends BaseNode {

	public readonly collapsibleState = TreeItemCollapsibleState.Collapsed;
	public readonly contextValue: string = 'TargetNode';
	public readonly targetId: string;

	constructor (
		public readonly label: string,
		public readonly platform: Platform
	) {
		super(label);
		this.targetId = targetForName(this.label, this.platform);
	}

	public getChildren (): Array<OSVerNode|DeviceNode> {
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
		} else if (this.platform === 'windows') {
			switch (this.label) {
				case 'Device':
					for (const device of appc.windowsDevices()) {
						devices.push(new DeviceNode(device.name, this.platform, this.label, device.udid, this.targetId));
					}
					devices.push(new DeviceNode('Local Machine', this.platform, 'ws-local', 'ws-local', 'ws-local'));
					break;
				case 'Emulator':
					const emulatorVersions: Set<string> = new Set();
					for (const emulator of appc.windowsEmulators()['10.0']) {
						emulatorVersions.add(emulator.uapVersion);
					}
					// Sort into descending value
					const orderedVersions = Array.from(emulatorVersions).sort((a, b) => {
						return semver.compare(semver.coerce(a)!, semver.coerce(b)!);
					}).reverse();
					for (const version of orderedVersions) {
						devices.push(new OSVerNode(version, Platform.windows, 'wp-emulator'));
					}
					break;
			}
		}
		return devices;
	}

	get tooltip (): string {
		return this.label;
	}
}
