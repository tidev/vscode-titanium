import { TaskExecutionContext } from '../tasksHelper';
import { selectiOSCertificate, selectiOSProvisioningProfile } from '../../quickpicks/build/ios';
import { IosCert } from '../../types/common';
import { TaskHelper } from './base';
import { Command } from '../commandBuilder';
import { BuildTaskDefinitionBase, AppBuildTaskTitaniumBuildBase, ModuleBuildTaskTitaniumBuildBase } from '../buildTaskProvider';
import { AppPackageTaskTitaniumBuildBase, PackageTaskDefinitionBase, PackageTaskTitaniumBuildBase } from '../packageTaskProvider';
import { WorkspaceState } from '../../constants';

import { ExtensionContainer } from '../../container';

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

	public async resolveAppBuildCommandLine (context: TaskExecutionContext, definition: IosBuildTaskTitaniumBuildBase): Promise<Command> {
		const builder = this.createBuilder();
		const project = this.getProject(definition.projectDir);

		await this.resolveCommonAppOptions(context, definition, builder);

		if (definition.target === 'device') {
			const iosInfo = definition.ios || {};
			let certificate: IosCert|undefined;

			if (!iosInfo.certificate) {
				certificate = await selectiOSCertificate('run');
			} else {
				certificate = ExtensionContainer.environment.iOSCertificates('developer').find(cert => cert.fullname === iosInfo.certificate);
			}

			if (!certificate) {
				throw new Error(`Unable to find certificate ${iosInfo.certificate}`);
			}

			iosInfo.certificate = certificate.fullname;

			if (!iosInfo.provisioningProfile) {
				iosInfo.provisioningProfile = (await selectiOSProvisioningProfile(certificate, definition.target, project.appId())).uuid;
			}

			if (!iosInfo.provisioningProfile) {
				throw new Error(`Unable to find valid provisioning profile for ${iosInfo.certificate}`);
			}

			definition.ios = iosInfo;

			builder.addQuotedOption('--developer-name', iosInfo.certificate);
			builder.addOption('--pp-uuid', iosInfo.provisioningProfile);

		}

		this.storeLastState(WorkspaceState.LastBuildState, definition);
		ExtensionContainer.runningTasks.set(context.label, { buildOptions: definition });

		return builder.resolve();
	}

	public async resolveAppPackageCommandLine(context: TaskExecutionContext, definition: IosPackageTaskTitaniumBuildBase): Promise<Command> {
		const builder = this.createBuilder();
		const project = this.getProject(definition.projectDir);

		await this.resolveCommonPackagingOptions(context, definition, builder);

		const iosInfo = definition.ios || {};
		let certificate: IosCert|undefined;

		if (!iosInfo.certificate) {
			certificate = await selectiOSCertificate('distribute');
		} else {
			certificate = ExtensionContainer.environment.iOSCertificates('distribution').find(cert => cert.fullname === iosInfo.certificate);
		}

		if (!certificate) {
			throw new Error(`Unable to find certificate ${iosInfo.certificate}`);
		}

		iosInfo.certificate = certificate.fullname;

		if (!iosInfo.provisioningProfile) {
			iosInfo.provisioningProfile = (await selectiOSProvisioningProfile(certificate, definition.target, project.appId())).uuid;
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

export const iOSHelper = new IosHelper();
