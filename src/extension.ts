import * as path from 'path';
import * as vscode from 'vscode';
import appc from './appc';
import project from './project';

import { Commands, handleInteractionError, InteractionChoice, InteractionError } from './commands';
import { GlobalState } from './constants';
import { ExtensionContainer } from './container';

import { Config, Configuration, configuration } from './configuration';

import { completion, environment, updates } from 'titanium-editor-commons';

import { registerTaskProviders } from './tasks/tasksHelper';
import { registerDebugProvider } from './debugger/titaniumDebugHelper';
import { registerProviders } from './providers';
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
 * Generate Alloy and Titanium SDK Completion files
 *
 * @param {boolean} [force=false] generate the completions even if they exist
 */
async function generateCompletions (force = false): Promise<void> {
	if (!project.isValid()) {
		return;
	}
	let sdkVersion: string|string[]|undefined;
	try {
		sdkVersion = project.sdk();
		if (!sdkVersion) {
			const error = new InteractionError('Errors found in tiapp.xml: no sdk-version found');
			error.interactionChoices.push({
				title: 'Open tiapp.xml',
				run: async () => {
					const file = path.join(vscode.workspace.rootPath!, 'tiapp.xml');
					const document = await vscode.workspace.openTextDocument(file);
					await vscode.window.showTextDocument(document);
				}
			});
			throw error;
		} else if (sdkVersion.length > 1) {
			const error = new InteractionError('Errors found in tiapp.xml: multiple sdk-version tags found.');
			error.interactionChoices.push({
				title: 'Open tiapp.xml',
				run: async () => {
					const file = path.join(vscode.workspace.rootPath!, 'tiapp.xml');
					const document = await vscode.workspace.openTextDocument(file);
					await vscode.window.showTextDocument(document);
				}
			});
			throw error;
		} else {
			sdkVersion = sdkVersion[0];
		}

	} catch (error) {
		if (error instanceof InteractionError) {
			await handleInteractionError(error);
		}
		return;
	}
	try {
		const sdkInfo = appc.sdkInfo(sdkVersion);
		if (!sdkInfo) {
			// TODO
			return;
		}
		const sdkPath = sdkInfo.path;
		// Generate the completions
		const [ alloy, sdk ] = await Promise.all([
			completion.generateAlloyCompletions(force, completion.CompletionsFormat.v2),
			completion.generateSDKCompletions(force, sdkVersion, sdkPath, completion.CompletionsFormat.v3)
		]);
		if (sdk || alloy) {
			let message = 'Autocomplete suggestions generated for';
			if (sdk) {
				message = `${message} Titanium ${sdk}`;
			}
			if (alloy) {
				message = `${message} Alloy ${alloy}`;
			}
			vscode.window.showInformationMessage(message);
		}
	} catch (error) {
		const actions: InteractionChoice[] = [];
		if (error.code === 'ESDKNOTINSTALLED') {
			actions.push({
				title: 'Install',
				run: () => {
					vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium SDK Installation', cancellable: false }, async () => {
						try {
							await updates.titanium.sdk.installUpdate(sdkVersion as string);
							await appc.getInfo();
							await generateCompletions(force);
						} catch (err) {
							return Promise.reject(err);
						}
					});
				}
			});
		}
		const install = await vscode.window.showErrorMessage(`Error generating autocomplete suggestions. ${error.message}`, ...actions);
		if (install) {
			await install.run();
		}
	}
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
			vscode.commands.executeCommand(Commands.RefreshUpdates);
		}
	});
}
