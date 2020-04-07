import * as vscode from 'vscode';
import * as path from 'path';
import { CommandTaskProvider, TaskBase } from './commandTaskProvider';
import { Helpers } from './helpers';
import { TaskExecutionContext, PackageTaskDefinitionBase } from './tasksHelper';
import { selectDistributionTarget } from '../quickpicks';

export interface PackageBuildTask extends TaskBase {
	definition: PackageTaskDefinitionBase;
}

export class PackageTaskProvider extends CommandTaskProvider {

	public constructor (helpers: Helpers) {
		super('titanium-package', helpers);
	}

	public async resolveTaskInformation (context: TaskExecutionContext, task: PackageBuildTask): Promise<string> {
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
				definition.target = (await selectDistributionTarget(definition.platform)).id as 'dist-adhoc' | 'dist-appstore' | 'dist-playstore';
			}

			return helper.resolveAppPackageCommandLine(context, task.definition);
		} else if (definition.projectType === 'module') {
			definition.projectDir = path.join(definition.projectDir, definition.platform);
			return helper.resolveModulePackageCommandLine(context, task.definition);
		} else {
			throw new Error(`Unknown project type ${definition.projectType}`);
		}
	}

	protected async executeTaskInternal (context: TaskExecutionContext, task: PackageBuildTask): Promise<void> {
		const buildInfo = await this.resolveTaskInformation(context, task);

		await context.terminal.executeCommand(buildInfo, context.folder, context.cancellationToken);
	}
}
