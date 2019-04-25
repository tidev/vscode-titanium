import { updates } from 'titanium-editor-commons';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import * as vscode from 'vscode';
import { GlobalState } from '../constants';
import { ExtensionContainer } from '../container';
import { BaseNode, BlankNode,  UpdateNode } from './nodes';

export default class UpdateExplorer implements vscode.TreeDataProvider<BaseNode> {

	public updates: UpdateInfo[] = [];

	private _onDidChangeTreeData: vscode.EventEmitter<BaseNode> = new vscode.EventEmitter();

	// tslint:disable-next-line member-ordering
	public readonly onDidChangeTreeData: vscode.Event<BaseNode> = this._onDidChangeTreeData.event;

	private updateMap: Map<string, UpdateNode> = new Map();

	public async refresh () {
		try {
			const availableUpdates = await updates.checkAllUpdates();
			this.updates = availableUpdates;
			this._onDidChangeTreeData.fire();
			if (this.updates.length) {
				ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, true);
				vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, true);
			}
		} catch (error) {
			// squash
		}
	}

	public getTreeItem (element) {
		return element.getTreeItem(element);
	}

	public getChildren () {

		const elements = [];
		for (const update of this.updates) {
			const { currentVersion, latestVersion, productName } = update;
			const label = `${productName}: ${currentVersion || 'Not Installed'} -> ${latestVersion}`;
			const node = new UpdateNode(label, update);
			this.updateMap.set(productName, node);
			elements.push(node);
		}
		if (!elements.length) {
			elements.push(new BlankNode('There are no updates available'));
		}
		return Promise.resolve(elements);
	}

}
