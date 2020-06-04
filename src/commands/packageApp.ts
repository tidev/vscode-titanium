import * as vscode from 'vscode';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode } from '../explorer/nodes';
import { checkLogin, handleInteractionError, InteractionError } from './common';

import { selectPlatform } from '../quickpicks/common';
import { Platform, getPackageTask } from '../tasks/tasksHelper';
import { ExtensionContainer } from '../container';
import { WorkspaceState } from '../constants';
import { nameForPlatform, nameForTarget } from '../utils';
import { PackageTask, AppPackageTaskTitaniumBuildBase } from '../tasks/packageTaskProvider';

interface LastState extends AppPackageTaskTitaniumBuildBase {
	target: 'dist-appstore' | 'dist-adhoc' | 'dist-playstore';
}

export async function packageApplication (node: DeviceNode | OSVerNode | PlatformNode | TargetNode): Promise<void> {
	try {
		checkLogin();

		const lastState = ExtensionContainer.context.workspaceState.get<LastState>(WorkspaceState.LastPackageState);
		let lastDescription: string|undefined;

		if (lastState) {
			try {
				lastDescription = `${nameForPlatform(lastState.platform)} ${nameForTarget(lastState.target)}`;
			} catch (error) {
				console.log(error);
				// Ignore and clear the state, we don't want to error due to a bad state
				ExtensionContainer.context.workspaceState.update(WorkspaceState.LastBuildState, undefined);
			}
		}

		const buildChoice = node?.platform as string || (await selectPlatform(lastDescription)).id;
		const platform = buildChoice === 'last' ? lastState?.platform as Platform : buildChoice as Platform;

		const taskDefinition: PackageTask = {
			definition: {
				titaniumBuild: {
					projectType: 'app',
					platform,
					projectDir: vscode.workspace.rootPath!
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
		}

		const task = await getPackageTask(taskDefinition);
		await vscode.tasks.executeTask(task);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
