import { ExtensionId, VSCodeCommands } from '../constants';
import * as vscode from 'vscode';
import { BaseNode, CommandNode, UpdateNode, UpdatesNode, UrlNode } from './nodes';

export class HelpExplorer implements vscode.TreeDataProvider<BaseNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<BaseNode|undefined> = new vscode.EventEmitter();

	// tslint:disable-next-line member-ordering
	public readonly onDidChangeTreeData: vscode.Event<BaseNode|undefined> = this._onDidChangeTreeData.event;
	private updatesNode: UpdatesNode = new UpdatesNode('Updates');

	public refresh (): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	public getTreeItem (element: BaseNode): BaseNode {
		return element.getTreeItem(element);
	}

	public async getChildren(element: BaseNode): Promise<BaseNode[]> {
		if (element) {
			return element.getChildren(element);
		}

		return [
			new UrlNode('Titanium SDK Documentation', 'https://titaniumsdk.com/api/', 'book'),
			new UrlNode('Titanium Extension Documentation', 'https://titaniumsdk.com/guide/Editor_IDE/VSCode_Extension/', 'book'),
			new UrlNode('TiSlack', 'https://tislack.org', 'comment-discussion'),
			new CommandNode('Report Extension Issue', VSCodeCommands.ReportIssue, [ ExtensionId ], 'report'),
			new CommandNode('Configure Settings', VSCodeCommands.OpenSettings, [ `@ext:${ExtensionId}` ], 'settings-gear'),
			this.updatesNode
		];
	}

	public getParent (element: BaseNode): BaseNode|undefined {
		if (element instanceof UpdateNode) {
			return element.parentNode;
		}
		return undefined;
	}

	public getUpdatesNode (): UpdatesNode|undefined {
		return this.updatesNode;
	}
}
