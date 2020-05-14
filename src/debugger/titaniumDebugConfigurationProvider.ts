import * as getPort from 'get-port';
import * as vscode from 'vscode';
import * as which from 'which';
import { UserCancellation } from '../commands';
import { selectPlatform } from '../quickpicks/common';
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

	public async resolveDebugConfiguration (folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
		if (!config.projectDir) {
			config.projectDir = '${workspaceFolder}'; // eslint-disable-line no-template-curly-in-string
		}

		const ourConfig: vscode.DebugConfiguration = {
			...config
		};

		if (!ourConfig.port) {
			ourConfig.port = 9000;
			ourConfig.debugPort = 9000;
		} else {
			ourConfig.debugPort = ourConfig.port;
		}

		try {
			const port = await getPort({ port: ourConfig.port });
			if (port !== ourConfig.port) {
				ourConfig.port = port;
			}
		} catch (error) {
			throw new Error('Failed to start debug session as could not find a free port. Please set a "port" value in your debug configuration.');
		}

		if (config.preLaunchTask) {
			const preLaunchTask = getTasks(vscode.workspace.rootPath!).find(task => task.label === config.preLaunchTask) as AppBuildTaskDefinitionBase;

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
				vscode.window.showErrorMessage('Unable to find ios-webkit-debug-proxy. Please ensure it is installed', {
					title: 'Open docs'
				}).then(action => {
					if (action) {
						vscode.env.openExternal(vscode.Uri.parse('https://github.com/appcelerator/vscode-appcelerator-titanium/blob/master/doc/debugging.md'));
					}
					return;
				});
				throw new Error('Unable to start debugger as ios_webkit_debug_proxy is not installed.');
			}
		}

		if (!ourConfig.preLaunchTask) {
			ourConfig.preLaunchTask = `Titanium: Debug ${ourConfig.platform}`;
		}

		return ourConfig;
	}
}
