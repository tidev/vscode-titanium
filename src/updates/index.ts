import * as vscode from 'vscode';
import { ProductNames, UpdateInfo } from 'titanium-editor-commons/updates';
import { UpdateChoice } from '../types/common';
import { executeAsTask } from '../utils';

export async function installUpdates (updateInfo: UpdateChoice[] | UpdateInfo[], progress: vscode.Progress<{ message?: string, increment?: number }>, incrementProgress = true): Promise<void> {
	const totalUpdates = updateInfo.length;
	let counter = 1;

	// sort prior to running
	updateInfo.sort((curr: UpdateChoice|UpdateInfo, prev: UpdateChoice|UpdateInfo) => curr.priority - prev.priority);

	for (const update of updateInfo) {
		const label = (update as UpdateChoice).label || `${update.productName}: ${update.latestVersion}`;
		progress.report({
			message: `Installing ${label} (${counter}/${totalUpdates})`
		});
		try {
			await update.action(update.latestVersion);
			progress.report({
				message: `Installed ${label} (${counter}/${totalUpdates})`
			});
			if (incrementProgress) {
				progress.report({
					increment: 100 / totalUpdates
				});
			}
		} catch (error) {
			progress.report({
				message: `Failed to install ${label} (${counter}/${totalUpdates})`
			});
			if (incrementProgress) {
				progress.report({
					increment: 100 / totalUpdates
				});
			}
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
}
