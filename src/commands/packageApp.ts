import * as path from 'path';
import project from '../project';

import { workspace } from 'vscode';
import { WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode, } from '../explorer/nodes';
import { nameForPlatform, packageArguments, } from '../utils';
import { checkLogin, handleInteractionError, InteractionError } from './common';

import { enterAndroidKeystoreInfo, enterPassword, selectDistributionTarget, selectiOSCodeSigning, selectPlatform } from '../quickpicks/common';

export async function packageApplication (node: DeviceNode | OSVerNode | PlatformNode | TargetNode) {
	try {
		checkLogin();
		// TODO: Handle a build in progress
		const buildType = 'dist';
		const lastBuildState = ExtensionContainer.context.workspaceState.get<any>(WorkspaceState.LastPackageState);

		let iOSCertificate;
		let lastBuildDescription;
		let outputDirectory;
		let keystoreInfo;
		let platform;
		let iOSProvisioningProfile;
		let target;

		if (node) {
			platform = node.platform;
			target = node.targetId;
		}

		if (lastBuildState) {
			try {
				lastBuildDescription = `${nameForPlatform(lastBuildState.platform)}`;
			} catch (error) {
				// Squash in case we had an incompatible build state
			}
		}

		if (!platform) {
			const platformInfo = await selectPlatform(lastBuildDescription);
			if (platformInfo.id === 'last') {
				platform = lastBuildState.platform;
				target = lastBuildState.target;
				iOSCertificate = lastBuildState.iOSCertificate;
				iOSProvisioningProfile = lastBuildState.iOSProvisioningProfile;
				keystoreInfo = lastBuildState.keystoreInfo;
				if (platform === 'android') {
					keystoreInfo.password = await enterPassword({ placeHolder: 'Enter your keystore password' });
				}
				outputDirectory = lastBuildState.outputDirectory;
			} else {
				platform = platformInfo.id;

			}
		}

		if (!target) {
			const targetInfo = await selectDistributionTarget(platform);
			target = targetInfo.id;
		}

		if (platform === 'android' && !keystoreInfo) {
			const lastKeystore = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastKeystorePath);
			// TODO: Private key password?
			keystoreInfo = await enterAndroidKeystoreInfo(lastKeystore);
			ExtensionContainer.context.workspaceState.update(WorkspaceState.LastKeystorePath, keystoreInfo.location);
		} else if (platform === 'ios' && !iOSCertificate) {
			const codesigning = await selectiOSCodeSigning(buildType, target, project.appId());
			iOSCertificate = codesigning.certificate.label;
			iOSProvisioningProfile = codesigning.provisioningProfile.uuid;
		} else if (platform === 'windows') {
			// TODO
		}

		if (!outputDirectory) {
			const distDirectory = workspace.getConfiguration('titanium.package').get<string>('distributionOutputDirectory');
			if (!path.isAbsolute(distDirectory)) {
				outputDirectory = path.join(workspace.rootPath, distDirectory);
			} else {
				outputDirectory = distDirectory;
			}
		}

		const buildInfo = {
			buildType,
			platform,
			outputDirectory,
			keystoreInfo,
			target,
			iOSCertificate,
			iOSProvisioningProfile
		};
		const storableInfo = Object.assign({}, buildInfo, { keystoreInfo: { password: null }});
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastPackageState, storableInfo);
		const args = packageArguments(buildInfo);
		ExtensionContainer.terminal.runCommand(args);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
