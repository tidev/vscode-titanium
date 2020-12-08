/* eslint @typescript-eslint/no-use-before-define: off */
import * as path from 'path';
import * as vscode from 'vscode';
import appc from './appc';
import project from './project';

import { Commands, handleInteractionError, InteractionChoice, InteractionError } from './commands';
import { GlobalState, VSCodeCommands } from './constants';
import { ExtensionContainer } from './container';

import { Config, Configuration, configuration } from './configuration';

import * as definitionProviderHelper from './providers/definition/definitionProviderHelper';

import { completion, environment, updates } from 'titanium-editor-commons';

import { registerTaskProviders } from './tasks/tasksHelper';
import { registerDebugProvider } from './debugger/titaniumDebugHelper';
import { registerProviders } from './providers';
import { registerCommands } from './commands/index';
import { registerViews } from './explorer';

import { installUpdates } from './updates';
import ms = require('ms');

function activate (context: vscode.ExtensionContext): Promise<void> {

	Configuration.configure(context);

	const config = configuration.get<Config>();

	ExtensionContainer.inititalize(context, config);
	project.load();
	definitionProviderHelper.activate(context);

	if (!project.isTitaniumProject()) {
		vscode.commands.executeCommand(VSCodeCommands.SetContext, GlobalState.Enabled, false);
		ExtensionContainer.context.globalState.update(GlobalState.Enabled, false);
	} else {
		project.onModified(async () => {
			await Promise.all([
				generateCompletions()
			]);
		});
		vscode.commands.executeCommand(VSCodeCommands.SetContext, GlobalState.Enabled, true);
		ExtensionContainer.context.globalState.update(GlobalState.Enabled, true);
	}

	registerCommands();
	registerProviders(context);
	registerViews(context);

	context.subscriptions.push(
		// register init command
		vscode.commands.registerCommand('titanium.init', init),

		// register generate autocomplete suggestions command
		vscode.commands.registerCommand(Commands.GenerateAutocomplete, async () => {
			await generateCompletions(true);
		}),
	);

	registerTaskProviders(context);

	registerDebugProvider(context);

	return init();
}

exports.activate = activate; // eslint-disable-line no-undef

/**
 * Deactivate
 */
function deactivate (): void {
	project.dispose();
}
exports.deactivate = deactivate;  // eslint-disable-line no-undef

/**
 * Initialise extension - fetch appc info
 */
async function init (): Promise<void> {
	const isEnabled = ExtensionContainer.context.globalState.get<boolean>(GlobalState.Enabled);
	if (isEnabled) {
		vscode.window.withProgress({ cancellable: false, location: vscode.ProgressLocation.Notification, title: 'Titanium' }, async progress => {
			progress.report({
				message: 'Validating environment'
			});

			const { missing } = await environment.validateEnvironment();

			if (missing.length) {
				let message = 'You are missing the following required components for Titanium development:';
				for (let i = 0; i < missing.length; i++) {
					const product = missing[i];
					if (i < missing.length - 1) {
						message = `${message} ${product.name},`;
					} else {
						message = `${message} ${product.name}`;
					}
				}
				message = `${message}. Without these components the extension will be unusable.`;
				const choices: InteractionChoice[] = [
					{
						title: 'Install',
						run: async (): Promise<void> => {
							const updateInfo = [];
							progress.report({
								message: 'Fetching latest component versions'
							});
							for (const product of missing) {
								updateInfo.push(await product.getInstallInfo());

							}
							await installUpdates(updateInfo, progress, false);
						}
					}
				];
				const installProducts = await vscode.window.showErrorMessage(message, ...choices);
				if (installProducts) {
					progress.report({
						message: 'Installing missing components'
					});

					await installProducts.run();
				} else {
					vscode.window.showErrorMessage('Extension startup cancelled as required components are not installed');
					return Promise.reject();
				}
			}

			if (ExtensionContainer.context.globalState.get('titanium:liveview')) {
				vscode.commands.executeCommand('setContext', 'titanium:liveview', true);
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

			return Promise.resolve();
		});
	}
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
