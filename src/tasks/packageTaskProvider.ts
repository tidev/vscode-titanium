import * as path from 'path';
import { CommandTaskProvider, TitaniumTaskBase, TitaniumTaskDefinitionBase, TitaniumBuildBase } from './commandTaskProvider';
import { Helpers } from './helpers';
import { TaskExecutionContext } from './tasksHelper';
import { selectDistributionTarget } from '../quickpicks/build/common';
import { DeploymentTarget } from '../types/cli';
import { Command } from './commandBuilder';
import { promptForWorkspaceFolder } from '../quickpicks';

export interface PackageTask extends TitaniumTaskBase {
	definition: PackageTaskDefinitionBase;
}

export interface PackageTaskDefinitionBase extends TitaniumTaskDefinitionBase {
	titaniumBuild: AppPackageTaskTitaniumBuildBase | ModulePackageTaskTitaniumBuildBase;
}

export interface PackageTaskTitaniumBuildBase extends TitaniumBuildBase {
	outputDirectory?: string;
}

export interface ModulePackageTaskTitaniumBuildBase extends PackageTaskTitaniumBuildBase {
	projectType?: 'module';
}

export interface AppPackageTaskTitaniumBuildBase extends PackageTaskTitaniumBuildBase {
	target?: DeploymentTarget;
	projectType?: 'app';
}

export class PackageTaskProvider extends CommandTaskProvider {

	public constructor (helpers: Helpers) {
		super('titanium-package', helpers);
	}

	public async resolveTaskInformation (context: TaskExecutionContext, task: PackageTask): Promise<Command> {
		const { definition } = task;

		if (!definition.titaniumBuild.projectDir) {
			const folderDetectOptions = { apps: true, modules: true };

			if (definition.titaniumBuild.projectType === 'app') {
				folderDetectOptions.modules = false;
			} else if (definition.titaniumBuild.projectType === 'module') {
				folderDetectOptions.apps = false;
			}
			const { folder } = await promptForWorkspaceFolder(folderDetectOptions);
			definition.titaniumBuild.projectDir = folder.uri.fsPath;
		}

		const helper = this.getHelper(definition.titaniumBuild.platform);

		if (!definition.titaniumBuild.projectType) {
			definition.titaniumBuild.projectType = await helper.determineProjectType(definition.titaniumBuild.projectDir, definition.titaniumBuild.platform);
		}

		if (definition.titaniumBuild.projectType === 'app') {

			if (!definition.titaniumBuild.target) {
				definition.titaniumBuild.target = (await selectDistributionTarget(definition.platform)).id as 'dist-adhoc' | 'dist-appstore' | 'dist-playstore';
			}

			return helper.resolveAppPackageCommandLine(context, definition.titaniumBuild);
		} else if (definition.titaniumBuild.projectType === 'module') {
			definition.titaniumBuild.projectDir = path.join(definition.titaniumBuild.projectDir, definition.titaniumBuild.platform);
			return helper.resolveModulePackageCommandLine(context, definition.titaniumBuild);
		} else {
			throw new Error(`Unknown project type ${definition.projectType}`);
		}
	}

	protected async executeTaskInternal (context: TaskExecutionContext, task: PackageTask): Promise<void> {
		const buildInfo = await this.resolveTaskInformation(context, task);

		await context.terminal.executeCommand(buildInfo, context.folder, context.cancellationToken);
	}
}
