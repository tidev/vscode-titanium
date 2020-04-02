import * as vscode from 'vscode';
import { TaskExecutionContext, Platform } from './tasksHelper';
import { TaskPseudoTerminal } from './taskPseudoTerminal';
import { TaskHelper, Helpers } from './helpers';

/**
 * Base class the provides the base functionality for resolving and running tasks,
 * build/packaging tasks will extend this and implement the command construction
 * called by the task runner... in theory
 */
export abstract class CommandTaskProvider implements vscode.TaskProvider {

	protected constructor (private readonly telemetryName: string, private readonly helpers: Helpers) { }

	public provideTasks (): vscode.Task[] {
		return [];
	}

	public async resolveTask (task: vscode.Task): Promise<vscode.Task> {
		return new vscode.Task(
			task.definition,
			task.scope || vscode.TaskScope.Workspace,
			task.name,
			task.source,
			new vscode.CustomExecution(() => Promise.resolve(new TaskPseudoTerminal(this, task)))
		);
	}

	public abstract async resolveTaskInformation (context: TaskExecutionContext, task: vscode.Task): Promise<string>

	public async executeTask (context: TaskExecutionContext, task: vscode.Task): Promise<void> {
		// Use this as a centralized place to do things like login checks, analytics etc.

		this.executeTaskInternal(context, task);
	}

	protected abstract async executeTaskInternal (context: TaskExecutionContext, task: vscode.Task): Promise<void>

	public getHelper (platform: Platform): TaskHelper {
		return this.helpers[platform];
	}
}
