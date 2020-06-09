import * as vscode from 'vscode';
import { TaskExecutionContext, Platform, ProjectType } from './tasksHelper';
import { TaskPseudoTerminal, CommandError } from './taskPseudoTerminal';
import { TaskHelper, Helpers } from './helpers';
import { UserCancellation, handleInteractionError, InteractionError } from '../commands/common';
import { LogLevel } from '../types/common';

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

	public provideTasks (): vscode.Task[] {
		return [];
	}

	public async resolveTask (task: TitaniumTaskBase): Promise<vscode.Task> {
		return new vscode.Task(
			task.definition,
			task.scope || vscode.TaskScope.Workspace,
			task.name,
			task.source,
			new vscode.CustomExecution(() => Promise.resolve(new TaskPseudoTerminal(this, task)))
		);
	}

	public abstract async resolveTaskInformation (context: TaskExecutionContext, task: TitaniumTaskBase): Promise<string>

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
			} else {
				message = `${message}\n${error.message}`;
			}

			context.terminal.writeErrorLine(message);

			return 1;
		}

		return 0;

	}

	protected abstract async executeTaskInternal (context: TaskExecutionContext, task: TitaniumTaskBase): Promise<void>

	public getHelper (platform: Platform): TaskHelper {
		return this.helpers[platform];
	}
}
