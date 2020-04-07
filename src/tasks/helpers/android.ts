import { TaskExecutionContext, BuildTaskDefinitionBase, AppBuildTaskDefinitionBase, AppPackageTaskDefinitionBase, PackageTaskDefinitionBase } from '../tasksHelper';
import { TaskHelper } from './base';
import { CommandBuilder } from '../commandBuilder';
import { selectAndroidDevice, selectAndroidEmulator, selectAndroidKeystore, inputBox, enterPassword } from '../../quickpicks/common';
import { KeystoreInfo } from '../../types/common';
import * as fs from 'fs-extra';

export interface AndroidBuildDefinition extends AppBuildTaskDefinitionBase {
	keystore?: string;
	platform: 'android';
	target?	: 'device' | 'emulator';
}

export interface AndroidAppPackageDefinition extends AppPackageTaskDefinitionBase {
	keystore: KeystoreInfo;
}

async function verifyKeystorePath (keystorePath: string|undefined): Promise<string> {
	if (!keystorePath) {
		throw new Error('Expected a value for keystorePath');
	}

	if (!await fs.pathExists(keystorePath)) {
		throw new Error(`Provided keystorePath value "${keystorePath} does not exist`);
	}

	return keystorePath;
}

export class AndroidHelper extends TaskHelper {

	public async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: AndroidBuildDefinition): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		this.resolveCommonAppOptions(context, definition, builder);

		let deviceId: string|undefined = definition.deviceId;
		if (!deviceId) {
			if (definition.target === 'device') {
				const deviceInfo = await selectAndroidDevice();
				deviceId = deviceInfo.udid;
			} else if (definition.target === 'emulator') {
				const emulatorInfo = await selectAndroidEmulator();
				deviceId = emulatorInfo.udid;
			} else {
				throw new Error(`Invalid build target ${definition.target}`);
			}
		}

		builder.addOption('--device-id', deviceId);

		if (definition.debugPort) {
			builder.addOption('--debug-host', `/localhost:${definition.debugPort}`);
		}

		return builder.resolve();
	}

	public async resolveAppPackageCommandLine(context: TaskExecutionContext, definition: AndroidAppPackageDefinition): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		await this.resolveCommonPackagingOptions(context, definition, builder);

		const keystore = definition.titaniumBuild.android.keystore || {};

		if (!keystore.location) {
			keystore.location = await verifyKeystorePath(await selectAndroidKeystore());
		} else {
			await verifyKeystorePath(keystore.location);
		}

		if (!keystore.alias) {
			keystore.alias = await inputBox({ placeHolder: 'Enter your Keystore alias' });
		}

		builder
			.addQuotedOption('--keystore', keystore.location)
			.addOption('--alias', keystore.alias)
			.addQuotedOption('--store-password', await enterPassword({  placeHolder: 'Enter your Keystore password' }));

		return builder.resolve();
	}

	public async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: BuildTaskDefinitionBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		this.resolveCommonOptions(context, definition, builder);

		return builder.resolve();
	}

	public async resolveModulePackageCommandLine (context: TaskExecutionContext, definition: PackageTaskDefinitionBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		this.resolveCommonOptions(context, definition, builder);

		builder.addFlag('--build-only');

		return builder.resolve();
	}
}

export const androidHelper = new AndroidHelper();
