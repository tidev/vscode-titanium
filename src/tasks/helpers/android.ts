import { TaskExecutionContext, TaskDefinitionBase } from '../tasksHelper';
import { TaskHelper } from './base';
import { CommandBuilder } from '../commandBuilder';
import { selectAndroidDevice, selectAndroidEmulator } from '../../quickpicks/common';

export interface AndroidBuildDefinition extends TaskDefinitionBase {
	keystore?: string;
	platform: 'android';
	target?	: 'device' | 'emulator';
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

		builder.addOption('--target', definition.target as string);
		builder.addOption('--device-id', deviceId);

		if (definition.debugPort) {
			builder.addOption('--debug-host', `/localhost:${definition.debugPort}`);
		}

		return builder.resolve();
	}

	public async resolveModuleBuildCommandLine (context: TaskExecutionContext, definition: TaskDefinitionBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		this.resolveCommonOptions(context, definition, builder);

		builder.addFlag('--build-only');

		return builder.resolve();
	}

}

export const androidHelper = new AndroidHelper();
