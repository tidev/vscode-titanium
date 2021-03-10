import * as vscode from 'vscode';
import { TitaniumDebugConfigurationProvider } from './titaniumDebugConfigurationProvider';
import { MESSAGE_STRING, Request, TitaniumLaunchRequestArgs, FeedbackOptions, Response } from '../common/extensionProtocol';
import { BuildAppOptions } from '../types/cli';
import { ExtensionContainer } from '../container';
import appc from '../appc';
import {  runningTasks } from '../tasks/tasksHelper';
import { Commands } from '../commands';

async function handleCustomEvent(event: vscode.DebugSessionCustomEvent): Promise<void> {
	if (event.event === MESSAGE_STRING) {
		const request: Request = event.body;

		if (request.code === 'BUILD') {
			const providedArgs = request.args as TitaniumLaunchRequestArgs;
			const response: Response = {
				id: request.id,
				result: {
					isError: false
				}
			};

			// When using a provided task for debugging the name will be prefixed
			// with "Titanium:" internally by vscode, but it's not available to us
			// on the label, so we need remove that to lookup the task
			const taskLabel = providedArgs.preLaunchTask.replace('Titanium:', '').trim();

			const runningTask = runningTasks.get(taskLabel);

			if (!runningTask) {
				response.result.isError = true;
				response.result.message = 'Unable to find running task';
				event.session.customRequest('extensionResponse', response);
				return;
			}

			response.result.buildInfo = runningTask.buildOptions;

			event.session.customRequest('extensionResponse', response);
		} else if (request.code === 'FEEDBACK') {
			const feedback = request.args as FeedbackOptions;
			switch (feedback.type) {
				case 'error':
					await vscode.window.showErrorMessage(feedback.message);
					break;
				case 'info':
				default:
					await vscode.window.showInformationMessage(feedback.message);
					break;
			}
		} else if (request.code === 'END') {
			const providedArgs = request.args as BuildAppOptions & TitaniumLaunchRequestArgs;
			await vscode.commands.executeCommand(Commands.StopBuild);

			if (providedArgs.platform !== 'android') {
				return;
			}

			const adbPath = appc.getAdbPath();
			if (!adbPath) {
				return;
			}

			const tcpPort = `tcp:${providedArgs.port}`;

			if (providedArgs.target === 'emulator') {
				const { output } = await ExtensionContainer.terminal.runInBackground(adbPath, [ 'forward', '--list' ]);

				for (const line of output.split('\n')) {
					if (!line.includes(tcpPort)) {
						continue;
					}
					const emulatorId = line.match(/emulator-\d+/);
					if (emulatorId) {
						providedArgs.deviceId = emulatorId[0];
						break;
					}
				}
			}
			if (!providedArgs.deviceId) {
				return;
			}
			try {
				ExtensionContainer.terminal.runInBackground(adbPath, [ '-s', providedArgs.deviceId, 'forward', '--remove', tcpPort ]);
			} catch (error) {
				// squash
			}
		}
	}
}

export function registerDebugProvider (ctx: vscode.ExtensionContext): void {

	ctx.subscriptions.push(
		vscode.debug.registerDebugConfigurationProvider('titanium', new TitaniumDebugConfigurationProvider())
	);

	vscode.debug.onDidReceiveDebugSessionCustomEvent(handleCustomEvent);

}

