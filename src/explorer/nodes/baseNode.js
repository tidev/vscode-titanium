const vscode = require('vscode');
module.exports = class BaseNode {

	constructor(label) {
		this.label = label;
	}

	getTreeItem() {
		return {
			label: this.label,
			collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
		};
	}

	getChildren() {
		return [];
	}
};
