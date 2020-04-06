import { TaskExecutionContext, TaskDefinitionBase, BuildTaskDefinitionBase, AppBuildTaskDefinitionBase } from '../tasksHelper';
import { CommandBuilder } from '../commandBuilder';
import { ExtensionContainer } from '../../container';

export abstract class TaskHelper {

	public abstract async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: AppBuildTaskDefinitionBase): Promise<string>
	// public abstract async resolveAppPackageCommandLine (context: TaskExecutionContext, definition: AppPackageTaskDefinitionBase): Promise<string>

	public abstract async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskDefinitionBase): Promise<string>
	// public abstract async resolveModulePackageOptions (context: TaskExecutionContext, definition: PackageTaskDefinitionBase): Promise<string>

	public resolveCommonOptions (context: TaskExecutionContext, definition: TaskDefinitionBase, builder: CommandBuilder): void {

		builder
			.addQuotedOption('--project-dir', definition.projectDir)
			.addOption('--log-level', definition.logLevel || ExtensionContainer.config.general.logLevel)
			.addOption('--platform', definition.platform)
			.addFlag('--color'); // We need this flag to force the colorization of output
	}

	public resolveCommonAppOptions (context: TaskExecutionContext, definition: TaskDefinitionBase, builder: CommandBuilder): void {
		this.resolveCommonOptions(context, definition, builder);

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
}
