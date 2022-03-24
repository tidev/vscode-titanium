import { writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { types } from 'util';
import * as vscode from 'vscode';

// Only transfer settings that are used in the TiDev extension to avoid any errors
const settingsToInclude = [
	'titanium.android.keystoreAlias',
	'titanium.android.keystorePath',
	'titanium.build.liveview',
	'titanium.codeTemplates.jsFunction',
	'titanium.codeTemplates.tssClass',
	'titanium.codeTemplates.tssId',
	'titanium.codeTemplates.tssTag',
	'titanium.general.defaultCreationDirectory',
	'titanium.general.displayBuildCommandInConsole',
	'titanium.general.logLevel',
	'titanium.general.updateFrequency',
	'titanium.general.useTerminalForBuild',
	'titanium.package.distributionOutputDirectory',
	'titanium.project.defaultI18nLanguage'
];

function traverseConfig (config: any, parent?: string) {
	const cleaned: Record<string, unknown> = {};
	for (const setting in config) {
		const configKey = parent ? `titanium.${parent}.${setting}` : `titanium.${setting}`;

		const value = vscode.workspace.getConfiguration().get(configKey);

		// If the value is a proxy then we want to traverse the nested settings
		if (types.isProxy(value)) {
			Object.assign(cleaned, { ...traverseConfig(value, setting) });
		} else if (settingsToInclude.includes(configKey)) {
			cleaned[configKey] = value;
		}
	}
	return cleaned;
}

export async function activate (context: vscode.ExtensionContext): Promise<void> {
	vscode.commands.registerCommand('titanium-legacy.installNewExtension', async () => {
		try {
			await vscode.commands.executeCommand('workbench.extensions.installExtension', 'TiDev.vscode-titanium');
		} catch (error) {
			console.log(error);
		}
	});

	vscode.commands.registerCommand('titanium-legacy.exportSettings', async () => {
		let configObject;
		try {
			const config = vscode.workspace.getConfiguration().get('titanium') as any;
			configObject = traverseConfig(config);
			await vscode.commands.executeCommand('titanium.import.settings', configObject);
		} catch (error) {
			writeFile(join(homedir(), 'error'), (error as Error).toString());
			const settingsPath = join(homedir(), 'vscode-titanium-settings.json');
			await writeFile(settingsPath, JSON.stringify(configObject, undefined, 2));

			const openFile = await vscode.window.showErrorMessage(`There was an error when importing the settings. You can find the exported settings at ${settingsPath}`, 'Open');

			if (openFile) {
				try {
					const document = await vscode.workspace.openTextDocument(settingsPath);
					await vscode.window.showTextDocument(document);
				} catch (e) {
					console.log(e);
				}
			}
		}
	});

	vscode.commands.registerCommand('titanium-legacy.exportKeystore', async () => {
		try {
			const keystoreLocation = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false });

			if (!keystoreLocation) {
				vscode.window.showErrorMessage('No Keystore was selected');
				return;
			}

			const keystoreData = await context.secrets.get(keystoreLocation[0].fsPath);
			if (!keystoreData) {
				vscode.window.showErrorMessage('No stored data was found for the selected Keystore');
				return;
			}

			await vscode.commands.executeCommand('titanium.import.keystore', JSON.parse(keystoreData));

		} catch (error) {
			console.log(error);
		}
	});

	vscode.commands.registerCommand('titanium-legacy.uninstall', async () => {
		try {
			await vscode.commands.executeCommand('extension.open', 'Axway.vscode-titanium');
		} catch (error) {
			console.log(error);
		}
	});

	const choice = await vscode.window.showWarningMessage('The Axway Titanium extension has been deprecated and will be unpublished. Please migrate to the TiDev Titanium extension', 'Migrate');

	if (!choice) {
		return;
	}

	vscode.commands.executeCommand('workbench.action.openWalkthrough', {
		category: 'Axway.vscode-titanium#migrate',
		step: undefined
	});
}
