import * as fs from 'fs-extra';
import * as path from 'path';

import { commands, ProgressLocation, Uri, window } from 'vscode';
import { VSCodeCommands } from '../constants';
import { ExtensionContainer } from '../container';
import { inputBox, selectFromFileSystem, selectPlatforms, yesNoQuestion } from '../quickpicks';
import { createModuleArguments, validateAppId } from '../utils';
import { checkLogin, handleInteractionError, InteractionError } from './common';

export async function createModule () {
	try {
		checkLogin();
		// ToDo: Store last dir created in and provide as default?
		let force;
		const logLevel = ExtensionContainer.config.general.logLevel;

		const name = await inputBox({ prompt: 'Enter your module name' });
		const appId = await inputBox({
			prompt: 'Enter your module ID',
			validateInput: currentAppId => {
				const isValid = validateAppId(currentAppId);
				if (!isValid) {
					return 'Invalid module id!';
				}
			}
		});
		const platforms = await selectPlatforms();
		const location: Uri[] = await selectFromFileSystem({ canSelectFolders: true });
		const workspaceDir = location[0].path;
		if (await fs.pathExists(path.join(workspaceDir, name))) {
			force = await yesNoQuestion({ placeHolder: 'That module already exists. Would you like to overwrite?' }, true);
		}

		const args = createModuleArguments({
			appId,
			force,
			logLevel,
			name,
			platforms,
			workspaceDir,
		});
		await ExtensionContainer.terminal.runCommandInBackground(args, { cancellable: false, location: ProgressLocation.Notification, title: 'Creating module' });
		// TODO: Once workspace support is figured out, add an "add to workspace command"
		const dialog = await window.showInformationMessage('Project created. Would you like to open it?', { modal: true }, { title: 'Open Project' });
		if (dialog) {
			const projectDir = Uri.parse(path.join(workspaceDir, name));
			await commands.executeCommand(VSCodeCommands.OpenFolder, projectDir, true);
		}
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
