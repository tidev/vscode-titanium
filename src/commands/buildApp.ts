import * as vscode from 'vscode';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode } from '../explorer/nodes';
import { checkLogin, handleInteractionError, InteractionError } from './common';
import { selectPlatform } from '../quickpicks';
import { getBuildTask } from '../tasks/tasksHelper';
import { AppBuildTask } from '../tasks/buildTaskProvider';
import { ExtensionContainer } from '../container';
import { WorkspaceState } from '../constants';
import { getDeviceNameFromId, nameForPlatform, nameForTarget } from '../utils';
import { LastBuildState, Platform } from '../types/common';
import { promptForWorkspaceFolder } from '../quickpicks/common';

export async function buildApplication (node?: DeviceNode | OSVerNode | PlatformNode | TargetNode, folder?: vscode.WorkspaceFolder): Promise<void> {
	try {
		checkLogin();

		const lastBuildState = ExtensionContainer.context.workspaceState.get<LastBuildState>(WorkspaceState.LastBuildState);
		let lastBuildDescription: string|undefined;

		if (lastBuildState) {
			try {
				// TODO: map the device ID back based off the info output, this also allows us to ignore invalid build states for example by a device being disconnected
				const deviceName = getDeviceNameFromId(lastBuildState.deviceId, lastBuildState.platform, lastBuildState.target);
				lastBuildDescription = `${nameForPlatform(lastBuildState.platform)} ${nameForTarget(lastBuildState.target)} ${deviceName}`;
			} catch (error) {
				console.log(error);
				// Ignore and clear the state, we don't want to error due to a bad state
				ExtensionContainer.context.workspaceState.update(WorkspaceState.LastBuildState, undefined);
			}
		}

		if (!folder) {
			folder = (await promptForWorkspaceFolder()).folder;
		}

		const projectDir = folder.uri.fsPath;
		const buildChoice = node?.platform as string || (await selectPlatform(lastBuildDescription)).id;
		const platform = buildChoice === 'last' ? lastBuildState?.platform as Platform : buildChoice as Platform;

		const taskDefinition: AppBuildTask = {
			definition: {
				titaniumBuild: {
					projectType: 'app',
					platform,
					projectDir
				},
				type: 'titanium-build',
				name: `Build ${platform}`
			},
			name: `Build ${platform}`,
			isBackground: false,
			source: 'Titanium',
			presentationOptions: {},
			problemMatchers: [],
			runOptions: {},
			scope: folder
		};

		if (buildChoice === 'last') {
			// copy over the details from the last build, setting projectDir to the newly selected one
			Object.assign(taskDefinition.definition.titaniumBuild, lastBuildState, { projectDir });
		} else {
			if (node?.targetId) {
				taskDefinition.definition.titaniumBuild.target = node.targetId as 'device' | 'emulator' | 'simulator';
			}

			if (node?.version) {
				taskDefinition.definition.titaniumBuild.ios = { simulatorVersion: node.version };
			}

			if (node?.deviceId) {
				taskDefinition.definition.titaniumBuild.deviceId = node.deviceId;
			}
		}

		const task = await getBuildTask(taskDefinition);
		await vscode.tasks.executeTask(task);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
			const choice = await vscode.window.showErrorMessage('Build App failed', { title: 'Rerun' });
			if (choice?.title === 'Rerun') {
				buildApplication(node);
			}
		}
	}
}
