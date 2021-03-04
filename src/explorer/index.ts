import { Commands, registerCommand } from '../commands';
import { ExtensionContainer } from '../container';
import * as vscode from 'vscode';
import DeviceExplorer from './tiExplorer';
import { HelpExplorer } from './helpExplorer';
import { UrlNode } from './nodes';

export function registerViews(context: vscode.ExtensionContext): void {

	ExtensionContainer.buildExplorer = new DeviceExplorer();
	ExtensionContainer.helpExplorer = new HelpExplorer();

	// We register the HelpExplorer via createTreeView to provide access to the underlying TreeView
	// so we can programmatically reveal the Updates list
	const helpTreeView = vscode.window.createTreeView('titanium.view.helpExplorer', { treeDataProvider: ExtensionContainer.helpExplorer });

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('titanium.view.buildExplorer', ExtensionContainer.buildExplorer),
	);

	registerCommand(Commands.RefreshExplorer, async () => {
		await ExtensionContainer.buildExplorer.refresh();
	});

	registerCommand(Commands.RefreshHelp, async () => {
		await ExtensionContainer.helpExplorer.refresh();
	});

	registerCommand(Commands.OpenUrl, async (node: UrlNode) => {
		await node.openUrl();
	});

	registerCommand(Commands.ShowUpdates, async () => {
		const updatesNode = ExtensionContainer.helpExplorer.getUpdatesNode();
		if (updatesNode) {
			helpTreeView.reveal(updatesNode, { select: true, expand: true, focus: true });
		}
	});
}
