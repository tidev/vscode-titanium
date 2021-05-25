import * as getPort from 'get-port';
import { ExtensionContainer } from '../container';
import * as vscode from 'vscode';
import * as which from 'which';
import { UserCancellation } from '../commands';
import { promptForWorkspaceFolder, selectPlatform } from '../quickpicks/common';
import { AppBuildTaskDefinitionBase } from '../tasks/buildTaskProvider';
import { getTasks } from '../tasks/tasksHelper';

function validateTask (task: AppBuildTaskDefinitionBase, ourConfig: vscode.DebugConfiguration): void {
	// TODO: investigate whether it is possible to update the task
	if (ourConfig.platform && ourConfig.platform !== task.titaniumBuild.platform) {
		throw new Error('Debug configuration platform and preLaunchTask platform do not match');
	} else if (!task.problemMatcher || !task.problemMatcher.includes('$ti-app-launch')) {
		throw new Error(`Pre-launch task "${task.label}" requires the "$ti-app-launch" problem matcher to be set`);
	} else if (!task.isBackground) {
		throw new Error(`Pre-launch task "${task.label}" requires "isBackground" to be set to true`);
	} else if (!task.titaniumBuild.debug) {
		throw new Error(`Pre-launch task "${task.label}" requires "debug" to be set to true`);
	}
}

export class TitaniumDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

	public async resolveDebugConfiguration (folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration> {
		const ourConfig: vscode.DebugConfiguration = {
			...config
		};

		if (!ourConfig.port) {
			// randomly assign the port as if a debug session is initiated quickly after a previous
			// one on Android it can lead to the debugger failing to startup as the port is in use
			const port = await getPort();
			ourConfig.port = port;
			ourConfig.debugPort = port;
		} else {
			ourConfig.debugPort = ourConfig.port;
			try {
				const port = await getPort({ port: ourConfig.port });
				if (port !== ourConfig.port) {
					throw new Error(`Selected port ${ourConfig.port} is in use`);
				}
			} catch (error) {
				throw new Error(`Selected port ${ourConfig.port} is in use`);
			}
		}

		if (config.preLaunchTask) {
			const { folder } = await promptForWorkspaceFolder();
			const preLaunchTask = getTasks<AppBuildTaskDefinitionBase>(folder).find(task => task.label === config.preLaunchTask);

			if (!preLaunchTask) {
				throw new Error(`Unable to find a preLaunchTask named ${config.preLaunchTask}`);
			}

			validateTask(preLaunchTask, ourConfig);

			if (!ourConfig.platform) {
				// If no platform is set then inherit from the task
				ourConfig.platform = preLaunchTask.definition.titaniumBuild.platform;
			}

			if (ourConfig.port !== preLaunchTask.titaniumBuild.debugPort) {
				ourConfig.port = preLaunchTask.titaniumBuild.debugPort;
				ourConfig.debugPort = preLaunchTask.titaniumBuild.debugPort;
			}
		}

		if (!ourConfig.projectDir) {
			ourConfig.projectDir = folder?.uri.fsPath || (await promptForWorkspaceFolder()).folder.uri.fsPath;
		}

		// set the debug port we're using so that we can extract it in the TaskProvider
		ExtensionContainer.debugPorts.set(ourConfig.projectDir, ourConfig.debugPort);

		if (!ourConfig.platform) {
			try {
				ourConfig.platform = (await selectPlatform()).id;
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no platform was selected';
				}
				throw new Error(message);
			}
		}

		if (ourConfig.platform === 'android' && ourConfig.request === 'attach') {
			throw new Error('Attaching to a running Android app is currently not supported');
		}

		if (ourConfig.platform === 'ios') {
			try {
				await which('ios_webkit_debug_proxy');
			} catch (error) {
				const action = await vscode.window.showErrorMessage('Unable to find ios-webkit-debug-proxy. Please ensure it is installed', {
					title: 'Open docs'
				});
				if (action) {
					vscode.env.openExternal(vscode.Uri.parse('https://github.com/appcelerator/vscode-appcelerator-titanium/blob/master/doc/debugging.md'));
				}
				throw new Error('Unable to start debugger as ios_webkit_debug_proxy is not installed.');
			}
		}

		if (!ourConfig.preLaunchTask) {
			ourConfig.preLaunchTask = `Titanium: Debug ${ourConfig.platform}`;
		}

		return ourConfig;
	}
}
