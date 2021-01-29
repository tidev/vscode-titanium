import { ExtensionId, VSCodeCommands } from '../constants';
import * as vscode from 'vscode';
import { BaseNode } from './nodes/baseNode';
import { CommandNode } from './nodes/commandNode';
import { UrlNode } from './nodes/urlNode';

export class HelpExplorer implements vscode.TreeDataProvider<BaseNode> {

	private _onDidChangeTreeData: vscode.EventEmitter<BaseNode|undefined> = new vscode.EventEmitter();

	// tslint:disable-next-line member-ordering
	public readonly onDidChangeTreeData: vscode.Event<BaseNode|undefined> = this._onDidChangeTreeData.event;

	public refresh (): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	public getTreeItem (element: BaseNode): vscode.TreeItem {
		return element.getTreeItem(element);
	}

	public getChildren(element: BaseNode): BaseNode[] | Promise<BaseNode[]> {
		return [
			new UrlNode('Titanium SDK Documentation', 'https://docs.appcelerator.com/platform/latest/', 'book'),
			new UrlNode('Titanium Extension Documentation', 'https://docs.appcelerator.com/platform/latest/#!/guide/Visual_Studio_Code_Extension_for_Titanium', 'book'),
			new CommandNode('Report Issue', VSCodeCommands.ReportIssue, [ ExtensionId ], 'report'),
		];
	}
}
