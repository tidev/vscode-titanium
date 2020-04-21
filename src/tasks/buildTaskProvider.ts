import * as vscode from 'vscode';
import * as path from 'path';
import { CommandTaskProvider, TitaniumTaskBase, TitaniumTaskDefinitionBase, TitaniumBuildBase } from './commandTaskProvider';
import { selectBuildTarget } from '../quickpicks/common';
import { TaskExecutionContext, Platform, ProjectType } from './tasksHelper';
import { Helpers } from './helpers/';
import { TaskPseudoTerminal } from './taskPseudoTerminal';
import project from '../project';

export interface BuildTask extends TitaniumTaskBase {
	definition: BuildTaskDefinitionBase;
}

export interface AppBuildTask extends BuildTask {
	definition: AppBuildTaskDefinitionBase;
}

export interface AppBuildTaskDefinitionBase extends TitaniumTaskDefinitionBase {
	titaniumBuild: AppBuildTaskTitaniumBuildBase;
}

export interface BuildTaskDefinitionBase extends TitaniumTaskDefinitionBase {
	titaniumBuild: AppBuildTaskTitaniumBuildBase | ModuleBuildTaskTitaniumBuildBase;
}

export interface BuildTaskTitaniumBuildBase extends TitaniumBuildBase {
	buildOnly?: boolean;
	projectType?: 'app' | 'module';
}

export interface AppBuildTaskTitaniumBuildBase extends BuildTaskTitaniumBuildBase {
	deviceId?: string;
	target?: 'device' | 'emulator' | 'simulator';
	projectType?: 'app';
	liveview?: boolean;
	deployType?: 'development' | 'test';
}

export interface ModuleBuildTaskTitaniumBuildBase extends BuildTaskTitaniumBuildBase {
	projectType?: 'module';
}

export class BuildTaskProvider extends CommandTaskProvider {

	public constructor (helpers: Helpers) {
		super('titanium-build', helpers);
	}

	public provideTasks (): vscode.Task[] {
		return [];
	}

	public async resolveTaskInformation (context: TaskExecutionContext, task: BuildTask): Promise<string> {
		const { definition } = task;

		if (!definition.titaniumBuild.projectDir) {
			definition.titaniumBuild.projectDir = vscode.workspace.rootPath!;
		}

		const helper = this.getHelper(definition.titaniumBuild.platform);

		if (!definition.titaniumBuild.projectType) {
			definition.titaniumBuild.projectType = await helper.determineProjectType(definition.titaniumBuild.projectDir, definition.titaniumBuild.platform);
		}

		if (definition.titaniumBuild.projectType === 'app') {

			if (!definition.titaniumBuild.target) {
				definition.titaniumBuild.target = (await selectBuildTarget(definition.titaniumBuild.platform)).id as 'device' | 'emulator' | 'simulator';
			}

			return helper.resolveAppBuildCommandLine(context, task.definition.titaniumBuild);
		} else if (definition.titaniumBuild.projectType === 'module') {
			definition.titaniumBuild.projectDir = path.join(definition.titaniumBuild.projectDir, definition.titaniumBuild.platform);
			return helper.resolveModuleBuildCommandLine(context, task.definition.titaniumBuild);
		} else {
			throw new Error(`Unknown project type ${definition.titaniumBuild.projectType}`);
		}

	}

	protected async executeTaskInternal (context: TaskExecutionContext, task: BuildTask): Promise<void> {
		const buildInfo = await this.resolveTaskInformation(context, task);

		await context.terminal.executeCommand(buildInfo, context.folder, context.cancellationToken);
	}
}
