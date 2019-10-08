import * as path from 'path';
import project from '../project';

import { workspace } from 'vscode';
import { WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode, } from '../explorer/nodes';
import { getCorrectCertificateName, nameForPlatform, packageArguments, } from '../utils';
import { checkLogin, handleInteractionError, InteractionError } from './common';

import { enterAndroidKeystoreInfo, enterPassword, enterWindowsSigningInfo, inputBox, quickPick, selectDistributionTarget, selectiOSCodeSigning, selectPlatform } from '../quickpicks/common';
import { PackageOptions } from '../types/cli';
import { IosCertificateType, KeystoreInfo, WindowsCertInfo } from '../types/common';

export async function packageApplication (node: DeviceNode | OSVerNode | PlatformNode | TargetNode) {
	try {
		checkLogin();
		// TODO: Handle a build in progress
		const buildType = 'dist';
		const lastBuildState = ExtensionContainer.context.workspaceState.get<any>(WorkspaceState.LastPackageState);
		const logLevel = ExtensionContainer.config.general.logLevel;
		const projectDir = workspace.rootPath;

		let iOSCertificate;
		let iOSProvisioningProfile;
		let keystoreInfo: KeystoreInfo;
		let lastBuildDescription;
		let outputDirectory;
		let platform;
		let publisherID;
		let target;
		let windowsCertInfo: WindowsCertInfo;

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
				iOSCertificate = getCorrectCertificateName(lastBuildState.iOSCertificate, project.sdk()[0], IosCertificateType.distribution);
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
			const savedKeystorePath = ExtensionContainer.config.android.keystorePath;
			// TODO: Private key password?
			keystoreInfo = await enterAndroidKeystoreInfo(lastKeystore, savedKeystorePath);
			ExtensionContainer.context.workspaceState.update(WorkspaceState.LastKeystorePath, keystoreInfo.location);
		} else if (platform === 'ios' && !iOSCertificate) {
			const codesigning = await selectiOSCodeSigning(buildType, target, project.appId());
			iOSCertificate = getCorrectCertificateName(codesigning.certificate.label, project.sdk()[0], IosCertificateType.distribution);
			iOSProvisioningProfile = codesigning.provisioningProfile.uuid;
		} else if (platform === 'windows') {
			// TODO
			// publisher id, select pfx, pfx password
			publisherID = ExtensionContainer.config.windows.publisherID;
			if (!publisherID) {
				publisherID = await inputBox({ placeHolder: 'What is your Microsoft Publisher ID' });
			}
			const lastWindowsCertPath = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastWindowsCertPath);
			const savedWindowsCertPath = ExtensionContainer.config.windows.signingCertPath;
			windowsCertInfo = await enterWindowsSigningInfo(lastWindowsCertPath, savedWindowsCertPath);
			ExtensionContainer.context.workspaceState.update(WorkspaceState.LastWindowsCertPath, windowsCertInfo.location);
		}

		if (!outputDirectory) {
			const distDirectory = ExtensionContainer.config.package.distributionOutputDirectory;
			if (!path.isAbsolute(distDirectory)) {
				outputDirectory = path.join(workspace.rootPath, distDirectory);
			} else {
				outputDirectory = distDirectory;
			}
		}

		const buildInfo: PackageOptions = {
			platform,
			outputDirectory,
			keystoreInfo,
			target,
			iOSCertificate,
			iOSProvisioningProfile,
			logLevel,
			projectDir,
			windowsPublisherID: publisherID,
			windowsCertInfo
		};
		const args = packageArguments(buildInfo);
		ExtensionContainer.terminal.runCommand(args);
		buildInfo.keystoreInfo.password = null;
		buildInfo.keystoreInfo.privateKeyPassword = null;
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastPackageState, buildInfo);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
