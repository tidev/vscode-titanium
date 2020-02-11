import * as getPort from 'get-port';
import * as vscode from 'vscode';
import * as which from 'which';
import { UserCancellation } from '../commands';
import { WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import project from '../project';
import { quickPick, selectDevice, selectiOSCertificate, selectiOSProvisioningProfile, selectPlatform } from '../quickpicks/common';
import { getCorrectCertificateName, nameForTarget, targetsForPlatform } from '../utils';
import { IosCertificateType } from '../types/common';

export class TitaniumDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

	public async resolveDebugConfiguration (folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
		if (!config.projectDir) {
			config.projectDir = '${workspaceFolder}'; // eslint-disable-line no-template-curly-in-string
		}
		const ourConfig: vscode.DebugConfiguration = {
			...config
		};

		if (!ourConfig.port) {
			ourConfig.port = 9000;
		} else {
			config.debugPort = config.port;
		}

		try {
			const port = await getPort({ port: ourConfig.port });
			if (port !== ourConfig.port) {
				ourConfig.port = port;
			}
		} catch (error) {
			throw new Error('Failed to start debug session as could not find a free port. Please set a "port" value in your debug configuration.');
		}

		if (!ourConfig.logLevel) {
			ourConfig.logLevel = ExtensionContainer.config.general.logLevel;

		}

		if (!ourConfig.platform) {
			try {
				ourConfig.platform = (await selectPlatform()).id;
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no platform was selected';
				}
				throw new Error(message);
			}
		}

		if (ourConfig.platform === 'android' && ourConfig.request === 'attach') {
			throw new Error('Attaching to a running Android app is currently not supported');
		}

		if (ourConfig.platform === 'ios') {
			try {
				await which('ios_webkit_debug_proxy');
			} catch (error) {
				vscode.window.showErrorMessage('Unable to find ios-webkit-debug-proxy. Please ensure it is installed', {
					title: 'Open docs'
				}).then(action => {
					if (action) {
						vscode.env.openExternal(vscode.Uri.parse('https://github.com/appcelerator/vscode-appcelerator-titanium/blob/master/doc/debugging.md'));
					}
					return;
				});
				throw new Error('Unable to start debugger as ios_webkit_debug_proxy is not installed.');
			}
		}

		if (!ourConfig.target) {
			try {
				let lastDebugState;
				if (ourConfig.platform === 'android') {
					lastDebugState = ExtensionContainer.context.workspaceState.get<vscode.DebugConfiguration>(WorkspaceState.LastAndroidDebug);
				} else if (ourConfig.platform === 'ios') {
					lastDebugState = ExtensionContainer.context.workspaceState.get<vscode.DebugConfiguration>(WorkspaceState.LastiOSDebug);
				}

				const targets = targetsForPlatform(ourConfig.platform)
					.filter(target => !/^dist/.test(target))
					.map(target => ({ label: nameForTarget(target), id: target }));

				if (lastDebugState) {
					try {
						targets.push({
							label: `Last debug session (${lastDebugState.target} - ${lastDebugState.deviceName})`,
							id: 'last'
						});
					} catch (error) {
						// squelch error as it might be due to bad last state
						lastDebugState = undefined;
					}
				}
				const targetInfo = await quickPick(targets);
				if (lastDebugState && targetInfo.id === 'last') {
					ourConfig.target = lastDebugState.target;
					ourConfig.deviceId = lastDebugState.deviceId;
					ourConfig.deviceName = lastDebugState.deviceName;
					ourConfig.iOSCertificate = lastDebugState.iOSCertificate;
					ourConfig.iOSProvisioningProfile = lastDebugState.iOSProvisioningProfile;
				} else {
					ourConfig.target = targetInfo.id;
				}
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no target was selected';
				}
				throw new Error(message);
			}
		}

		if (!ourConfig.deviceId) {
			try {
				const deviceInfo = await selectDevice(ourConfig.platform, ourConfig.target);
				ourConfig.deviceId = deviceInfo.udid;
				ourConfig.deviceName = deviceInfo.label;
			} catch (error) {
				let message = error.message;
				if (error instanceof UserCancellation) {
					message = 'Failed to start debug session as no device was selected';
				}
				throw new Error(message);
			}
		}

		if (ourConfig.platform === 'ios' && ourConfig.target === 'device' && ourConfig.request !== 'attach') {
			if (!ourConfig.iOSCertificate) {
				try {
					const certificate = await selectiOSCertificate('run');
					const provisioning = await selectiOSProvisioningProfile(certificate, ourConfig.target, project.appId()!);

					ourConfig.iOSCertificate = getCorrectCertificateName(certificate.label, project.sdk()[0], IosCertificateType.developer);
					ourConfig.iOSProvisioningProfile = provisioning.uuid;
				} catch (error) {
					let message = error.message;
					if (error instanceof UserCancellation) {
						message = 'Failed to start debug session as no code signing information was selected';
					}
					throw new Error(message);
				}
			}
		}

		if (ourConfig.platform === 'android') {
			ExtensionContainer.context.workspaceState.update(WorkspaceState.LastAndroidDebug, ourConfig);
		} else if (ourConfig.platform === 'ios') {
			ExtensionContainer.context.workspaceState.update(WorkspaceState.LastiOSDebug, ourConfig);
		}

		return ourConfig;
	}
}
