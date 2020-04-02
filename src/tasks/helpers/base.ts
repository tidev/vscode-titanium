import { TaskExecutionContext, BuildTaskDefinitionBase, TaskDefinitionBase } from '../tasksHelper';
import { CommandBuilder } from '../commandBuilder';
import { ExtensionContainer } from '../../container';

export abstract class TaskHelper {

	public abstract async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskDefinitionBase): Promise<string>
	// public abstract async resolveAppPackageCommandLine (context: TaskExecutionContext, definition: PackageTaskDefinitionBase): Promise<string>

	public abstract async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskDefinitionBase): Promise<string>
	// public abstract async resolveModulePackageOptions (context: TaskExecutionContext, definition: PackageTaskDefinitionBase): Promise<string>

	public resolveCommonOptions (context: TaskExecutionContext, definition: TaskDefinitionBase, builder: CommandBuilder): void {

		builder
			.addQuotedOption('--project-dir', definition.projectDir)
			.addOption('--log-level', definition.logLevel || ExtensionContainer.config.general.logLevel)
			.addOption('--platform', definition.platform);
	}
}
