import * as vscode from 'vscode';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode } from '../explorer/nodes';
import { checkLogin, handleInteractionError, InteractionError } from './common';

import { selectPlatform } from '../quickpicks/common';
import { getBuildTask, Platform } from '../tasks/tasksHelper';
import { PackageTask } from '../tasks/packageTaskProvider';

export async function packageModule (node: DeviceNode | OSVerNode | PlatformNode | TargetNode): Promise<void> {
	try {
		checkLogin();

		const platform = node?.platform as Platform || (await selectPlatform()).id as Platform;

		const taskDefinition: PackageTask = {
			definition: {
				titaniumBuild: {
					projectType: 'module',
					platform,
					projectDir: vscode.workspace.rootPath!
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
		}
	}
}
