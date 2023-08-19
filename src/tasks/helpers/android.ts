import { TaskExecutionContext } from '../tasksHelper';
import { TaskHelper } from './base';
import { Command } from '../commandBuilder';
import { enterAndroidKeystoreInfo } from '../../quickpicks/build/android';
import { KeystoreInfo } from '../../types/common';
import { AppBuildTaskTitaniumBuildBase, BuildTaskDefinitionBase, ModuleBuildTaskTitaniumBuildBase } from '../buildTaskProvider';
import { AppPackageTaskTitaniumBuildBase, PackageTaskDefinitionBase, PackageTaskTitaniumBuildBase } from '../packageTaskProvider';
import { WorkspaceState } from '../../constants';
import { ExtensionContainer } from '../../container';
import { l10n } from 'vscode';

export interface AndroidBuildTaskDefinition extends BuildTaskDefinitionBase {
	titaniumBuild: AndroidBuildTaskTitaniumBuildBase;
}

export interface AndroidBuildTaskTitaniumBuildBase extends AppBuildTaskTitaniumBuildBase {
	platform: 'android';
	target: 'device' | 'emulator';
}

export interface AndroidTitanumPackageDefiniton extends PackageTaskDefinitionBase {
	titaniumBuild: AndroidPackageTaskTitaniumBuildBase;
}

export interface AndroidPackageTaskTitaniumBuildBase extends AppPackageTaskTitaniumBuildBase {
	android: {
		keystore: KeystoreInfo;
	};
	target: 'dist-playstore';
}

export class AndroidHelper extends TaskHelper {

	public async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: AndroidBuildTaskTitaniumBuildBase): Promise<Command> {
		const builder = this.createBuilder();

		await this.resolveCommonAppOptions(context, definition, builder);

		if (definition.debug) {
			const port = definition.debugPort || ExtensionContainer.debugPorts.get(definition.projectDir);
			if (!port) {
				throw new Error(l10n.t('Failed to find debug port associated with {0}. Please try setting a "port" property in the configuration.', definition.projectDir));
			}
			builder.addOption('--debug-host', `/localhost:${port}`);
		}

		this.storeLastState(WorkspaceState.LastBuildState, definition);
		ExtensionContainer.runningTasks.set(context.label, { buildOptions: definition });

		return builder.resolve();
	}

	public async resolveAppPackageCommandLine(context: TaskExecutionContext, definition: AndroidPackageTaskTitaniumBuildBase): Promise<Command> {
		const builder = this.createBuilder();

		await this.resolveCommonPackagingOptions(context, definition, builder);

		const androidInfo = definition.android || {
			keystore: { }
		};

		androidInfo.keystore = await enterAndroidKeystoreInfo(context.folder, androidInfo.keystore);

		builder
			.addQuotedOption('--keystore', androidInfo.keystore.location)
			.addQuotedOption('--alias', androidInfo.keystore.alias)
			.addEnvironmentArgument('--store-password', androidInfo.keystore.password);

		if (androidInfo.keystore.privateKeyPassword) {
			builder.addEnvironmentArgument('--key-password', androidInfo.keystore.privateKeyPassword);
		}

		definition.android = androidInfo;

		this.storeLastState(WorkspaceState.LastPackageState, definition);

		return builder.resolve();
	}

	public async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: ModuleBuildTaskTitaniumBuildBase): Promise<Command> {
		const builder = this.createBuilder();

		await this.resolveCommonModuleOptions(context, definition, builder);

		return builder.resolve();
	}

	public async resolveModulePackageCommandLine (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase): Promise<Command> {
		const builder = this.createBuilder();

		this.resolveCommonOptions(context, definition, builder);

		builder.addFlag('--build-only');

		return builder.resolve();
	}
}

export const androidHelper = new AndroidHelper();
