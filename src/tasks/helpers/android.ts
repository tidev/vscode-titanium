import { TaskExecutionContext } from '../tasksHelper';
import { TaskHelper } from './base';
import { CommandBuilder } from '../commandBuilder';
import { selectAndroidDevice, selectAndroidEmulator, selectAndroidKeystore, inputBox, enterPassword } from '../../quickpicks/common';
import { KeystoreInfo } from '../../types/common';
import * as fs from 'fs-extra';
import { AppBuildTaskTitaniumBuildBase, BuildTaskDefinitionBase, BuildTaskTitaniumBuildBase } from '../buildTaskProvider';
import { AppPackageTaskTitaniumBuildBase, PackageTaskDefinitionBase, PackageTaskTitaniumBuildBase } from '../packageTaskProvider';
import { WorkspaceState } from '../../constants';

export interface AndroidBuildTaskDefinition extends BuildTaskDefinitionBase {
	titaniumBuild: AndroidBuildTaskTitaniumBuildBase;
}

export interface AndroidBuildTaskTitaniumBuildBase extends AppBuildTaskTitaniumBuildBase {
	platform: 'android';
	target: 'device' | 'emulator';
	debugPort?: number;
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

async function verifyKeystorePath (keystorePath: string|undefined): Promise<string> {
	if (!keystorePath) {
		throw new Error('Expected a value for keystorePath');
	}

	if (!await fs.pathExists(keystorePath)) {
		throw new Error(`Provided keystorePath value "${keystorePath}" does not exist`);
	}

	return keystorePath;
}

export class AndroidHelper extends TaskHelper {

	public async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: AndroidBuildTaskTitaniumBuildBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		this.resolveCommonAppOptions(context, definition, builder);

		if (!definition.deviceId) {
			if (definition.target === 'device') {
				const deviceInfo = await selectAndroidDevice();
				definition.deviceId = deviceInfo.udid;
			} else if (definition.target === 'emulator') {
				const emulatorInfo = await selectAndroidEmulator();
				definition.deviceId = emulatorInfo.udid;
			} else {
				throw new Error(`Invalid build target ${definition.target}`);
			}
		}

		builder.addOption('--device-id', definition.deviceId);

		if (definition.debugPort) {
			builder.addOption('--debug-host', `/localhost:${definition.debugPort}`);
		}

		this.storeLastState(WorkspaceState.LastBuildState, definition);

		return builder.resolve();
	}

	public async resolveAppPackageCommandLine(context: TaskExecutionContext, definition: AndroidPackageTaskTitaniumBuildBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		await this.resolveCommonPackagingOptions(context, definition, builder);

		const androidInfo = definition.android || {
			keystore: {

			}
		};

		if (!androidInfo.keystore.location) {
			androidInfo.keystore.location = await verifyKeystorePath(await selectAndroidKeystore());
		} else {
			await verifyKeystorePath(androidInfo.keystore.location);
		}

		if (!androidInfo.keystore.alias) {
			androidInfo.keystore.alias = await inputBox({ placeHolder: 'Enter your Keystore alias' });
		}

		builder
			.addQuotedOption('--keystore', androidInfo.keystore.location)
			.addOption('--alias', androidInfo.keystore.alias)
			.addQuotedOption('--store-password', await enterPassword({  placeHolder: 'Enter your Keystore password' }));

		definition.android = androidInfo;

		this.storeLastState(WorkspaceState.LastPackageState, definition);

		return builder.resolve();
	}

	public async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskTitaniumBuildBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		this.resolveCommonOptions(context, definition, builder);

		return builder.resolve();
	}

	public async resolveModulePackageCommandLine (context: TaskExecutionContext, definition: PackageTaskTitaniumBuildBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		this.resolveCommonOptions(context, definition, builder);

		builder.addFlag('--build-only');

		return builder.resolve();
	}
}

export const androidHelper = new AndroidHelper();
