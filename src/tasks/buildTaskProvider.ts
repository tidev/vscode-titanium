import * as vscode from 'vscode';
import * as path from 'path';
import { CommandTaskProvider, TaskBase } from './commandTaskProvider';
import { selectBuildTarget } from '../quickpicks/common';
import { TaskExecutionContext, AppBuildTaskDefinitionBase } from './tasksHelper';
import { Helpers } from './helpers/';

export interface AppBuildTask extends TaskBase {
	definition: AppBuildTaskDefinitionBase;
}

export class BuildTaskProvider extends CommandTaskProvider {

	public constructor (helpers: Helpers) {
		super('titanium-build', helpers);
	}

	public async resolveTaskInformation (context: TaskExecutionContext, task: AppBuildTask): Promise<string> {
		const { definition } = task;

		if (!definition.projectDir) {
			definition.projectDir = vscode.workspace.rootPath!;
		}

		const helper = this.getHelper(definition.platform);

		if (!definition.projectType) {
			definition.projectType = await helper.determineProjectType(definition.projectDir, definition.platform);
		}

		if (definition.projectType === 'app') {

			if (!definition.target) {
				definition.target = (await selectBuildTarget(definition.platform)).id as 'device' | 'emulator' | 'simulator';
			}

			return helper.resolveAppBuildCommandLine(context, task.definition);
		} else if (definition.projectType === 'module') {
			definition.projectDir = path.join(definition.projectDir, definition.platform);
			return helper.resolveModuleBuildCommandLine(context, task.definition);
		} else {
			throw new Error(`Unknown project type ${definition.projectType}`);
		}

	}

	protected async executeTaskInternal (context: TaskExecutionContext, task: AppBuildTask): Promise<void> {
		const buildInfo = await this.resolveTaskInformation(context, task);

		await context.terminal.executeCommand(buildInfo, context.folder, context.cancellationToken);
	}
}
