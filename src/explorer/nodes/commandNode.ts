import { Commands } from '../../commands';
import { VSCodeCommands } from '../../constants';
import * as vscode from 'vscode';
import { BaseNode } from './baseNode';

export class CommandNode extends BaseNode {

	public readonly collapsibleState = vscode.TreeItemCollapsibleState.None;
	public readonly contextValue: string = 'CommandNode';
	public command: vscode.Command;
	public iconPath: vscode.ThemeIcon;
	private commandName: string;
	private args: string[]

	constructor (label: string, commandName: Commands | VSCodeCommands | string, args: string[], icon: string) {
		super(label);
		this.commandName = commandName;
		this.args = args;
		this.command = {
			command: commandName,
			title: label,
			arguments: args
		};
		this.iconPath = new vscode.ThemeIcon(icon);
	}
}
