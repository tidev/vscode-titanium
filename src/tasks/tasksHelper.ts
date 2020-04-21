import * as vscode from 'vscode';
import { BuildTaskProvider } from './buildTaskProvider';
import { TaskPseudoTerminal } from './taskPseudoTerminal';
import { androidHelper, iOSHelper, Helpers } from './helpers';
import { PackageTaskProvider } from './packageTaskProvider';
import { quickPick } from '../quickpicks';
import { InteractionError } from '../commands';
import { ExtensionContainer } from '../container';
import { TitaniumTaskBase } from './commandTaskProvider';

export type TitaniumTaskTypes = 'titanium-build' | 'titanium-package';

export type Platform = 'android' | 'ios';
export type ProjectType = 'app' | 'module';

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
}

export async function getBuildTask(task: TitaniumTaskBase): Promise<vscode.Task> {
	return buildTaskProvider.resolveTask(task);
}

export async function getPackageTask(task: TitaniumTaskBase): Promise<vscode.Task> {
	return packageTaskProvider.resolveTask(task);
}
