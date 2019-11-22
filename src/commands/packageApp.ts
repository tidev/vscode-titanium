import * as path from 'path';
import project from '../project';

import { workspace } from 'vscode';
import { WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode, } from '../explorer/nodes';
import { getCorrectCertificateName, nameForPlatform, packageArguments, } from '../utils';
import { checkLogin, handleInteractionError, InteractionError } from './common';

import { enterAndroidKeystoreInfo, enterPassword, enterWindowsSigningInfo, inputBox, selectDistributionTarget, selectiOSCodeSigning, selectPlatform } from '../quickpicks/common';
import { AndroidPackageOptions, BasePackageOptions, IosPackageOptions, PackageAppOptions, WindowsPackageOptions } from '../types/cli';
import { IosCertificateType, KeystoreInfo, Platform, WindowsCertInfo } from '../types/common';

export async function packageApplication (node: DeviceNode | OSVerNode | PlatformNode | TargetNode) {
	try {
		checkLogin();
		// TODO: Handle a build in progress
		const buildType = 'dist';
		const lastBuildState = ExtensionContainer.context.workspaceState.get<any>(WorkspaceState.LastPackageState);
		const logLevel = ExtensionContainer.config.general.logLevel;
		const projectDir = workspace.rootPath!;

		let iOSCertificate: string|undefined;
		let iOSProvisioningProfile: string|undefined;
		let keystoreInfo: KeystoreInfo|undefined;
		let lastBuildDescription;
		let outputDirectory: string|undefined;
		let platform;
		let target: string|undefined = node?.targetId;
		let windowsCertInfo: WindowsCertInfo|undefined;

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
				iOSCertificate = getCorrectCertificateName(lastBuildState.iOSCertificate, project.sdk()[0], IosCertificateType.distribution)!;
				iOSProvisioningProfile = lastBuildState.iOSProvisioningProfile;
				keystoreInfo = lastBuildState.keystoreInfo as KeystoreInfo;
				if (platform === Platform.android) {
					keystoreInfo.password = await enterPassword({ placeHolder: 'Enter your keystore password' });
				}
				outputDirectory = lastBuildState.outputDirectory;
			} else {
				platform = platformInfo.id as Platform;
			}
		}

		if (!target) {
			const targetInfo = await selectDistributionTarget(platform);
			target = targetInfo.id;
		}

		if (!outputDirectory) {
			const distDirectory = ExtensionContainer.config.package.distributionOutputDirectory;
			if (!path.isAbsolute(distDirectory)) {
				outputDirectory = path.join(workspace.rootPath!, distDirectory);
			} else {
				outputDirectory = distDirectory;
			}
		}

		const baseOptions: BasePackageOptions = {
			platform,
			outputDirectory,
			projectDir,
			target,
			logLevel
		};

		if (platform === Platform.android) {
			if (!keystoreInfo) {
				const lastKeystore = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastKeystorePath);
				const savedKeystorePath = ExtensionContainer.config.android.keystorePath;
				// TODO: Private key password?
				keystoreInfo = await enterAndroidKeystoreInfo(lastKeystore, savedKeystorePath);
				ExtensionContainer.context.workspaceState.update(WorkspaceState.LastKeystorePath, keystoreInfo.location);
			}

			const buildInfo: AndroidPackageOptions = {
				...baseOptions,
				keystoreInfo
			};
			return runPackage(buildInfo);

		} else if (platform === Platform.ios) {
			const codesigning = await selectiOSCodeSigning(buildType, target, project.appId()!);
			iOSCertificate = getCorrectCertificateName(codesigning.certificate.label, project.sdk()[0], IosCertificateType.distribution);
			iOSProvisioningProfile = codesigning.provisioningProfile.id;

			const buildInfo: IosPackageOptions = {
				...baseOptions,
				iOSCertificate,
				iOSProvisioningProfile
			};
			return runPackage(buildInfo);

		} else if (platform === Platform.windows) {
			// publisher id, select pfx, pfx password
			let windowsPublisherID = ExtensionContainer.config.windows.publisherID;
			if (!windowsPublisherID) {
				windowsPublisherID = await inputBox({ placeHolder: 'What is your Microsoft Publisher ID' });
			}
			const lastWindowsCertPath = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastWindowsCertPath);
			const savedWindowsCertPath = ExtensionContainer.config.windows.signingCertPath;
			windowsCertInfo = await enterWindowsSigningInfo(lastWindowsCertPath, savedWindowsCertPath);
			ExtensionContainer.context.workspaceState.update(WorkspaceState.LastWindowsCertPath, windowsCertInfo.location);

			const buildInfo: WindowsPackageOptions = {
				...baseOptions,
				windowsCertInfo,
				windowsPublisherID
			};
			return runPackage(buildInfo);

		}
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}

function runPackage (options: PackageAppOptions) {
	const args = packageArguments(options);
	ExtensionContainer.terminal.runCommand(args);
	if (options.platform === Platform.android) {
		delete (options as AndroidPackageOptions).keystoreInfo.password;
		delete (options as AndroidPackageOptions).keystoreInfo.privateKeyPassword;
	}
	ExtensionContainer.context.workspaceState.update(WorkspaceState.LastPackageState, options);
}
