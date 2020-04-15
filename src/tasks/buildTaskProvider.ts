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
		return this.getTasks();
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

	private getTasks(): vscode.Task[] {
		const tasks: vscode.Task[] = [];
		let projectType: ProjectType|undefined;

		if (project.isTitaniumApp) {
			projectType = 'app';
		} else if (project.isTitaniumModule) {
			projectType = 'module';
		}

		if (!projectType) {
			return tasks;
		}
		// FIXME: should only be for active platforms
		for (const platform of [ 'android', 'ios' ]) {
			const task: BuildTask = {
				definition: {
					titaniumBuild: {
						platform: platform as Platform,
						projectDir: vscode.workspace.rootPath!,
						projectType
					},
					type: 'titanium-build',
					name: `Generated - Build ${platform}`,
				},
				name: `Build ${platform}`,
				isBackground: false,
				source: 'Titanium',
				presentationOptions: {},
				problemMatchers: [],
				runOptions: {},
				scope: vscode.TaskScope.Workspace
			};
			tasks.push(
				new vscode.Task(
					task.definition,
					vscode.TaskScope.Workspace,
					`Generated - Build ${platform}`,
					'Titanium',
					new vscode.CustomExecution(() => Promise.resolve(new TaskPseudoTerminal(this, task)))
				)
			);
		}
		return tasks;
	}
}
