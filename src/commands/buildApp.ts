import project from '../project';

import { GlobalState, WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode, } from '../explorer/nodes';
import { buildArguments, nameForPlatform, nameForTarget, } from '../utils';
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

export async function buildApplication (node: DeviceNode | OSVerNode | PlatformNode | TargetNode) {
	try {
		checkLogin();
		// TODO: Handle a build in progress
		const buildType = 'run';
		const liveview = ExtensionContainer.context.globalState.get<boolean>(GlobalState.Liveview);
		const lastBuildState = ExtensionContainer.context.workspaceState.get<any>(WorkspaceState.LastBuildState);

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
			osVersion = node.osVersion;
			platform = node.platform;
			target = node.targetId;
		}

		if (lastBuildState) {
			try {
				lastBuildDescription = `${nameForPlatform(lastBuildState.platform)} ${nameForTarget(lastBuildState.target)} ${lastBuildState.deviceLabel}`;
			} catch (error) {
				// Squash in case we had an incompatible build state
			}
		}

		if (!platform) {
			const platformInfo = await selectPlatform(lastBuildDescription);
			if (platformInfo.id === 'last') {
				deviceId = lastBuildState.deviceId;
				deviceLabel = lastBuildState.deviceLabel;
				iOSCertificate = lastBuildState.iOSCertificate;
				osVersion = lastBuildState.osVersion;
				platform = lastBuildState.platform;
				iOSProvisioningProfile = lastBuildState.iOSProvisioningProfile;
				target = lastBuildState.target;
			} else {
				platform = platformInfo.id;

			}
		}

		if (!target) {
			const targetInfo = await selectBuildTarget(platform);
			target = targetInfo.id;
		}

		if (!deviceId && target !== 'ws-local') {
			if (platform === 'android') {
				if (target === 'device') {
					const deviceInfo = await selectAndroidDevice();
					deviceId = deviceInfo.udid;
					deviceLabel = deviceId.label;
				} else if (target === 'emulator') {
					const emulatorInfo = await selectAndroidEmulator();
					deviceId = emulatorInfo.udid;
					deviceLabel = emulatorInfo.label;
				}
			} else if (platform === 'ios') {
				if (target === 'device') {
					const deviceInfo = await selectiOSDevice();
					deviceId = deviceInfo.udid;
					deviceLabel = deviceId.label;
				} else if (target === 'simulator') {
					const simulatorInfo = await selectiOSSimulator(osVersion);
					deviceId = simulatorInfo.udid;
					osVersion = simulatorInfo.version;
					deviceLabel = simulatorInfo.label;
				}
			} else if (platform === 'windows') {
				// TODO finish wiring these up
				if (target === 'wp-device') {
					const deviceInfo = await selectWindowsDevice();
				} else if (target === 'wp-emulator') {
					const emulatorInfo = await selectWindowsEmulator();
				}
			}
		}

		if (!iOSCertificate || iOSProvisioningProfile) {
			const codeSigning = await selectiOSCodeSigning(buildType, target, project.appId());
			iOSCertificate = codeSigning.certificate.label;
			iOSProvisioningProfile = codeSigning.provisioningProfile.uuid;
		}

		const buildInfo = {
			buildType,
			deviceId,
			deviceLabel,
			liveview,
			platform,
			target,
			iOSCertificate,
			iOSProvisioningProfile,
		};
		const args = buildArguments(buildInfo, 'app');
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastBuildState, buildInfo);
		ExtensionContainer.terminal.runCommand(args);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
