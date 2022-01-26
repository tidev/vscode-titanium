import * as vscode from 'vscode';
import { TaskExecutionContext } from './tasksHelper';
import { TaskPseudoTerminal } from './taskPseudoTerminal';
import { TaskHelper, Helpers } from './helpers';
import { UserCancellation, handleInteractionError, InteractionError } from '../commands/common';
import { LogLevel, Platform, ProjectType } from '../types/common';
import { CommandError } from '../common/utils';
import { Command } from './commandBuilder';

function getPlatform (task: TitaniumTaskBase): Platform {
	if (task.definition.titaniumBuild.platform === 'android' || task.definition.titaniumBuild.android !== undefined) {
		return 'android';
	} else if (task.definition.titaniumBuild.platform === 'ios' || task.definition.titaniumBuild.ios !== undefined) {
		return 'ios';
	} else if (task.definition.titaniumBuild.platform) {
		throw new Error(`Unknown platform ${task.definition.titaniumBuild.platform}`);
	} else {
		throw new Error('Invalid configuration, please specify a platform');
	}
}

export interface TitaniumTaskBase extends vscode.Task {
	definition: TitaniumTaskDefinitionBase;
}

export interface TitaniumTaskDefinitionBase extends vscode.TaskDefinition {
	titaniumBuild: TitaniumBuildBase;
	type: 'titanium-build' | 'titanium-package';
}

export interface TitaniumBuildBase {
	platform: Platform;
	projectDir: string;
	sdkVersion?: string;
	logLevel?: LogLevel;
	projectType?: ProjectType;
	android?: Record<string, unknown>;
	ios?: Record<string, unknown>;
	extraArguments?: Array<string>;
}

export abstract class CommandTaskProvider implements vscode.TaskProvider {

	protected constructor (private readonly telemetryName: string, private readonly helpers: Helpers) { }

	public async provideTasks (): Promise<vscode.Task[]> {
		return [];
	}

	public async resolveTask (task: TitaniumTaskBase): Promise<vscode.Task> {
		return new vscode.Task(
			task.definition,
			task.scope || vscode.TaskScope.Workspace,
			task.name,
			task.source,
			new vscode.CustomExecution((resolvedDefinition) => Promise.resolve(new TaskPseudoTerminal(this, task, resolvedDefinition as TitaniumTaskDefinitionBase)))
		);
	}

	public abstract resolveTaskInformation (context: TaskExecutionContext, task: TitaniumTaskBase): Promise<Command>

	public async executeTask (context: TaskExecutionContext, task: TitaniumTaskBase): Promise<number> {
		// Use this as a centralized place to do things like login checks, analytics etc.

		try {

			task.definition.platform = getPlatform(task);

			await this.executeTaskInternal(context, task);
		} catch (error) {
			let message = 'Error running task';
			if (error instanceof CommandError) {
				message = error.message;
			} else if (error instanceof InteractionError) {
				await handleInteractionError(error);
			} else if (error instanceof UserCancellation) {
				context.terminal.writeWarningLine('Task cancelled as no selection occurred');
				return 0;
			} else if (error instanceof Error) {
				message = `${message}\n${error.message}`;
			}

			context.terminal.writeErrorLine(message);

			return 1;
		}

		return 0;

	}

	protected abstract executeTaskInternal (context: TaskExecutionContext, task: TitaniumTaskBase): Promise<void>

	public getHelper (platform: Platform): TaskHelper {
		return this.helpers[platform];
	}
}
