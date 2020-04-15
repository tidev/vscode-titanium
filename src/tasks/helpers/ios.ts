import { TaskExecutionContext } from '../tasksHelper';
import { selectiOSDevice, selectiOSSimulator, selectiOSCodeSigning } from '../../quickpicks';
import { getCorrectCertificateName } from '../../utils';
import project from '../../project';
import { IosCertificateType } from '../../types/common';
import { TaskHelper } from './base';
import { CommandBuilder } from '../commandBuilder';
import { BuildTaskDefinitionBase, AppBuildTaskTitaniumBuildBase, BuildTaskTitaniumBuildBase } from '../buildTaskProvider';
import { AppPackageTaskTitaniumBuildBase, PackageTaskDefinitionBase, PackageTaskTitaniumBuildBase } from '../packageTaskProvider';

export interface IosTitaniumBuildDefinition extends BuildTaskDefinitionBase {
	titaniumBuild: IosBuildTaskTitaniumBuildBase;
}

export interface IosBuildTaskTitaniumBuildBase extends AppBuildTaskTitaniumBuildBase {
	ios: {
		certificate?: string;
		provisioningProfile?: string;
	};
	target?: 'device' | 'simulator';
	platform: 'ios';
}

export interface IosTitaniumPackageDefinition extends PackageTaskDefinitionBase {
	titaniumBuild: IosPackageTaskTitaniumBuildBase;
}

export interface IosPackageTaskTitaniumBuildBase extends AppPackageTaskTitaniumBuildBase {
	ios: {
		certificate: string;
		provisioningProfile: string;
	};
	target: 'dist-adhoc' | 'dist-appstore';
	platform: 'ios';
}
export class IosHelper extends TaskHelper {

	public async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: IosBuildTaskTitaniumBuildBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		this.resolveCommonAppOptions(context, definition, builder);

		let deviceId: string|undefined = definition.deviceId;
		if (!deviceId) {
			if (definition.target === 'device') {
				const deviceInfo = await selectiOSDevice();
				deviceId = deviceInfo.udid;
			} else if (definition.target === 'simulator') {
				const simulatorInfo = await selectiOSSimulator();
				deviceId = simulatorInfo.udid;
			} else {
				throw new Error(`Invalid build target ${definition.target}`);
			}
		}

		builder.addOption('--device-id', deviceId);

		if (definition.target === 'device') {
			const iosInfo = definition.ios || {};

			const codeSigning = await selectiOSCodeSigning('run', definition.target, project.appId()!);
			iosInfo.certificate =  getCorrectCertificateName(codeSigning.certificate.label, project.sdk()[0], IosCertificateType.developer);
			iosInfo.provisioningProfile = codeSigning.provisioningProfile.uuid;

			definition.ios = iosInfo;

			builder.addQuotedOption('--developer-name', iosInfo.certificate);
			builder.addOption('--pp-uuid', iosInfo.provisioningProfile);

			builder.addQuotedOption('--developer-name', definition.ios.certificate);
			builder.addOption('--pp-uuid', definition.ios.provisioningProfile);
		}

		return builder.resolve();
	}

	public async resolveAppPackageCommandLine(context: TaskExecutionContext, definition: IosPackageTaskTitaniumBuildBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		await this.resolveCommonPackagingOptions(context, definition, builder);

		const iosInfo = definition.ios || {};

		const codeSigning = await selectiOSCodeSigning('dist', definition.target, project.appId()!);
		iosInfo.certificate =  getCorrectCertificateName(codeSigning.certificate.label, project.sdk()[0], IosCertificateType.distribution);
		iosInfo.provisioningProfile = codeSigning.provisioningProfile.uuid;

		definition.ios = iosInfo;

		builder.addQuotedOption('--distribution-name', definition.ios.certificate);
		builder.addOption('--pp-uuid', definition.ios.provisioningProfile);

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

export const iOSHelper = new IosHelper();
