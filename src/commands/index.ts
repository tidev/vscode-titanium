import { ExtensionContainer } from '../container';
import * as vscode from 'vscode';
import { Commands } from './common';
import { GlobalState } from '../constants';
import project from '../project';
import { buildApplication } from './buildApp';
import { buildModule } from './buildModule';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode, UpdateNode } from '../explorer/nodes';
import { sleep } from '../common/utils';
import * as related from '../related';
import { packageApplication } from './packageApp';
import { packageModule } from './packageModule';
import { quickPick, selectUpdates } from '../quickpicks';
import { LogLevel } from '../types/common';
import { configuration } from '../configuration';
import { AlloyComponentExtension, AlloyComponentFolder, AlloyComponentType, generateComponent, generateModel } from './alloyGenerate';
import { debugSessionInformation, DEBUG_SESSION_VALUE } from '../tasks/tasksHelper';
import { cleanApplication } from './clean';
import { createApplication } from './createApp';
import { createModule } from './createModule';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { installUpdates } from '../updates';

export function registerCommand (commandId: string, callback: (...args: any[]) => any): void {
	ExtensionContainer.context.subscriptions.push(
		vscode.commands.registerCommand(commandId, async (...args: any[]) => {
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
		if (project.isTitaniumApp) {
			return buildApplication(node);
		} else if (project.isTitaniumModule) {
			return buildModule(node);
		}
	});

	registerCommand(Commands.Package, node => {
		if (project.isTitaniumApp) {
			return packageApplication(node);
		} else if (project.isTitaniumModule) {
			return packageModule(node);
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
		const level = await quickPick([ 'Trace', 'Debug', 'Info', 'Warn', 'Error' ], { placeHolder: 'Select log level' }) as keyof typeof LogLevel;
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
		vscode.window.showInformationMessage('Enabled LiveView');
	});

	registerCommand(Commands.DisableLiveView, async () => {
		await configuration.update('build.liveview', false, vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage('Disabled LiveView');
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

		await vscode.debug.startDebugging(vscode.workspace.workspaceFolders![0], debugConfig);
	});

	registerCommand(Commands.CheckForUpdates, async () => {
		await vscode.commands.executeCommand(Commands.RefreshUpdates);
		const updateInfo = ExtensionContainer.updateExplorer.updates;
		const numberOfUpdates = updateInfo.length;
		if (!numberOfUpdates) {
			return;
		}
		ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, true);
		vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, true);
		const message = numberOfUpdates > 1 ? `There are ${numberOfUpdates} updates available` : `There is ${numberOfUpdates} update available`;
		const choice = await vscode.window.showInformationMessage(message, { title: 'Install' }, { title: 'View' });
		if (!choice) {
			return;
		}
		if (choice.title === 'Install') {
			vscode.commands.executeCommand(Commands.SelectUpdates);
		} else if (choice.title === 'View') {
			// Focus the update view
			await vscode.commands.executeCommand(Commands.ShowUpdatesView);
		}
	});

	registerCommand(Commands.SelectUpdates, async (updateInfo: UpdateInfo[]) => {
		try {
			if (!updateInfo) {
				updateInfo = ExtensionContainer.updateExplorer.updates;
			}

			const updatesToInstall = await selectUpdates(updateInfo);
			vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium Updates', cancellable: false }, async progress => {
				const totalUpdates = updatesToInstall.length;
				await installUpdates(updatesToInstall, progress);
				if (updateInfo.length === totalUpdates) {
					ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, false);
					vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, false);
				}
				vscode.commands.executeCommand(Commands.RefreshUpdates);
				vscode.commands.executeCommand(Commands.RefreshExplorer);
				await vscode.window.showInformationMessage(`Installed ${totalUpdates} ${totalUpdates > 1 ? 'updates' : 'update'}`);
				return Promise.resolve();
			});
		} catch (error) {
			// TODO: add some sort of error reporting
		}
	});

	registerCommand(Commands.InstallAllUpdates, async updateInfo => {
		try {
			if (!updateInfo) {
				updateInfo = ExtensionContainer.updateExplorer.updates;
			}
			vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium Updates', cancellable: false }, async progress => {
				const totalUpdates = updateInfo.length;
				await installUpdates(updateInfo, progress);
				ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, false);
				vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, false);
				vscode.commands.executeCommand(Commands.RefreshUpdates);
				vscode.commands.executeCommand(Commands.RefreshExplorer);
				await vscode.window.showInformationMessage(`Installed ${totalUpdates} ${totalUpdates > 1 ? 'updates' : 'update'}`);
				return Promise.resolve();
			});
		} catch (error) {
			// TODO: add some sort of error reporting
		}
	});

	registerCommand(Commands.InstallUpdate, async updateInfo => {
		try {
			vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium Updates', cancellable: false }, async progress => {
				await installUpdates([ updateInfo.update ], progress);
				ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, false);
				vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, false);
				vscode.commands.executeCommand(Commands.RefreshUpdates);
				vscode.commands.executeCommand(Commands.RefreshExplorer);
				await vscode.window.showInformationMessage('Installed 1 update');
				return Promise.resolve();
			});
		} catch (error) {
			// TODO: add some sort of error reporting
		}
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
