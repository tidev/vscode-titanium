import * as vscode from 'vscode';
import appc from './appc';

import { Commands, handleInteractionError, InteractionError } from './commands';
import { GlobalState } from './constants';
import { ExtensionContainer } from './container';

import { Config, Configuration, configuration } from './configuration';

import { environment } from 'titanium-editor-commons';

import { registerTaskProviders } from './tasks/tasksHelper';
import { registerDebugProvider } from './debugger/titaniumDebugHelper';
import { generateCompletions, registerProviders } from './providers';
import { registerCommands } from './commands/index';
import { registerViews } from './explorer';
import { dirname } from 'path';

import ms = require('ms');

export async function activate (context: vscode.ExtensionContext): Promise<void> {

	Configuration.configure(context);

	const config = configuration.get<Config>();

	ExtensionContainer.inititalize(context, config);

	registerCommands();
	registerProviders(context);
	registerViews(context);
	registerTaskProviders(context);
	registerDebugProvider(context);

	startup();

	vscode.workspace.onDidSaveTextDocument(async (event) => {
		if (!event.fileName.includes('tiapp.xml')) {
			return;
		}

		const parent = dirname(event.fileName);
		const project = ExtensionContainer.projects.get(parent);

		if (!project) {
			return;
		}

		await project.load();
		await generateCompletions(false, project);
	});

	vscode.workspace.onDidGrantWorkspaceTrust(async () => {
		await startup();
	});
}

/**
 * Performs validation around environment status, whether the active folder is a Titanium project,
 * and fully loads the extension if so.
 *
 * Extracted from the main activate function to allow for the update install logic to call it if
 * we're installing from a missing tooling scenario
 */
export async function startup (): Promise<void> {

	if (!vscode.workspace.isTrusted) {
		// We need to set Enabled here just incase the environment was previously valid but now we
		// are missing tooling
		ExtensionContainer.setContext(GlobalState.Enabled, false);
		ExtensionContainer.setContext(GlobalState.NeedsTrustedWorkspace, true);
		return;
	}

	const { missing } = await environment.validateEnvironment(undefined);

	if (missing.length) {
		// We need to set Enabled here just incase the environment was previously valid but now we
		// are missing tooling
		ExtensionContainer.setContext(GlobalState.Enabled, false);
		ExtensionContainer.setContext(GlobalState.MissingTooling, true);
		return;
	}

	ExtensionContainer.setContext(GlobalState.MissingTooling, false);

	await ExtensionContainer.loadProjects();

	if (!ExtensionContainer.projects.size) {
		ExtensionContainer.setContext(GlobalState.Enabled, false);
		ExtensionContainer.setContext(GlobalState.NotTitaniumProject, true);
		return;
	}

	ExtensionContainer.setContext(GlobalState.NotTitaniumProject, false);
	ExtensionContainer.setContext(GlobalState.Enabled, true);

	vscode.window.withProgress({ cancellable: false, location: vscode.ProgressLocation.Notification, title: 'Titanium' }, async progress => {
		if (ExtensionContainer.context.globalState.get(GlobalState.Liveview)) {
			ExtensionContainer.setContext(GlobalState.Liveview, true);
		}

		progress.report({
			message: 'Fetching environment information'
		});

		try {
			await appc.getInfo();
		} catch (error) {
			if (error instanceof InteractionError) {
				handleInteractionError(error);
				return;
			}
			vscode.window.showErrorMessage('Error fetching Titanium environment');
			return;
		}

		// Call refresh incase the Titanium Explorer activity pane became active before info
		vscode.commands.executeCommand(Commands.RefreshExplorer);

		// Perform the update check if we need to
		const lastUpdateCheck = ExtensionContainer.context.globalState.get<number>(GlobalState.LastUpdateCheck) || 0;
		const updateInterval = ms(ExtensionContainer.config.general.updateFrequency);

		// If there's no timestamp for when we last checked the updates then set to now
		if (!lastUpdateCheck) {
			ExtensionContainer.context.globalState.update(GlobalState.LastUpdateCheck, Date.now());
		}

		const checkUpdates = Date.now() - lastUpdateCheck > updateInterval;
		if (checkUpdates) {
			ExtensionContainer.context.globalState.update(GlobalState.LastUpdateCheck, Date.now());
			vscode.commands.executeCommand(Commands.CheckForUpdates);
		} else {
			vscode.commands.executeCommand(Commands.RefreshHelp);
		}
	});
}
