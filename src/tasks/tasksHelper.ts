import * as vscode from 'vscode';
import { BuildTaskProvider, AppBuildTaskTitaniumBuildBase } from './buildTaskProvider';
import { TaskPseudoTerminal } from './taskPseudoTerminal';
import { androidHelper, iOSHelper, Helpers } from './helpers';
import { AppPackageTaskTitaniumBuildBase, PackageTaskProvider } from './packageTaskProvider';
import { ExtensionContainer } from '../container';
import { TitaniumTaskBase, TitaniumTaskDefinitionBase } from './commandTaskProvider';
import { DeviceNode } from '../explorer/nodes';

export type TitaniumTaskTypes = 'titanium-build' | 'titanium-package';
export type ProjectType = 'app' | 'module';

export interface RunningTask {
	buildOptions: AppBuildTaskTitaniumBuildBase;
}

export const debugSessionInformation: Map<string, DeviceNode> = new Map();
export const DEBUG_SESSION_VALUE = 'DEBUG_SESSION_VALUE';

const helpers: Helpers = {
	android: androidHelper,
	ios: iOSHelper
};

const buildTaskProvider = new BuildTaskProvider(helpers);
const packageTaskProvider = new PackageTaskProvider(helpers);

export function registerTaskProviders (ctx: vscode.ExtensionContext): void {

	ctx.subscriptions.push(
		vscode.tasks.registerTaskProvider(
			'titanium-build',
			buildTaskProvider
		)
	);

	ctx.subscriptions.push(
		vscode.tasks.registerTaskProvider(
			'titanium-package',
			packageTaskProvider
		)
	);

	// We want to track the start and ending of tasks here as it allows us to
	// obtain the task executions that will allow a user to click the stop
	// button to kill a running build.

	ctx.subscriptions.push(
		vscode.tasks.onDidStartTask(e => {
			if (e.execution.task.definition.type.startsWith('titanium')) {
				ExtensionContainer.runningTask = e.execution;
			}
		})
	);

	ctx.subscriptions.push(
		vscode.tasks.onDidEndTask(e => {
			if (e.execution.task.definition.type.startsWith('titanium')) {
				ExtensionContainer.runningTask = undefined;
			}
		})
	);
}

export interface TaskExecutionContext {
	cancellationToken: vscode.CancellationToken;
	folder: vscode.WorkspaceFolder;
	terminal: TaskPseudoTerminal;
	label: string;
	task: TitaniumTaskBase;
}

export async function getBuildTask(task: TitaniumTaskBase): Promise<vscode.Task> {
	return buildTaskProvider.resolveTask(task);
}

export async function getPackageTask(task: TitaniumTaskBase): Promise<vscode.Task> {
	return packageTaskProvider.resolveTask(task);
}

/**
 * Gets the active tasks for the workspace, you should generally use `vscode.tasks.fetchTasks`
 * but this is useful for when you need to fetch information that isn't available from that API
 * such as the problem matchers associated with at ask
 *
 * @param {string} folder - Workspace folder to get tasks for.
 * @returns {TitaniumTaskDefinitionBase[]}
 */
export function getTasks <T extends TitaniumTaskDefinitionBase> (folder: vscode.WorkspaceFolder): T[] {
	const workspaceTasks = vscode.workspace.getConfiguration('tasks', folder);
	const allTasks = workspaceTasks && workspaceTasks.tasks as T[] || [];

	return allTasks;
}

/**
 * Determines whether a build definition is for an distribution build or not.
 *
 * @export
 * @param {AppBuildTaskTitaniumBuildBase | AppPackageTaskTitaniumBuildBase} definition - The build definition
 * @returns {Boolean}
 */
export function isDistributionAppBuild (definition: AppBuildTaskTitaniumBuildBase | AppPackageTaskTitaniumBuildBase): definition is AppPackageTaskTitaniumBuildBase {
	if (definition.target?.startsWith('dist')) {
		return true;
	}
	return false;
}
