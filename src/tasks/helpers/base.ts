import { TaskExecutionContext, ProjectType, isDistributionAppBuild } from '../tasksHelper';
import { Command, CommandBuilder } from '../commandBuilder';
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
import { selectDevice } from '../../quickpicks/build/common';
import { IosBuildTaskTitaniumBuildBase } from './ios';

function isAppBuild<T extends TitaniumBuildBase>(definition: TitaniumBuildBase): definition is T {
	if (definition.projectType === 'app') {
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

	public abstract resolveAppBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskTitaniumBuildBase): Promise<Command>
	public abstract resolveAppPackageCommandLine (context: TaskExecutionContext,
		definition: PackageTaskTitaniumBuildBase): Promise<Command>

	public abstract resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskTitaniumBuildBase): Promise<Command>
	public abstract resolveModulePackageCommandLine (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase): Promise<Command>

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

	public async resolveCommonAppOptions (context: TaskExecutionContext, definition: AppBuildTaskTitaniumBuildBase | AppPackageTaskTitaniumBuildBase, builder: CommandBuilder): Promise<void> {
		this.resolveCommonOptions(context, definition, builder);

		if (definition.projectType !== 'app') {
			return;
		}

		if (!definition.target) {
			throw new Error('No target provided');
		}

		builder.addOption('--target', definition.target);

		if (!isDistributionAppBuild(definition)) {

			if (shouldEnableLiveview(definition)) {
				builder.addFlag('--liveview');
			}

			if (definition.deployType) {
				builder.addOption('--deploy-type', definition.deployType);
			}

			if (definition.buildOnly) {
				builder.addFlag('--build-only');
			}

			if (!definition.deviceId) {
				const simulatorVersion = definition.ios ? (definition as IosBuildTaskTitaniumBuildBase).ios.simulatorVersion : undefined;
				const deviceInfo = await selectDevice(definition.platform, definition.target, simulatorVersion);
				definition.deviceId = deviceInfo.udid;
			}

			builder.addOption('--device-id', definition.deviceId);
		}

		builder.addQuotedOption('--sdk', project.sdk()[0]);

	}

	public async resolveCommonPackagingOptions (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase, builder: CommandBuilder): Promise<void> {
		if (isAppBuild<AppPackageTaskTitaniumBuildBase>(definition)) {
			await this.resolveCommonAppOptions(context, definition, builder);
		} else {
			this.resolveCommonOptions(context, definition, builder);
		}

		if (!definition.outputDirectory) {
			const defaultOutput = path.join(definition.projectDir, 'dist');
			const defaultLabel = `Default: ${defaultOutput}`;

			const options = [ defaultLabel, 'Browse' ];

			if ((definition as AppPackageTaskTitaniumBuildBase).target === 'dist-appstore') {
				options.push('Output Into Xcode');
			}

			const selected = await quickPick(options, {
				canPickMany: false,
				placeHolder: 'Choose output location'
			}, {
				forceShow: true
			});

			if (selected === 'Browse') {
				const customDirectory = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false });
				if (!customDirectory) {
					throw new UserCancellation();
				}
				definition.outputDirectory = customDirectory[0].fsPath;
			}
			if (selected === defaultLabel) {
				definition.outputDirectory = defaultOutput;
			}
		} else if (!await fs.pathExists(definition.outputDirectory)) {
			throw new Error(`Provided output directory ${definition.outputDirectory} cannot be found`);
		}
		if (definition.outputDirectory) {
			builder.addQuotedOption('--output-dir', definition.outputDirectory);
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
		// Only store for app builds for now
		if (isAppBuild<AppBuildTaskTitaniumBuildBase|AppPackageTaskTitaniumBuildBase>(buildOptions)) {
			ExtensionContainer.addRecentBuild(buildOptions);
		}
	}

	public createBuilder (): CommandBuilder {
		if (ExtensionContainer.isUsingTi()) {
			return CommandBuilder.create('ti', 'build');
		} else {
			return CommandBuilder.create('appc', 'run');
		}
	}
}
