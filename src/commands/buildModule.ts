import * as vscode from 'vscode';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode } from '../explorer/nodes';
import { handleInteractionError, InteractionError } from './common';

import { promptForWorkspaceFolder, selectPlatform } from '../quickpicks/common';
import { getBuildTask } from '../tasks/tasksHelper';
import { BuildTask } from '../tasks/buildTaskProvider';
import { Platform } from '../types/common';

export async function buildModule (node?: DeviceNode | OSVerNode | PlatformNode | TargetNode, folder?: vscode.WorkspaceFolder): Promise<void> {
	try {

		if (!folder) {
			folder = (await promptForWorkspaceFolder()).folder;
		}
		const platform = node?.platform as Platform || (await selectPlatform()).id as Platform;

		const taskDefinition: BuildTask = {
			definition: {
				titaniumBuild: {
					projectType: 'module',
					platform,
					projectDir: folder.uri.fsPath
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
			scope: vscode.TaskScope.Workspace
		};

		const task = await getBuildTask(taskDefinition);
		await vscode.tasks.executeTask(task);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
			const choice = await vscode.window.showErrorMessage('Build Module failed.', { title: 'Rerun' });
			if (choice?.title === 'Rerun') {
				buildModule(node);
			}
		}
	}
}
