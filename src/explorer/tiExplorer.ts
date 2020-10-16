import * as vscode from 'vscode';
import appc from '../appc';
import { Platform } from '../types/common';
import { platforms } from '../utils';
import { BaseNode } from './nodes/baseNode';
import { PlatformNode } from './nodes/platformNode';

export default class DeviceExplorer implements vscode.TreeDataProvider<BaseNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<BaseNode> = new vscode.EventEmitter();

	// tslint:disable-next-line member-ordering
	public readonly onDidChangeTreeData: vscode.Event<BaseNode> = this._onDidChangeTreeData.event;

	private platforms: Map<string, PlatformNode> = new Map();

	public async refresh (): Promise<void> {
		return vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Reading Appcelerator environment ...' }, () => {
			return new Promise((resolve, reject) => {
				// fire a change event so that the child nodes of targets display the refresh message
				this._onDidChangeTreeData.fire();
				appc.getInfo((error, info) => {
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

	public getTreeItem (element: BaseNode): vscode.TreeItem {
		return element.getTreeItem(element);
	}

	public getChildren (element: BaseNode): BaseNode[] | Promise<BaseNode[]> {
		if (element) {
			return element.getChildren(element);
		}

		const elements = [];

		for (const platform of platforms()) {
			const node = new PlatformNode(platform as Platform);
			this.platforms.set(platform, node);
			elements.push(node);
		}
		return Promise.resolve(elements);
	}
}
