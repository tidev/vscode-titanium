import { TaskExecutionContext, ProjectType } from '../tasksHelper';
import { CommandBuilder } from '../commandBuilder';
import { ExtensionContainer } from '../../container';
import { quickPick } from '../../quickpicks';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { UserCancellation } from '../../commands/common';
import { BuildTaskTitaniumBuildBase, AppBuildTaskTitaniumBuildBase } from '../buildTaskProvider';
import { PackageTaskTitaniumBuildBase, AppPackageTaskTitaniumBuildBase } from '../packageTaskProvider';
import { TitaniumBuildBase } from '../commandTaskProvider';
import project from '../../project';
import { WorkspaceState } from '../../constants';

function isDistributionBuild (definition: AppBuildTaskTitaniumBuildBase | AppPackageTaskTitaniumBuildBase): definition is AppPackageTaskTitaniumBuildBase {
	if (definition.target?.startsWith('dist')) {
		return true;
	}
	return false;
}

function isAppBuild<T extends PackageTaskTitaniumBuildBase>(definition: PackageTaskTitaniumBuildBase): definition is T {
	if (definition.projectType) {
		return true;
	}
	return false;
}

function shouldEnableLiveview (definition: AppBuildTaskTitaniumBuildBase): boolean {
	const globalSetting = ExtensionContainer.config.build.liveview;

	if (!definition.debug && (definition.liveview === true || globalSetting)) {
		return true;
	}
	return false;
}

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

		if (definition.extraArguments) {
			builder.addArgs(definition.extraArguments);
		}
	}

	public resolveCommonAppOptions (context: TaskExecutionContext, definition: AppBuildTaskTitaniumBuildBase | AppPackageTaskTitaniumBuildBase, builder: CommandBuilder): void {
		this.resolveCommonOptions(context, definition, builder);

		if (definition.projectType !== 'app') {
			return;
		}

		if (!isDistributionBuild(definition)) {

			if (shouldEnableLiveview(definition)) {
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

		builder.addQuotedOption('--sdk', project.sdk()[0]);

	}

	public async resolveCommonPackagingOptions (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase, builder: CommandBuilder): Promise<void> {
		if (isAppBuild<AppPackageTaskTitaniumBuildBase>(definition)) {
			this.resolveCommonAppOptions(context, definition, builder);
		} else {
			this.resolveCommonOptions(context, definition, builder);
		}

		if (!definition.outputDirectory) {
			const defaultOutput = path.join(definition.projectDir, 'dist');

			const options = [ `Defualt: ${defaultOutput}`, 'Browse' ];

			if ((definition as AppPackageTaskTitaniumBuildBase).target === 'dist-appstore') {
				options.push('Output Into Xcode');
			}

			const selected = await quickPick(options, {
				canPickMany: false,
				placeHolder: 'Choose output location'
			}, {
				forceShow: true
			});

			if (selected === 'Output Into Xcode') {
				return;
			} else if (selected === 'Browse') {
				const customDirectory = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false });
				if (!customDirectory) {
					throw new UserCancellation();
				}
				definition.outputDirectory = customDirectory[0].fsPath;
				builder.addQuotedOption('--output-dir', definition.outputDirectory);
			} else {
				definition.outputDirectory = defaultOutput;
				builder.addQuotedOption('--output-dir', definition.outputDirectory);

			}
		} else if (!await fs.pathExists(definition.outputDirectory)) {
			throw new Error(`Provided output directory ${definition.outputDirectory} cannot be found`);
		}

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

	public storeLastState (type: WorkspaceState, buildOptions: TitaniumBuildBase): void {
		ExtensionContainer.context.workspaceState.update(type, buildOptions);
	}
}
