import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CommandTaskProvider, TaskBase } from './commandTaskProvider';
import { selectBuildTarget } from '../quickpicks/common';
import { TaskExecutionContext } from './tasksHelper';
import { IosAppBuildDefinition, Helpers, AndroidBuildDefinition } from './helpers/';

export interface AppBuildTask extends TaskBase {
	definition: AndroidBuildDefinition | IosAppBuildDefinition;
}

export type ProjectType = 'app' | 'module';

async function determineProjectType (directory: string, platform: string): Promise<ProjectType> {
	if (!await fs.pathExists(directory)) {
		throw new Error(`Project directory ${directory} does not exist`);
	}

	if (await fs.pathExists(path.join(directory, 'tiapp.xml'))) {
		return 'app';
	} else if (await fs.pathExists(path.join(directory, platform, 'timodule.xml'))) {
		return 'module';
	} else {
		throw new Error(`Unable to determine project type from ${directory}`);
	}
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

		if (!definition.projectType) {
			definition.projectType = await determineProjectType(definition.projectDir, definition.platform);
		}

		const helper = this.getHelper(definition.platform);

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
