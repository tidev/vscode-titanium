import * as vscode from 'vscode';
import { BuildTaskProvider, AppBuildTaskTitaniumBuildBase } from './buildTaskProvider';
import { TaskPseudoTerminal } from './taskPseudoTerminal';
import { androidHelper, iOSHelper, Helpers } from './helpers';
import { PackageTaskProvider } from './packageTaskProvider';
import { ExtensionContainer } from '../container';
import { TitaniumTaskBase, TitaniumTaskDefinitionBase } from './commandTaskProvider';

export type TitaniumTaskTypes = 'titanium-build' | 'titanium-package';

export type Platform = 'android' | 'ios';
export type ProjectType = 'app' | 'module';

export interface RunningTask {
	buildOptions: AppBuildTaskTitaniumBuildBase;
}

export const runningTasks: Map<string, RunningTask> = new Map();

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
}

export async function getBuildTask(task: TitaniumTaskBase): Promise<vscode.Task> {
	return buildTaskProvider.resolveTask(task);
}

export async function getPackageTask(task: TitaniumTaskBase): Promise<vscode.Task> {
	return packageTaskProvider.resolveTask(task);
}

/**
 * Adds a task to the workspace tasks.json file.
 *
 * @param {TitaniumTaskDefinitionBase} task - Task definition to add.
 * @param {string} folder - Workspace folder to add to.
 * @returns {void}
 */
export async function addTask(task: TitaniumTaskDefinitionBase, folder: string): Promise<void> {
	const workspaceTasks = vscode.workspace.getConfiguration('tasks', vscode.Uri.file(folder));
	const allTasks = workspaceTasks && workspaceTasks.tasks as TitaniumTaskDefinitionBase[] || [];

	allTasks.push(task);

	await workspaceTasks.update('tasks', allTasks, vscode.ConfigurationTarget.WorkspaceFolder);
}

/**
 * Gets the active tasks for the workspace, you should generally use `vscode.tasks.fetchTasks`
 * but this is useful for when you need to fetch information that isn't available from that API
 * such as the problem matchers associated with at ask
 *
 * @param {string} folder - Workspace folder to get tasks for.
 * @returns {TitaniumTaskDefinitionBase[]}
 */
export function getTasks (folder: string): TitaniumTaskDefinitionBase[] {
	const workspaceTasks = vscode.workspace.getConfiguration('tasks', vscode.Uri.file(folder));
	const allTasks = workspaceTasks && workspaceTasks.tasks as TitaniumTaskDefinitionBase[] || [];

	return allTasks;
}
