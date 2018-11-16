const appc = require('../../appc');
const BaseNode = require('./baseNode');
const OSVerNode = require('./osVerNode');
const DeviceNode = require('./deviceNode');
const utils = require('../../utils');
const vscode = require('vscode');
module.exports = class DeviceTypeNode extends BaseNode {
	constructor(label, collapsibleState, platform) {
		super(label, collapsibleState);
		this.platform = platform;
		this.targetId = utils.targetForName(this.label);
	}

	getChildren() {
		const devices = [];
		if (this.platform === 'ios') {
			switch (this.label) {
				case 'Simulator':
					for (const simVer of appc.iOSSimulatorVersions()) {
						devices.push(new OSVerNode(simVer, vscode.TreeItemCollapsibleState.Collapsed, this.platform, this.label));
					}
					break;
				case 'Device':
					for (const device of appc.iOSDevices()) {
						let label = device.name;
						if (device.productVersion) {
							label = `${label} (${device.productVersion})`;
						}
						devices.push(new DeviceNode(label, vscode.TreeItemCollapsibleState.None, this.platform, this.label, device.udid));
					}
					break;
			}
		} else if (this.platform === 'android') {
			switch (this.label) {
				case 'Device':
					for (const device of appc.androidDevices()) {
						devices.push(new DeviceNode(device.name, vscode.TreeItemCollapsibleState.None, this.platform, this.label, device.id));
					}
					break;
				case 'Emulator':
					for (const [ type, emulators ] of Object.entries(appc.androidEmulators())) {
						for (const emulator of emulators) {
							const label = `${emulator.name} (${type})`;
							devices.push(new DeviceNode(label, vscode.TreeItemCollapsibleState.None, this.platform, this.label, emulator.id));

						}
					}
					break;
			}
		}
		return devices;
	}

	get tooltip() {
		return this.label;
	}
};
