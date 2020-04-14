import { TaskExecutionContext, ProjectType } from '../tasksHelper';
import { CommandBuilder } from '../commandBuilder';
import { ExtensionContainer } from '../../container';
import { yesNoQuestion } from '../../quickpicks';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { UserCancellation } from '../../commands/common';
import { BuildTaskTitaniumBuildBase, AppBuildTaskTitaniumBuildBase } from '../buildTaskProvider';
import { PackageTaskTitaniumBuildBase } from '../packageTaskProvider';
import { TitaniumBuildBase } from '../commandTaskProvider';

export abstract class TaskHelper {

	public abstract async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskTitaniumBuildBase): Promise<string>
	public abstract async resolveAppPackageCommandLine (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase): Promise<string>

	public abstract async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskTitaniumBuildBase): Promise<string>
	public abstract async resolveModulePackageCommandLine (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase): Promise<string>

	public resolveCommonOptions (context: TaskExecutionContext, definition: TitaniumBuildBase, builder: CommandBuilder): void {

		builder
			.addQuotedOption('--project-dir', definition.projectDir)
			.addOption('--log-level', definition.logLevel || ExtensionContainer.config.general.logLevel)
			.addOption('--platform', definition.platform)
			.addFlag('--color') // We need this flag to force the colorization of output as using a pseudoterminal means we don't detect having a TTY
			.addFlag('--no-prompt');
	}

	public resolveCommonAppOptions (context: TaskExecutionContext, definition: AppBuildTaskTitaniumBuildBase, builder: CommandBuilder): void {
		this.resolveCommonOptions(context, definition, builder);

		if (definition.projectType !== 'app') {
			return;
		}

		if (!definition.target?.startsWith('dist')) {
			if (definition.liveview) {
				builder.addFlag('--liveview');
			}

			if (definition.deployType) {
				builder.addOption('--deploy-type', definition.deployType);
			}

			if (definition.buildOnly) {
				builder.addFlag('--build-only');
			}
		}

		builder.addOption('--target', definition.target as string);
	}

	public async resolveCommonPackagingOptions (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase, builder: CommandBuilder): Promise<void> {
		this.resolveCommonOptions(context, definition, builder);

		if (!definition.outputDirectory) {
			const defaultOutput = path.join(definition.projectDir, 'dist');
			const useDefaultOutputChoice = await yesNoQuestion({ placeHolder: `Use default output directory ${defaultOutput}?` }, false, [ 'Yes', 'Choose custom output directory' ]);
			if (useDefaultOutputChoice) {
				definition.outputDirectory = defaultOutput;
			} else {
				const customDirectory = await vscode.window.showOpenDialog({ canSelectFolders: false, canSelectMany: false });
				if (!customDirectory) {
					throw new UserCancellation();
				}
				definition.outputDirectory = customDirectory[0].fsPath;
			}
		} else if (!await fs.pathExists(definition.outputDirectory)) {
			throw new Error(`Provided output directory ${definition.outputDirectory}`);
		}

		builder.addQuotedOption('--output-dir', definition.outputDirectory);
	}

	public async determineProjectType (directory: string, platform: string): Promise<ProjectType> {
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
}
