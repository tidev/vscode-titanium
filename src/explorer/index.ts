import { Commands, registerCommand } from '../commands';
import { ExtensionContainer } from '../container';
import * as vscode from 'vscode';
import DeviceExplorer from './tiExplorer';
import UpdateExplorer from './updateExplorer';

export function registerViews(context: vscode.ExtensionContext): void {

	ExtensionContainer.buildExplorer = new DeviceExplorer();
	ExtensionContainer.updateExplorer = new UpdateExplorer();

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('titanium.view.buildExplorer', ExtensionContainer.buildExplorer),
		vscode.window.registerTreeDataProvider('titanium.view.updateExplorer', ExtensionContainer.updateExplorer)
	);

	registerCommand(Commands.RefreshExplorer, async () => {
		await ExtensionContainer.buildExplorer.refresh();
	});

	registerCommand(Commands.RefreshUpdates, async () => {
		await ExtensionContainer.updateExplorer.refresh();
	});
}
