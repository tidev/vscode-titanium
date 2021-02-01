import * as vscode from 'vscode';
import appc from '../appc';
import { Platform } from '../types/common';
import { platforms } from '../utils';
import { BaseNode, PlatformNode } from './nodes';

export default class DeviceExplorer implements vscode.TreeDataProvider<BaseNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<BaseNode|undefined> = new vscode.EventEmitter();

	// tslint:disable-next-line member-ordering
	public readonly onDidChangeTreeData: vscode.Event<BaseNode|undefined> = this._onDidChangeTreeData.event;

	private platforms: Map<string, PlatformNode> = new Map();

	public async refresh (): Promise<void> {
		return vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Reading Appcelerator environment ...' }, async () => {
			// fire a change event so that the child nodes of targets display the refresh message
			this._onDidChangeTreeData.fire(undefined);
			try {
				await appc.getInfo();
				this._onDidChangeTreeData.fire(undefined);
				vscode.window.showInformationMessage('Updated device explorer');
				return Promise.resolve();
			} catch (error) {
				vscode.window.showErrorMessage('Error fetching Appcelerator environment');
				return Promise.reject();
			}
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
