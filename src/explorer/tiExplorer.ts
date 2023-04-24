import { ExtensionContainer } from '../container';
import * as vscode from 'vscode';
import { Platform } from '../types/common';
import { platforms } from '../utils';
import { BaseNode, PlatformNode } from './nodes';
import { RecentNode } from './nodes/build/recentNode';

export default class DeviceExplorer implements vscode.TreeDataProvider<BaseNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<BaseNode|undefined> = new vscode.EventEmitter();

	// tslint:disable-next-line member-ordering
	public readonly onDidChangeTreeData: vscode.Event<BaseNode|undefined> = this._onDidChangeTreeData.event;

	private platforms: Map<string, PlatformNode> = new Map();
	private recentNode = new RecentNode('Recent Builds');

	public async refresh (): Promise<void> {
		return vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Reading Titanium environment ...' }, async () => {
			// fire a change event so that the child nodes of targets display the refresh message
			this._onDidChangeTreeData.fire(undefined);
			try {
				await ExtensionContainer.environment.getInfo();
				this._onDidChangeTreeData.fire(undefined);
				vscode.window.showInformationMessage('Updated device explorer');
				return Promise.resolve();
			} catch (error) {
				vscode.window.showErrorMessage('Error fetching Titanium environment');
				return Promise.reject();
			}
		});
	}

	public refreshRecentBuilds (): void {
		this._onDidChangeTreeData.fire(this.recentNode);
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

		elements.push(this.recentNode);
		return Promise.resolve(elements);
	}
}
