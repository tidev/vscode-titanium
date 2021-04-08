import * as path from 'path';
import { ProgressLocation, window, workspace } from 'vscode';
import { ExtensionContainer } from '../container';
import project from '../project';
import { selectPlatform } from '../quickpicks/common';
import { isValidPlatform, quoteArgument } from '../utils';
import { handleInteractionError, InteractionError } from './common';

export async function cleanApplication (): Promise<void> {
	try {
		const logLevel = ExtensionContainer.config.general.logLevel;
		let projectDir = workspace.rootPath!;

		if (project.isTitaniumModule) {
			const platformInfo = await selectPlatform(undefined, isValidPlatform);
			projectDir = path.join(projectDir, platformInfo.id);
		}
		await window.withProgress({ cancellable: false, location: ProgressLocation.Notification, title: 'Cleaning project' }, async () => {
			const command = ExtensionContainer.isUsingTi() ? 'ti' : 'appc';
			const args = [
				'clean',
				'--project-dir', projectDir,
				'--log-level', logLevel
			];

			if (!ExtensionContainer.isUsingTi()) {
				args.unshift('ti');
			}

			const quotedArgs =  args.map(arg => quoteArgument(arg));

			await ExtensionContainer.terminal.runInBackground(command, quotedArgs);
		});

	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
