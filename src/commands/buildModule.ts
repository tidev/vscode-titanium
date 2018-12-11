import project from '../project';

import { window } from 'vscode';
import { GlobalState, WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode, } from '../explorer/nodes';
import { buildArguments, nameForPlatform, nameForTarget, } from '../utils';
import { checkLogin, InteractionError } from './common';

import { selectPlatform } from '../quickpicks/common';

export async function buildModule (node: DeviceNode | OSVerNode | PlatformNode | TargetNode) {
	try {
		checkLogin();
		// TODO: Handle a build in progress, allow passing in emulators etc. here? And actually use package for dist modules?
		const buildType = 'run';

		let platform;

		if (node) {
			platform = node.platform;
		}

		if (!platform) {
			const platformInfo = await selectPlatform();
			platform = platformInfo.id;
		}

		const buildInfo = {
			buildType,
			platform
		};
		const args = buildArguments(buildInfo, 'module');
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastBuildState, buildInfo);
		ExtensionContainer.terminal.runCommand(args);
	} catch (error) {
		if (error instanceof InteractionError) {
			window.showErrorMessage(error.message, error.messageOptions, ...error.interactionChoices);
		}
	}
}
