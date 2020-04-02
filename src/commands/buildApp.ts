import project from '../project';

import { workspace } from 'vscode';
import { WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode } from '../explorer/nodes';
import { buildArguments, getCorrectCertificateName, nameForPlatform, nameForTarget } from '../utils';
import { checkLogin, handleInteractionError, InteractionError } from './common';

import {
	selectAndroidDevice,
	selectAndroidEmulator,
	selectBuildTarget,
	selectiOSCodeSigning,
	selectiOSDevice,
	selectiOSSimulator,
	selectPlatform,
	selectWindowsDevice,
	selectWindowsEmulator
} from '../quickpicks/common';
import { BuildAndroidAppOptions, BuildAppBase, BuildAppOptions, BuildWindowsAppOptions, BuildIosAppOptions } from '../types/cli';
import { IosCertificateType, Platform } from '../types/common';

function runBuild (options: BuildAppOptions): void {
	const args = buildArguments(options);
	ExtensionContainer.context.workspaceState.update(WorkspaceState.LastBuildState, options);
	ExtensionContainer.terminal.runCommand(args);
}

export async function buildApplication (node: DeviceNode | OSVerNode | PlatformNode | TargetNode): Promise<void> {
	try {
		checkLogin();
		// TODO: Handle a build in progress
		const buildType = 'run';
		const liveview = ExtensionContainer.config.build.liveview;
		const lastBuildState = ExtensionContainer.context.workspaceState.get<BuildAppOptions>(WorkspaceState.LastBuildState); // TODO type this
		const logLevel = ExtensionContainer.config.general.logLevel;
		const projectDir = workspace.rootPath!;

		let deviceId;
		let deviceLabel;
		let iOSCertificate;
		let lastBuildDescription;
		let osVersion;
		let platform;
		let iOSProvisioningProfile;
		let target;

		if (node) {
			deviceId = node.deviceId;
			deviceLabel = node.label;
			osVersion = node?.version;
			platform = node.platform;
			target = node.targetId;
		}

		if (lastBuildState) {
			try {
				lastBuildDescription = `${nameForPlatform(lastBuildState.platform)} ${nameForTarget(lastBuildState.target!)} ${lastBuildState.deviceLabel}`;
			} catch (error) {
				// Squash in case we had an incompatible build state
			}
		}

		if (!platform) {
			const platformInfo = await selectPlatform(lastBuildDescription);
			if (lastBuildState && platformInfo.id === 'last') {
				deviceId = lastBuildState.deviceId;
				deviceLabel = lastBuildState.deviceLabel;
				platform = lastBuildState.platform as Platform;
				target = lastBuildState.target;
				if (platform === Platform.ios) {
					osVersion = (lastBuildState as BuildIosAppOptions & { osVersion: string }).osVersion;
					if (target === 'device') {
						iOSCertificate = getCorrectCertificateName((lastBuildState as BuildIosAppOptions).iOSCertificate!, project.sdk()[0], IosCertificateType.developer);
						iOSProvisioningProfile = (lastBuildState as BuildIosAppOptions).iOSProvisioningProfile;
					}
				}

			} else {
				platform = platformInfo.id as Platform;
			}
		}

		if (!target) {
			const targetInfo = await selectBuildTarget(platform);
			target = targetInfo.id;
		}

		const baseOptions: BuildAppBase = {
			platform,
			buildOnly: false,
			buildType,
			projectDir,
			logLevel,
			projectType: 'app',
			liveview,
			target
		};

		if (platform === Platform.android) {
			if (!deviceId) {
				if (target === 'device') {
					const deviceInfo = await selectAndroidDevice();
					deviceId = deviceInfo.udid;
					deviceLabel = deviceInfo.label;
				} else if (target === 'emulator') {
					const emulatorInfo = await selectAndroidEmulator();
					deviceId = emulatorInfo.udid;
					deviceLabel = emulatorInfo.label;
				}
			}

			const androidOptions: BuildAndroidAppOptions = {
				...baseOptions,
				deviceId,
				deviceLabel
			};
			return runBuild(androidOptions);
		} else if (platform === Platform.ios) {
			if (!deviceId) {
				if (target === 'device') {
					const deviceInfo = await selectiOSDevice();
					deviceId = deviceInfo.udid;
					deviceLabel = deviceInfo.label;
				} else if (target === 'simulator') {
					const simulatorInfo = await selectiOSSimulator(osVersion);
					deviceId = simulatorInfo.udid;
					osVersion = simulatorInfo.version;
					deviceLabel = simulatorInfo.label;
				}
			}

			if (platform === Platform.ios && target === 'device' && (!iOSCertificate || !iOSProvisioningProfile)) {
				const codeSigning = await selectiOSCodeSigning(buildType, target, project.appId()!);
				iOSCertificate =  getCorrectCertificateName(codeSigning.certificate.label, project.sdk()[0], IosCertificateType.developer);
				iOSProvisioningProfile = codeSigning.provisioningProfile.uuid;
			}

			const iosOptions: BuildIosAppOptions = {
				...baseOptions,
				deviceId,
				deviceLabel,
				iOSCertificate,
				iOSProvisioningProfile
			};

			return runBuild(iosOptions);
		} else if (platform === Platform.windows) {
			if (!deviceId) {
				if (target === 'wp-device') {
					const deviceInfo = await selectWindowsDevice();
					deviceId = deviceInfo.udid;
					deviceLabel = deviceInfo.label;
				} else if (target === 'wp-emulator') {
					const emulatorInfo = await selectWindowsEmulator();
					deviceId = emulatorInfo.udid;
					deviceLabel = emulatorInfo.label;
				}
			}

			const windowsOptions: BuildWindowsAppOptions = {
				...baseOptions
			};

			return runBuild(windowsOptions);
		}

	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
