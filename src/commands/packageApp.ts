import * as vscode from 'vscode';
import { DistributeNode, PlatformNode } from '../explorer/nodes';
import { handleInteractionError, InteractionError } from './common';

import { promptForWorkspaceFolder, selectPlatform } from '../quickpicks/common';
import { getPackageTask } from '../tasks/tasksHelper';
import { ExtensionContainer } from '../container';
import { WorkspaceState } from '../constants';
import { nameForPlatform, nameForTarget } from '../utils';
import { PackageTask, AppPackageTaskTitaniumBuildBase } from '../tasks/packageTaskProvider';
import { Platform } from '../types/common';
import { DeploymentTarget } from '../types/cli';

interface LastState extends AppPackageTaskTitaniumBuildBase {
	target: DeploymentTarget;
}

function isDistributeNode(node?: PlatformNode | DistributeNode): node is DistributeNode {
	if (node?.contextValue === 'DistributeNode') {
		return true;
	}
	return false;
}

export async function packageApplication (node?: PlatformNode | DistributeNode, folder?: vscode.WorkspaceFolder): Promise<void> {
	try {

		const lastState = ExtensionContainer.context.workspaceState.get<LastState>(WorkspaceState.LastPackageState);
		let lastDescription: string|undefined;

		if (lastState) {
			try {
				lastDescription = `${nameForPlatform(lastState.platform)} ${nameForTarget(lastState.target)}`;
			} catch (error) {
				// Ignore and clear the state, we don't want to error due to a bad state
				ExtensionContainer.context.workspaceState.update(WorkspaceState.LastBuildState, undefined);
			}
		}

		if (!folder) {
			folder = (await promptForWorkspaceFolder()).folder;
		}

		const buildChoice = node?.platform as string || (await selectPlatform(lastDescription)).id;
		const platform = buildChoice === 'last' ? lastState?.platform as Platform : buildChoice as Platform;

		const taskDefinition: PackageTask = {
			definition: {
				titaniumBuild: {
					projectType: 'app',
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

		if (buildChoice === 'last') {
			Object.assign(taskDefinition.definition.titaniumBuild, lastState);
		} else if (isDistributeNode(node)) {
			(taskDefinition.definition.titaniumBuild as AppPackageTaskTitaniumBuildBase).target = node.targetId;
		}

		const task = await getPackageTask(taskDefinition);
		await vscode.tasks.executeTask(task);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
			const choice = await vscode.window.showErrorMessage('Package App failed', { title: 'Rerun' });
			if (choice?.title === 'Rerun') {
				packageApplication(node);
			}
		}
	}
}
