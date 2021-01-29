import { Commands } from '../../commands';
import * as vscode from 'vscode';
import { BaseNode } from './baseNode';

export class UrlNode extends BaseNode {

	public readonly collapsibleState = vscode.TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'UrlNode';
	public command: vscode.Command;
	public iconPath: vscode.ThemeIcon;
	private url: string;

	constructor (label: string, url: string, icon: string) {
		super(label);
		this.url = url;
		this.command = {
			command: Commands.OpenUrl,
			title: `Open ${this.url}`,
			arguments: [ this ]
		};
		this.iconPath = new vscode.ThemeIcon(icon);
	}

	async openUrl(): Promise<void> {
		await vscode.env.openExternal(vscode.Uri.parse(this.url));
	}
}
