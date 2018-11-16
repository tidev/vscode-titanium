const BaseNode = require('./baseNode');
const utils = require('../../utils');
const vscode = require('vscode');

module.exports = class OsVerNode extends BaseNode {
	constructor(label, collapsibleState, platform, target, deviceId) {
		super(label, collapsibleState);
		this.platform = platform;
		this.deviceId = deviceId;
		this.target = target;
		this.targetId = utils.targetForName(this.target);
	}

	getTreeItem() {
		return {
			label: this.label,
			collapsibleState: vscode.TreeItemCollapsibleState.None,
			deviceId: this.deviceId,
			target: this.target,
			targetId: this.targetId,
			platform: this.platform
		};
	}

	get tooltip() {
		return this.label;
	}
};
