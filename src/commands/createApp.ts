import * as fs from 'fs-extra';
import * as path from 'path';

import { commands, ProgressLocation, Uri, window } from 'vscode';
import { VSCodeCommands, WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { inputBox, selectCreationLocation, selectPlatforms, yesNoQuestion } from '../quickpicks';
import { createAppArguments, validateAppId } from '../utils';
import { checkLogin, handleInteractionError,  InteractionError } from './common';

export async function createApplication (): Promise<void> {
	try {
		checkLogin();
		let force = false;
		const logLevel = ExtensionContainer.config.general.logLevel;
		const lastCreationPath = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastCreationPath);

		const name = await inputBox({ prompt: 'Enter your application name' });
		const id = await inputBox({
			prompt: 'Enter your application ID',
			validateInput: currentAppId => {
				const isValid = validateAppId(currentAppId);
				if (!isValid) {
					return 'Invalid app id!';
				}
			}
		});
		const platforms = await selectPlatforms();
		const enableServices = await yesNoQuestion({ placeHolder: 'Enable services?' });
		const workspaceDir = await selectCreationLocation(lastCreationPath);
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastCreationPath, workspaceDir.fsPath);
		if (await fs.pathExists(path.join(workspaceDir.fsPath, name))) {
			force = await yesNoQuestion({ placeHolder: 'That app already exists. Would you like to overwrite?' }, true);
		}

		const args = createAppArguments({
			id,
			enableServices,
			force,
			logLevel,
			name,
			platforms,
			workspaceDir: workspaceDir.fsPath,
		});
		await ExtensionContainer.terminal.runCommandInBackground(args, { cancellable: false, location: ProgressLocation.Notification, title: 'Creating application' });
		// TODO: Once workspace support is figured out, add an "add to workspace command"
		const dialog = await window.showInformationMessage('Project created. Would you like to open it?', { modal: true }, { title: 'Open Project' });
		if (dialog) {
			const projectDir = Uri.file(path.join(workspaceDir.fsPath, name));
			await commands.executeCommand(VSCodeCommands.OpenFolder, projectDir, true);
		}
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
	}
}
