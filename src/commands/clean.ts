import * as path from 'path';
import { ProgressLocation, window } from 'vscode';
import * as fs from 'fs-extra';
import { ExtensionContainer } from '../container';
import { selectPlatform, promptForWorkspaceFolder } from '../quickpicks/common';
import { quoteArgument } from '../utils';
import { handleInteractionError, InteractionError } from './common';

export async function cleanApplication (): Promise<void> {
	try {
		const logLevel = ExtensionContainer.config.general.logLevel;
		const { folder } = await promptForWorkspaceFolder({ apps: true, modules: true });
		let projectDir: string;

		const isAppProject = await fs.pathExists(path.join(folder.uri.fsPath, 'tiapp.xml'));

		if (!isAppProject) {
			const platformInfo = await selectPlatform(undefined, (platform) => fs.pathExistsSync(path.join(folder.uri.fsPath, platform)));
			projectDir = path.join(folder.uri.fsPath, platformInfo.id);
		} else {
			projectDir = folder.uri.fsPath;
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
