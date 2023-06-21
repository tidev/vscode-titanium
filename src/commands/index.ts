import * as related from '../related';
import * as vscode from 'vscode';

import { ExtensionContainer } from '../container';
import { Commands } from './common';
import { GlobalState } from '../constants';
import { buildApplication } from './buildApp';
import { buildModule } from './buildModule';
import { DeviceNode, DistributeNode, OSVerNode, PlatformNode, TargetNode, UpdateNode } from '../explorer/nodes';
import { sleep } from '../common/utils';
import { packageApplication } from './packageApp';
import { packageModule } from './packageModule';
import { promptForWorkspaceFolder, quickPick } from '../quickpicks';
import { KeystoreInfo, LogLevel } from '../types/common';
import { configuration } from '../configuration';
import { AlloyComponentExtension, AlloyComponentFolder, AlloyComponentType, generateComponent, generateModel } from './alloyGenerate';
import { debugSessionInformation, DEBUG_SESSION_VALUE } from '../tasks/tasksHelper';
import { cleanApplication } from './clean';
import { createApplication } from './createApp';
import { createModule } from './createModule';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { installUpdates } from '../updates';
import { generateTask } from './generateTask';
import { createKeystore } from './createKeystore';
import { readJSON } from 'fs-extra';
import { startup } from '../extension';

export function registerCommand (commandId: string, callback: (...args: any[]) => unknown): void {
	ExtensionContainer.context.subscriptions.push(
		vscode.commands.registerCommand(commandId, async (...args: unknown[]) => {
			return callback(...args);
		})
	);
}

export function registerCommands (): void {

	registerCommand(Commands.Build, async (node?: DeviceNode | OSVerNode | PlatformNode | TargetNode) => {
		if (ExtensionContainer.context.globalState.get<boolean>(GlobalState.Running)) {
			await vscode.commands.executeCommand(Commands.StopBuild);
			await sleep(100);
		}

		const { type, folder } = await promptForWorkspaceFolder({ apps: true, modules: true, placeHolder: vscode.l10n.t('Please select a project to build') });

		if (type === 'app') {
			return buildApplication(node, folder);
		} else if (type === 'module') {
			return buildModule(node, folder);
		}
	});

	registerCommand(Commands.Package, async (node) => {
		if (ExtensionContainer.context.globalState.get<boolean>(GlobalState.Running)) {
			await vscode.commands.executeCommand(Commands.StopBuild);
			await sleep(100);
		}

		const { type, folder } = await promptForWorkspaceFolder({ apps: true, modules: true, placeHolder: vscode.l10n.t('Please select a project to package') });

		if (type === 'app') {
			return packageApplication(node, folder);
		} else if (type === 'module') {
			return packageModule(node, folder);
		}
	});

	// register stop command
	registerCommand(Commands.StopBuild, () => {
		if (ExtensionContainer.runningTask) {
			ExtensionContainer.runningTask.terminate();
		}
	});

	// register set log level command
	registerCommand(Commands.SetLogLevel, async () => {
		const level = await quickPick([ 'Trace', 'Debug', 'Info', 'Warn', 'Error' ], { placeHolder: vscode.l10n.t('Select log level') }) as keyof typeof LogLevel;
		const actualLevel = LogLevel[level];
		if (actualLevel) {
			await configuration.update('general.logLevel', actualLevel, vscode.ConfigurationTarget.Global);
		}
	});

	// register related view commands
	registerCommand(Commands.OpenRelatedView, () => {
		related.openRelatedFile('xml');
	});
	registerCommand(Commands.OpenRelatedStyle, () => {
		related.openRelatedFile('tss');
	});
	registerCommand(Commands.OpenRelatedController, () => {
		related.openRelatedFile('js');
	});
	registerCommand(Commands.OpenAllRelatedFiles, () => {
		related.openAllFiles();
	});

	registerCommand(Commands.EnableLiveView, async () => {
		await configuration.update('build.liveview', true, vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage(vscode.l10n.t('Enabled LiveView'));
	});

	registerCommand(Commands.DisableLiveView, async () => {
		await configuration.update('build.liveview', false, vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage(vscode.l10n.t('Disabled LiveView'));
	});

	registerCommand(Commands.GenerateAlloyController, () => generateComponent(AlloyComponentType.Controller, AlloyComponentFolder.Controller, AlloyComponentExtension.Controller));

	registerCommand(Commands.GenerateAlloyMigration, () => generateComponent(AlloyComponentType.Migration, AlloyComponentFolder.Migration, AlloyComponentExtension.Migration));

	registerCommand(Commands.GenerateAlloyModel, generateModel);

	registerCommand(Commands.GenerateAlloyStyle, () => generateComponent(AlloyComponentType.Style, AlloyComponentFolder.Style, AlloyComponentExtension.Style));

	registerCommand(Commands.GenerateAlloyView, () => generateComponent(AlloyComponentType.View, AlloyComponentFolder.View, AlloyComponentExtension.View));

	registerCommand(Commands.GenerateAlloyWidget, () => generateComponent(AlloyComponentType.Widget, AlloyComponentFolder.Widget, AlloyComponentExtension.Widget));

	registerCommand(Commands.CreateApp, createApplication);

	registerCommand(Commands.CreateModule, createModule);

	registerCommand(Commands.OpenReleaseNotes, ({ update }: UpdateNode) => {
		vscode.env.openExternal(vscode.Uri.parse(update.releaseNotes));
	});

	registerCommand(Commands.Clean, cleanApplication);

	registerCommand(Commands.Debug, async (node: DeviceNode) => {
		const debugConfig: vscode.DebugConfiguration = {
			type: 'titanium',
			name: 'Debug Titanium App',
			request: 'launch',
			platform: node.platform
		};

		debugSessionInformation.set(DEBUG_SESSION_VALUE, node);

		const { folder } = await promptForWorkspaceFolder({ apps: true, modules: true, placeHolder: vscode.l10n.t('Please select a project to debug') });
		await vscode.debug.startDebugging(folder, debugConfig);
	});

	registerCommand(Commands.CheckForUpdates, async () => {
		try {
			const updateInfo = await ExtensionContainer.getUpdates(true);
			const numberOfUpdates = updateInfo.length;
			if (!numberOfUpdates) {
				return;
			}
			ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, true);
			vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, true);
			const message = numberOfUpdates > 1 ? vscode.l10n.t('There are {0} updates available', numberOfUpdates) : vscode.l10n.t('There is {0} update available', numberOfUpdates);
			const choice = await vscode.window.showInformationMessage(message, { id: 'install', title: vscode.l10n.t('Install') }, { id: 'view', title: vscode.l10n.t('View') });
			if (!choice) {
				return;
			}
			if (choice.title === 'install') {
				vscode.commands.executeCommand(Commands.SelectUpdates, updateInfo);
			} else if (choice.title === 'view') {
				// Focus the update view
				await vscode.commands.executeCommand(Commands.ShowUpdates);
			}
		} catch (error) {
			vscode.window.showWarningMessage(vscode.l10n.t('Failed to check for updates'));
		}

	});

	registerCommand(Commands.SelectUpdates, async (updateInfo: UpdateInfo[]) => {
		return installUpdates(updateInfo, true);
	});

	registerCommand(Commands.InstallAllUpdates, () => {
		return installUpdates();
	});

	registerCommand(Commands.InstallUpdate, (updateInfo: UpdateNode) => {
		return installUpdates([ updateInfo.update ]);
	});

	registerCommand(Commands.GenerateTask, async (node: DeviceNode|DistributeNode) => {
		return generateTask(node);
	});

	registerCommand(Commands.CreateKeystore, async () => {
		return createKeystore();
	});

	registerCommand(Commands.ImportSettings, async (settings?: { [key: string]: unknown }): Promise<void> => {
		if (!settings) {
			const openFile = await vscode.window.showInformationMessage(vscode.l10n.t('Please select the exported settings file'), 'Open');

			if (!openFile) {
				return;
			}

			const settingsFile = await vscode.window.showOpenDialog({ canSelectFiles: true, canSelectFolders: false, canSelectMany: false });

			if (!settingsFile) {
				return;
			}

			settings = await readJSON(settingsFile[0].fsPath) as { [key: string]: unknown };
		}

		for (const [ key, value ] of Object.entries(settings)) {
			await vscode.workspace.getConfiguration().update(key, value, true);
		}
	});

	registerCommand(Commands.ImportKeystoreData, async (keystoreData: KeystoreInfo) => {
		await ExtensionContainer.context.secrets.store(keystoreData.location, JSON.stringify(keystoreData));
	});

	registerCommand(Commands.ShowOutputChannel, () => {
		ExtensionContainer.outputChannel.show();
	});

	registerCommand(Commands.FixEnvironmentIssues, async () => {
		startup();
	});
}

export * from './common';
export * from './alloyGenerate';
export * from './buildApp';
export * from './buildModule';
export * from './packageApp';
export * from './packageModule';
export * from './createApp';
export * from './createModule';
export * from './clean';
