import * as vscode from 'vscode';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode } from '../explorer/nodes';
import { checkLogin, handleInteractionError, InteractionError } from './common';
import { selectPlatform } from '../quickpicks';
import { getBuildTask, Platform } from '../tasks/tasksHelper';
import { AppBuildTask, AppBuildTaskTitaniumBuildBase } from '../tasks/buildTaskProvider';
import { ExtensionContainer } from '../container';
import { WorkspaceState } from '../constants';
import { nameForPlatform, nameForTarget } from '../utils';
import appc from '../appc';

function getDeviceNameFromId (deviceID: string, platform: Platform, target: string): string {
	let deviceName: string|undefined;
	if (platform === 'android' && target === 'device') {
		deviceName = (appc.androidDevices().find(device => device.id === deviceID))?.name;
	} else if (platform === 'android' && target === 'emulator') {
		deviceName = (appc.androidEmulators().AVDs.find(emulator => emulator.id === deviceID))?.name;
	} else if (platform === 'ios' && target === 'device') {
		deviceName = (appc.iOSDevices().find(device => device.udid === deviceID))?.name;
	} else if (platform === 'ios' && target === 'simulator') {
		for (const simVer of appc.iOSSimulatorVersions()) {
			deviceName = (appc.iOSSimulators()[simVer].find(simulator => simulator.udid === deviceID))?.name;
			if (deviceName) {
				deviceName = `${deviceName} (${simVer})`;
				break;
			}
		}
	}

	if (!deviceName) {
		throw new Error(`Unable to find a name for ${deviceID}`);
	}

	return deviceName;
}

export async function buildApplication (node: DeviceNode | OSVerNode | PlatformNode | TargetNode): Promise<void> {
	try {
		checkLogin();

		const lastBuildState = ExtensionContainer.context.workspaceState.get<AppBuildTaskTitaniumBuildBase>(WorkspaceState.LastBuildState);
		let lastBuildDescription: string|undefined;

		if (lastBuildState) {
			try {
				// TODO: map the device ID back based off the info output, this also allows us to ignore invalid build states for example by a device being disconnected
				const deviceName = getDeviceNameFromId(lastBuildState.deviceId!, lastBuildState.platform, lastBuildState.target!);
				lastBuildDescription = `${nameForPlatform(lastBuildState.platform)} ${nameForTarget(lastBuildState.target!)} ${deviceName}`;
			} catch (error) {
				console.log(error);
				// Ignore and clear the state, we don't want to error due to a bad state
				ExtensionContainer.context.workspaceState.update(WorkspaceState.LastBuildState, undefined);
			}
		}

		const buildChoice = node?.platform as string || (await selectPlatform(lastBuildDescription)).id;

		const platform = buildChoice === 'last' ? lastBuildState?.platform as Platform : buildChoice as Platform;

		const taskDefinition: AppBuildTask = {
			definition: {
				titaniumBuild: {
					projectType: 'app',
					platform,
					projectDir: vscode.workspace.rootPath!
				},
				type: 'titanium-build',
				name: `Build ${platform}`
			},
			name: `Build ${platform}`,
			isBackground: false,
			source: 'Titanium',
			presentationOptions: {},
			problemMatchers: [],
			runOptions: {},
			scope: vscode.TaskScope.Workspace
		};

		if (buildChoice === 'last') {
			Object.assign(taskDefinition.definition.titaniumBuild, lastBuildState);
		} else {
			if (node?.targetId) {
				taskDefinition.definition.titaniumBuild.target = node.targetId as 'device' | 'emulator' | 'simulator';
			}

			if (node?.version) {
				// TODO need to copy across the iOS simulator version
			}

			if (node?.deviceId) {
				taskDefinition.definition.titaniumBuild.deviceId = node.deviceId;
			}
		}

		const task = await getBuildTask(taskDefinition);
		await vscode.tasks.executeTask(task);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error)
				.then(async function () {
					const choice = await vscode.window.showErrorMessage('Build App failed', { title: 'Rerun' });
					if (!choice) {
						return;
					}
					if (choice.title === 'Rerun') {
						buildApplication(node);
					}
				});
		}
	}
}
