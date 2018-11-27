const appc = require('../appc');
const utils = require('../utils');
const vscode = require('vscode');

const PlatformNode = require('./nodes/platformNode');

class DeviceExplorer {

	constructor() {
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		this.platforms = new Map();
	}

	refresh() {
		vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Reading Appcelerator environment ...' }, () => {
			return new Promise((resolve, reject) => {
				appc.getInfo((info) => {
					if (info) {
						this._onDidChangeTreeData.fire();
						vscode.window.showInformationMessage('Updated device explorer');
						return resolve();
					} else {
						vscode.window.showErrorMessage('Error fetching Appcelerator environment');
						return reject();
					}
				});
			});
		});
	}

	getTreeItem(element) {
		return element.getTreeItem();
	}

	getChildren(element) {
		if (element) {
			return element.getChildren(element);
		}

		const elements = [];

		for (const platform of utils.platforms()) {
			const node = new PlatformNode(platform, vscode.TreeItemCollapsibleState.Collapsed);
			this.platforms.set(platform, node);
			elements.push(node);
		}
		return Promise.resolve(elements);
	}
}

module.exports = DeviceExplorer;
