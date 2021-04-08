import { TaskExecutionContext, runningTasks } from '../tasksHelper';
import { TaskHelper } from './base';
import { enterAndroidKeystoreInfo } from '../../quickpicks/build/android';
import { KeystoreInfo } from '../../types/common';
import { AppBuildTaskTitaniumBuildBase, BuildTaskDefinitionBase, BuildTaskTitaniumBuildBase } from '../buildTaskProvider';
import { AppPackageTaskTitaniumBuildBase, PackageTaskDefinitionBase, PackageTaskTitaniumBuildBase } from '../packageTaskProvider';
import { WorkspaceState } from '../../constants';

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

	public async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: AndroidBuildTaskTitaniumBuildBase): Promise<string> {
		const builder = this.createBuilder();

		await this.resolveCommonAppOptions(context, definition, builder);

		if (definition.debugPort || definition.debug) {
			builder.addOption('--debug-host', `/localhost:${definition.debugPort || '9000'}`);
		}

		this.storeLastState(WorkspaceState.LastBuildState, definition);
		runningTasks.set(context.label, { buildOptions: definition });

		return builder.resolve();
	}

	public async resolveAppPackageCommandLine(context: TaskExecutionContext, definition: AndroidPackageTaskTitaniumBuildBase): Promise<string> {
		const builder = this.createBuilder();

		await this.resolveCommonPackagingOptions(context, definition, builder);

		const androidInfo = definition.android || {
			keystore: { }
		};

		androidInfo.keystore = await enterAndroidKeystoreInfo(context.folder, androidInfo.keystore);

		builder
			.addQuotedOption('--keystore', androidInfo.keystore.location)
			.addOption('--alias', androidInfo.keystore.alias)
			.addQuotedOption('--store-password', androidInfo.keystore.password);

		if (androidInfo.keystore.privateKeyPassword) {
			builder.addQuotedOption('--key-password', androidInfo.keystore.privateKeyPassword);
		}

		definition.android = androidInfo;

		this.storeLastState(WorkspaceState.LastPackageState, definition);

		return builder.resolve();
	}

	public async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskTitaniumBuildBase): Promise<string> {
		const builder = this.createBuilder();

		this.resolveCommonOptions(context, definition, builder);

		return builder.resolve();
	}

	public async resolveModulePackageCommandLine (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase): Promise<string> {
		const builder = this.createBuilder();

		this.resolveCommonOptions(context, definition, builder);

		builder.addFlag('--build-only');

		return builder.resolve();
	}
}

export const androidHelper = new AndroidHelper();
