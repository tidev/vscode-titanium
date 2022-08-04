import * as fs from 'fs-extra';
import * as path from 'path';

import { commands, ProgressLocation, Uri, window, workspace } from 'vscode';
import { VSCodeCommands, WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { inputBox, selectCodeBases, selectCreationLocation, selectPlatforms, yesNoQuestion } from '../quickpicks';
import { createModuleArguments, validateAppId } from '../utils';
import { handleInteractionError, InteractionError } from './common';
import { CommandError } from '../common/utils';

export async function createModule (): Promise<void> {
	try {

		// force a refresh of the environment information to make sure that we have the correct
		// selected SDK and CLI
		await ExtensionContainer.environment.getInfo();

		let force = false;
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
		const codeBases = await selectCodeBases(platforms);
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastCreationPath, workspaceDir.fsPath);
		if (await fs.pathExists(path.join(workspaceDir.fsPath, name))) {
			force = await yesNoQuestion({ placeHolder: 'That module already exists. Would you like to overwrite?' }, true);
			if (!force) {
				throw new InteractionError('Module already exists and chose to not overwrite');
			}
		}

		const args = createModuleArguments({
			id,
			force,
			logLevel,
			name,
			platforms,
			workspaceDir: workspaceDir.fsPath,
			codeBases
		});

		await window.withProgress({ cancellable: false, location: ProgressLocation.Notification }, async (progress) => {
			progress.report({ message: 'Creating module' });
			await ExtensionContainer.terminal.runInBackground('ti', args);
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
				ExtensionContainer.outputChannel.append(`${error.command}\n`);
				ExtensionContainer.outputChannel.append(error.output);
				ExtensionContainer.outputChannel.show();
			}
			console.log(error);
		}
	}
}
