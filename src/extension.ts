import * as vscode from 'vscode';
import appc from './appc';
import project from './project';

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
}

export function deactivate (): void {
	project.dispose();
}

/**
 * Performs validation around environment status, whether the active folder is a Titanium project,
 * and fully loads the extension if so.
 *
 * Extracted from the main activate function to allow for the update install logic to call it if
 * we're installing from a missing tooling scenario
 */
export async function startup (): Promise<void> {
	const { missing } = await environment.validateEnvironment();

	if (missing.length) {
		ExtensionContainer.setContext(GlobalState.MissingTooling, true);
		return;
	}

	ExtensionContainer.setContext(GlobalState.MissingTooling, false);

	project.load();

	if (!project.isTitaniumProject()) {
		ExtensionContainer.setContext(GlobalState.NotTitaniumProject, true);
		return;
	}

	ExtensionContainer.setContext(GlobalState.NotTitaniumProject, false);

	project.onModified(async () => {
		generateCompletions();
	});

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
			vscode.window.showErrorMessage('Error fetching Appcelerator environment');
			return;
		}

		if (project.isTitaniumApp) {
			generateCompletions();
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
