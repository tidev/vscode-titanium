const BaseNode = require('./baseNode');
const vscode = require('vscode');
const TargetNode = require('./targetNode');
const utils = require('../../utils');
module.exports = class PlatformNode extends BaseNode {
	constructor(label, collapsibleState) {
		super(label, collapsibleState);
		this.label = utils.nameForPlatform(label);
		this.platform = label;
		this.contextValue = 'PlatformNode';
	}

	getChildren() {
		switch (this.platform) {
			case 'android':
				return Promise.resolve([
					new TargetNode('Device', vscode.TreeItemCollapsibleState.Collapsed, this.platform),
					new TargetNode('Emulator', vscode.TreeItemCollapsibleState.Collapsed, this.platform)
				]);
			case 'ios':
				return Promise.resolve([
					new TargetNode('Device', vscode.TreeItemCollapsibleState.Collapsed, this.platform),
					new TargetNode('Simulator', vscode.TreeItemCollapsibleState.Collapsed, this.platform)
				]);
			default:
				break;
		}
	}

	getTreeItem() {
		return {
			contextValue: this.contextValue,
			collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
			label: this.label,
			platform: this.platform,
		};
	}

	get tooltip() {
		return this.label;
	}
};
