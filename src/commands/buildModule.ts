import * as path from 'path';
import { workspace } from 'vscode';
import { WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { DeviceNode, OSVerNode, PlatformNode, TargetNode, } from '../explorer/nodes';
import { buildArguments } from '../utils';
import { checkLogin, handleInteractionError, InteractionError } from './common';

import { selectPlatform } from '../quickpicks/common';
import { BuildModuleOptions } from '../types/cli';

export async function buildModule (node: DeviceNode | OSVerNode | PlatformNode | TargetNode) {
	try {
		checkLogin();
		// TODO: Handle a build in progress, allow passing in emulators etc. here? And actually use package for dist modules?
		const buildType = 'run';
		const logLevel = ExtensionContainer.config.general.logLevel;
		let platform;

		if (node) {
			platform = node.platform;
		}

		if (!platform) {
			const platformInfo = await selectPlatform();
			platform = platformInfo.id;
		}
		const projectDir = path.join(workspace.rootPath, platform);
		const buildInfo: BuildModuleOptions = {
			buildType,
			platform,
			logLevel,
			projectDir,
			buildOnly: true,
			projectType: 'module'
		};
		const args = buildArguments(buildInfo);
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastBuildState, buildInfo);
		ExtensionContainer.terminal.runCommand(args);
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
