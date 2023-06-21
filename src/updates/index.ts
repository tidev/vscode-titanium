import * as vscode from 'vscode';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { InstallError } from 'titanium-editor-commons/util';
import { executeAsTask } from '../utils';
import { selectUpdates } from '../quickpicks/common';
import { ExtensionContainer } from '../container';
import { Commands } from '../commands';
import { GlobalState } from '../constants';
import { startup } from '../extension';

export async function installUpdates (updateInfo?: UpdateInfo[], promptForChoice?: boolean): Promise<void> {
	vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: vscode.l10n.t('Titanium Updates'), cancellable: false }, async progress => {
		if (!updateInfo) {
			progress.report({ message: vscode.l10n.t('Checking for latest updates') });
			updateInfo = await ExtensionContainer.getUpdates();
			progress.report({ message: vscode.l10n.t('Please select updates') });
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
		let succeeded = 0;
		let failed = 0;

		// sort prior to running
		updateInfo.sort((curr: UpdateInfo, prev: UpdateInfo) => curr.priority - prev.priority);

		for (const update of updateInfo) {
			const label = `${update.productName}: ${update.latestVersion}`;
			progress.report({
				message: vscode.l10n.t('Installing {0} ({1}/{2})', label, counter, selectedUpdates)
			});
			try {
				await update.action(update.latestVersion);
				progress.report({
					message: vscode.l10n.t('Installed {label} ({counter}/{selectedUpdates})', label, counter, selectedUpdates),
					increment: 100 / selectedUpdates
				});
				succeeded++;
			} catch (error) {
				progress.report({
					message: `Failed to install ${label} (${counter}/${selectedUpdates})`,
					increment: 100 / selectedUpdates
				});
				if (error instanceof InstallError && error.metadata) {
					const { metadata } = error;
					if (metadata.errorCode === 'EACCES') {
						const runWithSudo = await vscode.window.showErrorMessage(vscode.l10n.t('Failed to update to {0} as it must be ran with sudo', label), {
							title: 'Install with Sudo'
						});
						if (runWithSudo) {
							await executeAsTask(`sudo ${metadata.command}`, update.productName);
						}
					} else if (metadata.errorCode === 'ESELECTERROR') {
						const select = await vscode.window.showErrorMessage(vscode.l10n.t('Failed to set {0} as the selected SDK. Would you like to manually select it?', update.latestVersion), { id: 'select', title: vscode.l10n.t('Select') });
						if (select) {
							await executeAsTask(`${metadata.command}`, update.productName);
						}
					}
					failed++;
				} else {
					// TODO should we show the error that we got passed?
					await vscode.window.showErrorMessage(vscode.l10n.t('Failed to update to {0}', label));
				}
			}
			counter++;
		}

		try {
			const updates = await ExtensionContainer.getUpdates(true);

			// Only set HasUpdates to false if there a no outstanding updates
			if (!updates.length) {
				ExtensionContainer.setContext(GlobalState.HasUpdates, false);
			}
		} catch (error) {
			// ignore
		}

		vscode.commands.executeCommand(Commands.RefreshExplorer);
		vscode.commands.executeCommand(Commands.RefreshHelp);

		let message = succeeded === 1
			? vscode.l10n.t('Installed {0} update', succeeded)
			: vscode.l10n.t('Installed {0} updates', succeeded);

		if (failed) {
			message = failed === 1
				? vscode.l10n.t('{0} and failed to install {1} update', message, failed)
				: vscode.l10n.t('{0}and failed to install {1} updates', message, failed);
		}

		vscode.window.showInformationMessage(message);

		// If an install was triggered as a consequence of missing tooling then kick off another check
		if (ExtensionContainer.context.globalState.get(GlobalState.MissingTooling)) {
			startup();
		}
	});
}
