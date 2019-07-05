import * as vscode from 'vscode';
import { UserCancellation } from '../commands';
import { ExtensionContainer } from '../container';
import project from '../project';
import { selectBuildTarget, selectDevice, selectiOSCertificate, selectiOSProvisioningProfile, selectPlatform } from '../quickpicks/common';

export class TitaniumDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

	public async resolveDebugConfiguration (folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
		if (!config.projectDir) {
			config.projectDir = '${workspaceRoot}';
		}

		if (!config.port) {
			config.port = 9000;
			config.debugPort = 900;
		}

		if (!config.logLevel) {
			config.logLevel = ExtensionContainer.config.general.logLevel;

		}

		if (!config.platform) {
			try {
				config.platform = (await selectPlatform()).id;
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no platform was selected';
				}
				throw new Error(message);
			}
		}

		if (config.platform === 'android' && config.request === 'attach') {
			throw new Error('Attaching to a running Android app is currently not supported');
		}

		if (!config.target) {
			try {
				config.target = (await selectBuildTarget(config.platform)).id;
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no target was selected';
				}
				throw new Error(message);
			}
		}

		if (!config.deviceId) {
			try {
				config.deviceId = (await selectDevice(config.platform, config.target)).udid;
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no device was selected';
				}
				throw new Error(message);
			}
		}

		if (config.platform === 'ios' && config.target === 'device' && config.request !== 'attach') {
			if (!config.iOSCertificate) {
				try {
					const certificate = await selectiOSCertificate('run');
					const provisioning = await selectiOSProvisioningProfile(certificate, config.target, project.appId());

					config.iOSCertificate = certificate.label;
					config.iOSProvisioningProfile = provisioning.uuid;
				} catch (error) {
					let message = error.message;
					if (error instanceof UserCancellation) {
						message = 'Failed to start debug session as no code signing information was selected';
					}
					throw new Error(message);
				}
			}
		}

		return config;
	}
}
