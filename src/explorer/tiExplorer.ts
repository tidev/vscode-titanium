import * as vscode from 'vscode';
import appc from '../appc';
import BaseNode from './nodes/baseNode';
import PlatformNode from './nodes/platformNode';

import { platforms } from '../utils';

export default class DeviceExplorer implements vscode.TreeDataProvider<BaseNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<BaseNode> = new vscode.EventEmitter();

	// tslint:disable-next-line member-ordering
	public readonly onDidChangeTreeData: vscode.Event<BaseNode> = this._onDidChangeTreeData.event;

	private platforms: Map<string, PlatformNode> = new Map();

	public refresh () {
		vscode. window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Reading Appcelerator environment ...' }, () => {
			return new Promise((resolve, reject) => {
				appc.getInfo(info => {
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

	public getTreeItem (element) {
		return element.getTreeItem();
	}

	public getChildren (element) {
		if (element) {
			return element.getChildren(element);
		}

		const elements = [];

		for (const platform of platforms()) {
			const node = new PlatformNode(platform);
			this.platforms.set(platform, node);
			elements.push(node);
		}
		return Promise.resolve(elements);
	}
}
