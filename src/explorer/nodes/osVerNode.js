const appc = require('../../appc');
const BaseNode = require('./baseNode');
const DeviceNode = require('./deviceNode');
const vscode = require('vscode');
module.exports = class OsVerNode extends BaseNode {
	constructor(label, collapsibleState, platform, target) {
		super(label, collapsibleState);
		this.platform = platform;
		this.version = label;
		this.target = target;
	}
	getChildren() {
		const simulators = [];
		const sims = appc.iOSSimulators();
		for (const sim of sims[this.version]) {
			simulators.push(new DeviceNode(sim.name, vscode.TreeItemCollapsibleState.None, this.platform, this.target,  sim.udid));
		}
		return simulators;
	}

	get tooltip() {
		return this.label;
	}
};
