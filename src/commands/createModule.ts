import * as fs from 'fs-extra';
import * as path from 'path';

import { commands, ProgressLocation, Uri, window } from 'vscode';
import { VSCodeCommands, WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { inputBox, selectCreationLocation, selectPlatforms, yesNoQuestion } from '../quickpicks';
import { createModuleArguments, validateAppId } from '../utils';
import { checkLogin, handleInteractionError, InteractionError } from './common';

export async function createModule () {
	try {
		checkLogin();
		let force: boolean = false;
		const logLevel = ExtensionContainer.config.general.logLevel;
		const lastCreationPath = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastCreationPath);

		const name = await inputBox({ prompt: 'Enter your module name' });
		const id = await inputBox({
			prompt: 'Enter your module ID',
			validateInput: currentAppId => {
				const isValid = validateAppId(currentAppId);
				if (!isValid) {
					return 'Invalid module id!';
				}
			}
		});
		const platforms = await selectPlatforms();
		const workspaceDir = await selectCreationLocation(lastCreationPath);
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastCreationPath, workspaceDir!.fsPath);
		if (await fs.pathExists(path.join(workspaceDir!.fsPath, name))) {
			force = await yesNoQuestion({ placeHolder: 'That module already exists. Would you like to overwrite?' }, true);
		}

		const args = createModuleArguments({
			id,
			force,
			logLevel,
			name,
			platforms,
			workspaceDir: workspaceDir!.fsPath,
		});
		await ExtensionContainer.terminal.runCommandInBackground(args, { cancellable: false, location: ProgressLocation.Notification, title: 'Creating module' });
		// TODO: Once workspace support is figured out, add an "add to workspace command"
		const dialog = await window.showInformationMessage('Project created. Would you like to open it?', { modal: true }, { title: 'Open Project' });
		if (dialog) {
			const projectDir = Uri.file(path.join(workspaceDir!.fsPath, name));
			await commands.executeCommand(VSCodeCommands.OpenFolder, projectDir, true);
		}
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
