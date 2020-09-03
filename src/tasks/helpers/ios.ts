import { TaskExecutionContext, runningTasks } from '../tasksHelper';
import { selectiOSCertificate, selectiOSProvisioningProfile } from '../../quickpicks/build/ios';
import { getCorrectCertificateName } from '../../utils';
import project from '../../project';
import { IosCertificateType, IosCert } from '../../types/common';
import { TaskHelper } from './base';
import { CommandBuilder } from '../commandBuilder';
import { BuildTaskDefinitionBase, AppBuildTaskTitaniumBuildBase, BuildTaskTitaniumBuildBase } from '../buildTaskProvider';
import { AppPackageTaskTitaniumBuildBase, PackageTaskDefinitionBase, PackageTaskTitaniumBuildBase } from '../packageTaskProvider';
import { WorkspaceState } from '../../constants';

import appc from '../../appc';

export interface IosTitaniumBuildDefinition extends BuildTaskDefinitionBase {
	titaniumBuild: IosBuildTaskTitaniumBuildBase;
}

export interface IosBuildTaskTitaniumBuildBase extends AppBuildTaskTitaniumBuildBase {
	ios: {
		certificate?: string;
		provisioningProfile?: string;
		simulatorVersion?: string;
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

		await this.resolveCommonAppOptions(context, definition, builder);

		if (definition.target === 'device') {
			const iosInfo = definition.ios || {};
			let certificate: IosCert|undefined;

			if (!iosInfo.certificate) {
				iosInfo.certificate = (await selectiOSCertificate('run')).id;
				certificate = appc.iOSCertificates().find(cert => cert.fullname === iosInfo.certificate);
			} else {
				certificate = appc.iOSCertificates().find(cert => cert.fullname === iosInfo.certificate);
			}

			if (!certificate) {
				throw new Error(`Unable to find certificate ${iosInfo.certificate}`);
			}

			iosInfo.certificate =  getCorrectCertificateName(certificate.fullname, project.sdk()[0], IosCertificateType.developer);

			if (!iosInfo.provisioningProfile) {
				iosInfo.provisioningProfile = (await selectiOSProvisioningProfile(certificate, 'run', project.appId())).uuid;
			}

			if (!iosInfo.provisioningProfile) {
				throw new Error(`Unable to find valid provisioning profile for ${iosInfo.certificate}`);
			}

			definition.ios = iosInfo;

			builder.addQuotedOption('--developer-name', iosInfo.certificate);
			builder.addOption('--pp-uuid', iosInfo.provisioningProfile);

		}

		this.storeLastState(WorkspaceState.LastBuildState, definition);
		runningTasks.set(context.label, { buildOptions: definition });

		return builder.resolve();
	}

	public async resolveAppPackageCommandLine(context: TaskExecutionContext, definition: IosPackageTaskTitaniumBuildBase): Promise<string> {
		const builder = CommandBuilder.create('appc', 'run');

		await this.resolveCommonPackagingOptions(context, definition, builder);

		const iosInfo = definition.ios || {};
		let certificate: IosCert|undefined;

		if (!iosInfo.certificate) {
			iosInfo.certificate = (await selectiOSCertificate('distribute')).id;
			certificate = appc.iOSCertificates(IosCertificateType.distribution).find(cert => cert.fullname === iosInfo.certificate);
		} else {
			certificate = appc.iOSCertificates(IosCertificateType.distribution).find(cert => cert.fullname === iosInfo.certificate);
		}

		if (!certificate) {
			throw new Error(`Unable to find certificate ${iosInfo.certificate}`);
		}

		iosInfo.certificate =  getCorrectCertificateName(certificate.fullname, project.sdk()[0], IosCertificateType.distribution);

		if (!iosInfo.provisioningProfile) {
			iosInfo.provisioningProfile = (await selectiOSProvisioningProfile(certificate, definition.target, project.appId())).id;
		}

		if (!iosInfo.provisioningProfile) {
			throw new Error(`Unable to find valid provisioning profile for ${iosInfo.certificate}`);
		}

		definition.ios = iosInfo;

		builder.addQuotedOption('--distribution-name', definition.ios.certificate);
		builder.addOption('--pp-uuid', definition.ios.provisioningProfile);

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

export const iOSHelper = new IosHelper();
