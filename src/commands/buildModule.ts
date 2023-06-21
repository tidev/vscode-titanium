import * as vscode from 'vscode';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode } from '../explorer/nodes';
import { handleInteractionError, InteractionError } from './common';

import { promptForWorkspaceFolder, selectPlatform } from '../quickpicks/common';
import { getBuildTask } from '../tasks/tasksHelper';
import { ModuleBuildTask } from '../tasks/buildTaskProvider';
import { Platform } from '../types/common';

export async function buildModule (node?: DeviceNode | OSVerNode | PlatformNode | TargetNode, folder?: vscode.WorkspaceFolder): Promise<void> {
	try {

		if (!folder) {
			folder = (await promptForWorkspaceFolder()).folder;
		}
		const platform = node?.platform as Platform || (await selectPlatform()).id as Platform;

		const taskDefinition: ModuleBuildTask = {
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

		if (node?.targetId) {
			taskDefinition.definition.titaniumBuild.target = node.targetId as 'device' | 'emulator' | 'simulator';
		}

		if (node?.version) {
			taskDefinition.definition.titaniumBuild.ios = { simulatorVersion: node.version };
		}

		if (node?.deviceId) {
			taskDefinition.definition.titaniumBuild.deviceId = node.deviceId;
		}

		const task = await getBuildTask(taskDefinition);
		await vscode.tasks.executeTask(task);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
			const choice = await vscode.window.showErrorMessage(vscode.l10n.t('Build Module failed.'), { id: 'rerun', title: vscode.l10n.t('Rerun') });
			if (choice?.id === 'rerun') {
				buildModule(node);
			}
		}
	}
}
