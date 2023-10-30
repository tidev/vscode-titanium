import * as fs from 'fs-extra';
import * as path from 'path';
import { CommandError } from '../common/utils';

import { commands, ProgressLocation, Uri, window, workspace, l10n } from 'vscode';
import { VSCodeCommands, WorkspaceState } from '../constants';
import { ExtensionContainer } from '../container';
import { inputBox, selectCreationLocation, selectPlatforms, yesNoQuestion } from '../quickpicks';
import { createAppArguments, validateAppId } from '../utils';
import { handleInteractionError,  InteractionError } from './common';

export async function createApplication (): Promise<void> {
	try {
		let force = false;
		let alloy = true;
		const logLevel = ExtensionContainer.config.general.logLevel;
		const lastCreationPath = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastCreationPath);

		const name = await inputBox({ prompt: l10n.t('Enter your application name') });
		const id = await inputBox({
			prompt: l10n.t('Enter your application ID'),
			validateInput: currentAppId => {
				const isValid = validateAppId(currentAppId);
				if (!isValid) {
					return l10n.t('Invalid app id!');
				}
			}
		});
		const platforms = await selectPlatforms();
		const workspaceDir = await selectCreationLocation(lastCreationPath);
		ExtensionContainer.context.workspaceState.update(WorkspaceState.LastCreationPath, workspaceDir.fsPath);
		if (await fs.pathExists(path.join(workspaceDir.fsPath, name))) {
			force = await yesNoQuestion({ placeHolder: l10n.t('That app already exists. Would you like to overwrite?') }, true);
			if (!force) {
				throw new InteractionError(l10n.t('App already exists and chose to not overwrite'));
			}
		}

		const args = createAppArguments({
			id,
			force,
			logLevel,
			name,
			platforms,
			workspaceDir: workspaceDir.fsPath,
		});

		await window.withProgress({ cancellable: false, location: ProgressLocation.Notification }, async (progress) => {
			progress.report({ message: l10n.t('Creating application') });
			await ExtensionContainer.terminal.runInBackground('ti', args);

			alloy = await yesNoQuestion({ placeHolder: l10n.t('Create an Alloy project?') }, false);
			if (alloy) {
				progress.report({ message: l10n.t('Creating Alloy project') });
				const alloyArgs =  [ 'new' ];
				if (force) {
					alloyArgs.push('--force');
				}
				await ExtensionContainer.terminal.runInBackground('alloy', [ 'new' ], { cwd: path.join(workspaceDir.fsPath, name) });
			}
			return;
		});

		const projectDir = Uri.file(path.join(workspaceDir.fsPath, name));
		const dialog = await window.showInformationMessage(l10n.t('Project created. Would you like to open it?'), { title: l10n.t('Open in new window'), id: 'window' }, { title: l10n.t('Open in workspace'), id: 'workspace' });
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

			const action = await window.showErrorMessage(l10n.t('Failed to create application'), ...choices);
			if (error.output && action === 'View Error') {
				ExtensionContainer.outputChannel.append(`${error.command}\n`);
				ExtensionContainer.outputChannel.append(error.output);
				ExtensionContainer.outputChannel.show();
			}
			console.log(error);
		}
	}
}
