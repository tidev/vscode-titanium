import * as vscode from 'vscode';
import { ProductNames, UpdateInfo } from 'titanium-editor-commons/updates';
import { executeAsTask } from '../utils';
import { selectUpdates } from '../quickpicks/common';
import { ExtensionContainer } from '../container';
import { Commands } from '../commands';
import { GlobalState } from '../constants';
import { startup } from '../extension';

export async function installUpdates (updateInfo?: UpdateInfo[], promptForChoice?: boolean): Promise<void> {
	vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium Updates', cancellable: false }, async progress => {
		if (!updateInfo) {
			progress.report({ message: 'Checking for latest updates' });
			updateInfo = await ExtensionContainer.getUpdates();
		}

		if (promptForChoice) {
			updateInfo = await selectUpdates(updateInfo);
		}

		// Don't continue on if no updates were selected
		if (!updateInfo.length) {
			return;
		}

		const selectedUpdates = updateInfo.length;
		let counter = 1;

		// sort prior to running
		updateInfo.sort((curr: UpdateInfo, prev: UpdateInfo) => curr.priority - prev.priority);

		for (const update of updateInfo) {
			const label = `${update.productName}: ${update.latestVersion}`;
			progress.report({
				message: `Installing ${label} (${counter}/${selectedUpdates})`
			});
			try {
				await update.action(update.latestVersion);
				progress.report({
					message: `Installed ${label} (${counter}/${selectedUpdates})`,
					increment: 100 / selectedUpdates
				});
			} catch (error) {
				progress.report({
					message: `Failed to install ${label} (${counter}/${selectedUpdates})`,
					increment: 100 / selectedUpdates
				});
				if (error.metadata) {
					const { metadata } = error;
					if ((update.productName === ProductNames.AppcInstaller || update.productName === ProductNames.Node) && metadata.errorCode === 'EACCES') {
						const runWithSudo = await vscode.window.showErrorMessage(`Failed to update to ${label} as it must be ran with sudo`, {
							title: 'Install with Sudo'
						});
						if (runWithSudo) {
							await executeAsTask(`sudo ${metadata.command}`, update.productName);
						}
					}
				} else {
					// TODO should we show the error that we got passed?
					await vscode.window.showErrorMessage(`Failed to update to ${label}`);
				}
			}
			counter++;
		}

		const updates = await ExtensionContainer.getUpdates(true);

		// Only set HasUpdates to false if there a no outstanding updates
		if (!updates.length) {
			ExtensionContainer.setContext(GlobalState.HasUpdates, false);
		}

		vscode.commands.executeCommand(Commands.RefreshExplorer);
		vscode.commands.executeCommand(Commands.RefreshHelp);
		vscode.window.showInformationMessage(`Installed ${selectedUpdates} ${selectedUpdates === 1 ? 'update' : 'updates'}`);

		// If an install was triggered as a consequence of missing tooling then kick off another check
		if (ExtensionContainer.context.globalState.get(GlobalState.MissingTooling)) {
			startup();
		}
	});
}
