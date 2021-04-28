import * as vscode from 'vscode';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode } from '../explorer/nodes';
import { checkLogin, handleInteractionError, InteractionError } from './common';

import { promptForWorkspaceFolder, selectPlatform } from '../quickpicks/common';
import { getPackageTask } from '../tasks/tasksHelper';
import { PackageTask } from '../tasks/packageTaskProvider';
import { Platform } from '../types/common';

export async function packageModule (node: DeviceNode | OSVerNode | PlatformNode | TargetNode, folder?: vscode.WorkspaceFolder): Promise<void> {
	try {
		checkLogin();

		if (!folder) {
			folder = (await promptForWorkspaceFolder()).folder;
		}
		const platform = node?.platform as Platform || (await selectPlatform()).id as Platform;

		const taskDefinition: PackageTask = {
			definition: {
				titaniumBuild: {
					projectType: 'module',
					platform,
					projectDir: folder.uri.fsPath
				},
				type: 'titanium-package',
				name: `Package ${platform}`
			},
			name: `Package ${platform}`,
			isBackground: false,
			source: 'Titanium',
			presentationOptions: {},
			problemMatchers: [],
			runOptions: {},
			scope: vscode.TaskScope.Workspace
		};

		const task = await getPackageTask(taskDefinition);
		await vscode.tasks.executeTask(task);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
			const choice = await vscode.window.showErrorMessage('Package Module failed', { title: 'Rerun' });
			if (choice?.title === 'Rerun') {
				packageModule(node);
			}
		}
	}
}
