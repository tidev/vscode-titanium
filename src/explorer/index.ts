import { Commands, registerCommand } from '../commands';
import { ExtensionContainer } from '../container';
import * as vscode from 'vscode';
import DeviceExplorer from './tiExplorer';
import UpdateExplorer from './updateExplorer';
import { HelpExplorer } from './helpExplorer';
import { UrlNode } from './nodes/urlNode';

export function registerViews(context: vscode.ExtensionContext): void {

	ExtensionContainer.buildExplorer = new DeviceExplorer();
	ExtensionContainer.updateExplorer = new UpdateExplorer();
	ExtensionContainer.helpExplorer = new HelpExplorer();

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('titanium.view.buildExplorer', ExtensionContainer.buildExplorer),
		vscode.window.registerTreeDataProvider('titanium.view.updateExplorer', ExtensionContainer.updateExplorer),
		vscode.window.registerTreeDataProvider('titanium.view.helpExplorer', ExtensionContainer.helpExplorer)
	);

	registerCommand(Commands.RefreshExplorer, async () => {
		await ExtensionContainer.buildExplorer.refresh();
	});

	registerCommand(Commands.RefreshUpdates, async () => {
		await ExtensionContainer.updateExplorer.refresh();
	});

	registerCommand(Commands.OpenUrl, async (node: UrlNode) => {
		await node.openUrl();
	});
}
