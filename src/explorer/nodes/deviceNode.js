const BaseNode = require('./baseNode');
const vscode = require('vscode');
module.exports = class OsVerNode extends BaseNode {
	constructor(label, collapsibleState, platform, target, deviceId) {
		super(label, collapsibleState);
		this.platform = platform;
		this.deviceId = deviceId;
		this.target = target;
	}

	getTreeItem() {
		return {
			label: this.label,
			collapsibleState: vscode.TreeItemCollapsibleState.None,
			deviceId: this.deviceId,
			target: this.target,
			platform: this.platform
		};
	}

	get tooltip() {
		return this.label;
	}
};
