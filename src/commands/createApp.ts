import * as fs from 'fs-extra';
import * as path from 'path';
import { CommandError } from '../common/utils';

import { commands, ProgressLocation, Uri, window, workspace } from 'vscode';
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
		let enableServices = false;
		if (!ExtensionContainer.isUsingTi()) {
			enableServices = await yesNoQuestion({ placeHolder: 'Enable services?' });
		}
		const workspaceDir = await selectCreationLocation(lastCreationPath);
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastCreationPath, workspaceDir.fsPath);
		if (await fs.pathExists(path.join(workspaceDir.fsPath, name))) {
			force = await yesNoQuestion({ placeHolder: 'That app already exists. Would you like to overwrite?' }, true);
			if (!force) {
				throw new InteractionError('App already exists and chose to not overwrite');
			}
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

		await window.withProgress({ cancellable: false, location: ProgressLocation.Notification }, async (progress) => {
			progress.report({ message: 'Creating application' });
			const command = ExtensionContainer.isUsingTi() ? 'ti' : 'appc';
			await ExtensionContainer.terminal.runInBackground(command, args);

			if (ExtensionContainer.isUsingTi()) {
				progress.report({ message: 'Creating Alloy project' });
				const alloyArgs =  [ 'new' ];
				if (force) {
					alloyArgs.push('--force');
				}
				await ExtensionContainer.terminal.runInBackground('alloy', [ 'new' ], { cwd: path.join(workspaceDir.fsPath, name) });
			}
			return;
		});

		const projectDir = Uri.file(path.join(workspaceDir.fsPath, name));
		const dialog = await window.showInformationMessage('Project created. Would you like to open it?', { title: 'Open in new window', id: 'window' }, { title: 'Open in workspace', id: 'workspace' });
		if (dialog?.id === 'window') {
			await commands.executeCommand(VSCodeCommands.OpenFolder, projectDir, true);
		} else if (dialog?.id === 'workspace') {
			await workspace.updateWorkspaceFolders(0, 0, { uri: projectDir });
		}
	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		} else if (error instanceof CommandError) {
			const choices = [];
			if (error.output) {
				choices.push('View Error');
			}

			const action = await window.showErrorMessage('Failed to create application', ...choices);
			if (error.output && action === 'View Error') {
				const channel = window.createOutputChannel('Titanium');
				channel.append(`${error.command}\n`);
				channel.append(error.output);
				channel.show();
			}
			console.log(error);
		}
	}
}
