/* eslint @typescript-eslint/no-use-before-define: off */
import * as path from 'path';
import * as vscode from 'vscode';
import appc from './appc';
import DeviceExplorer from './explorer/tiExplorer';
import project from './project';
import * as related from './related';

import {
	AlloyComponentExtension,
	AlloyComponentFolder,
	AlloyComponentType,
	buildApplication,
	buildModule,
	cleanApplication,
	Commands,
	createApplication,
	createModule,
	generateComponent,
	generateModel,
	packageApplication,
	packageModule
} from './commands';
import { GlobalState, VSCodeCommands } from './constants';
import { ExtensionContainer } from './container';

import { ControllerCompletionItemProvider } from './providers/completion/controllerCompletionItemProvider';
import { StyleCompletionItemProvider } from './providers/completion/styleCompletionItemProvider';
import { TiappCompletionItemProvider } from './providers/completion/tiappCompletionItemProvider';
import { ViewCompletionItemProvider } from './providers/completion/viewCompletionItemProvider';

import { Config, Configuration, configuration } from './configuration';
import { ControllerDefinitionProvider } from './providers/definition/controllerDefinitionProvider';
import { StyleDefinitionProvider } from './providers/definition/styleDefinitionProvider';
import { ViewCodeActionProvider } from './providers/definition/viewCodeActionProvider';
import { ViewDefinitionProvider } from './providers/definition/viewDefinitionProvider';
import { ViewHoverProvider } from './providers/definition/viewHoverProvider';

import * as definitionProviderHelper from './providers/definition/definitionProviderHelper';

import { LogLevel, UpdateChoice } from './types/common';

import ms = require('ms');
import { completion, environment, updates } from 'titanium-editor-commons';
import { handleInteractionError, InteractionChoice, InteractionError  } from './commands/common';
import { UpdateNode, DeviceNode } from './explorer/nodes';
import UpdateExplorer from './explorer/updatesExplorer';
import { quickPick, selectUpdates } from './quickpicks/common';
let projectStatusBarItem: vscode.StatusBarItem;

import { UpdateInfo } from 'titanium-editor-commons/updates';

import { registerTaskProviders, debugSessionInformation, DEBUG_SESSION_VALUE } from './tasks/tasksHelper';
import { registerDebugProvider } from './debugger/titaniumDebugHelper';
import { executeAsTask } from './utils';

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
		setStatusBar();
		project.onModified(async () => {
			await Promise.all([
				setStatusBar(),
				generateCompletions()
			]);
		});
		vscode.commands.executeCommand(VSCodeCommands.SetContext, GlobalState.Enabled, true);
		ExtensionContainer.context.globalState.update(GlobalState.Enabled, true);
	}

	const viewFilePattern = '**/app/{views,widgets}/**/*.xml';
	const styleFilePattern = '**/*.tss';
	const controllerFilePattern = '{**/app/controllers/**/*.js,**/app/lib/**/*.js,**/app/widgets/**/*.js,**/app/alloy.js}';
	const deviceExplorer = new DeviceExplorer();
	const updateExplorer = new UpdateExplorer();
	context.subscriptions.push(
		// register completion providers
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewCompletionItemProvider(), '.', '\'', '"'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: styleFilePattern }, new StyleCompletionItemProvider(), '.', '\'', '"'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: controllerFilePattern }, new ControllerCompletionItemProvider(), '.', '\'', '"', '/'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: '**/tiapp.xml' }, new TiappCompletionItemProvider(), '.'),

		// register hover providers
		vscode.languages.registerHoverProvider({ scheme: 'file', pattern: '**/{*.xml,*.tss,*.js}' }, new ViewHoverProvider()),

		// register definition providers
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewDefinitionProvider()),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: styleFilePattern }, new StyleDefinitionProvider()),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: controllerFilePattern }, new ControllerDefinitionProvider()),

		// register code action providers
		vscode.languages.registerCodeActionsProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewCodeActionProvider()),

		// register init command
		vscode.commands.registerCommand('titanium.init', init),

		// register run command
		vscode.commands.registerCommand(Commands.Build, node => {
			if (project.isTitaniumApp) {
				return buildApplication(node);
			} else if (project.isTitaniumModule) {
				return buildModule(node);
			}
		}),

		// register distribute command
		vscode.commands.registerCommand(Commands.Package, node => {
			if (project.isTitaniumApp) {
				return packageApplication(node);
			} else if (project.isTitaniumModule) {
				return packageModule(node);
			}
		}),

		// register stop command
		vscode.commands.registerCommand(Commands.StopBuild, () => {
			if (ExtensionContainer.runningTask) {
				ExtensionContainer.runningTask.terminate();
			}
		}),

		// register set log level command
		vscode.commands.registerCommand(Commands.SetLogLevel, async () => {
			const level = await quickPick([ 'Trace', 'Debug', 'Info', 'Warn', 'Error' ], { placeHolder: 'Select log level' }) as keyof typeof LogLevel;
			const actualLevel = LogLevel[level];
			if (actualLevel) {
				await configuration.update('general.logLevel', actualLevel, vscode.ConfigurationTarget.Global);
			}
		}),

		// register related view commands
		vscode.commands.registerCommand(Commands.OpenRelatedView, () => {
			related.openRelatedFile('xml');
		}),
		vscode.commands.registerCommand(Commands.OpenRelatedStyle, () => {
			related.openRelatedFile('tss');
		}),
		vscode.commands.registerCommand(Commands.OpenRelatedController, () => {
			related.openRelatedFile('js');
		}),
		vscode.commands.registerCommand(Commands.OpenAllRelatedFiles, () => {
			related.openAllFiles();
		}),

		// register generate autocomplete suggestions command
		vscode.commands.registerCommand(Commands.GenerateAutocomplete, async () => {
			await generateCompletions(true);
		}),

		vscode.commands.registerCommand(Commands.OpenAppOnDashboard, () => {
			const dashboardUrl = project.dashboardUrl();
			if (dashboardUrl) {
				vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(dashboardUrl));
			} else {
				vscode.window.showErrorMessage('Unable to open project on dashboard');
			}
		}),

		vscode.window.registerTreeDataProvider('titanium.view.buildExplorer', deviceExplorer),

		vscode.commands.registerCommand(Commands.RefreshExplorer, async () => {
			await deviceExplorer.refresh();
		}),

		vscode.window.registerTreeDataProvider('titanium.view.updateExplorer', updateExplorer),

		vscode.commands.registerCommand(Commands.RefreshUpdates, async () => {
			await updateExplorer.refresh();
		}),

		vscode.commands.registerCommand(Commands.EnableLiveView, async () => {
			await configuration.update('build.liveview', true, vscode.ConfigurationTarget.Global);
			vscode.window.showInformationMessage('Enabled LiveView');
		}),

		vscode.commands.registerCommand(Commands.DisableLiveView, async () => {
			await configuration.update('build.liveview', false, vscode.ConfigurationTarget.Global);
			vscode.window.showInformationMessage('Disabled LiveView');
		}),

		vscode.commands.registerCommand(Commands.GenerateAlloyController, () => generateComponent(AlloyComponentType.Controller, AlloyComponentFolder.Controller, AlloyComponentExtension.Controller)),

		vscode.commands.registerCommand(Commands.GenerateAlloyMigration, () => generateComponent(AlloyComponentType.Migration, AlloyComponentFolder.Migration, AlloyComponentExtension.Migration)),

		vscode.commands.registerCommand(Commands.GenerateAlloyModel, generateModel),

		vscode.commands.registerCommand(Commands.GenerateAlloyStyle, () => generateComponent(AlloyComponentType.Style, AlloyComponentFolder.Style, AlloyComponentExtension.Style)),

		vscode.commands.registerCommand(Commands.GenerateAlloyView, () => generateComponent(AlloyComponentType.View, AlloyComponentFolder.View, AlloyComponentExtension.View)),

		vscode.commands.registerCommand(Commands.GenerateAlloyWidget, () => generateComponent(AlloyComponentType.Widget, AlloyComponentFolder.Widget, AlloyComponentExtension.Widget)),

		vscode.commands.registerCommand(Commands.CreateApp, createApplication),

		vscode.commands.registerCommand(Commands.CreateModule, createModule),

		vscode.commands.registerCommand(Commands.OpenReleaseNotes, ({ update }: UpdateNode) => {
			vscode.env.openExternal(vscode.Uri.parse(update.releaseNotes));
		}),

		vscode.commands.registerCommand(Commands.CheckForUpdates, async () => {
			await vscode.commands.executeCommand(Commands.RefreshUpdates);
			const updateInfo = updateExplorer.updates;
			const numberOfUpdates = updateInfo.length;
			if (!numberOfUpdates) {
				return;
			}
			ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, true);
			vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, true);
			const message = numberOfUpdates > 1 ? `There are ${numberOfUpdates} updates available` : `There is ${numberOfUpdates} update available`;
			const choice = await vscode.window.showInformationMessage(message, { title: 'Install' }, { title: 'View' });
			if (!choice) {
				return;
			}
			if (choice.title === 'Install') {
				vscode.commands.executeCommand(Commands.SelectUpdates);
			} else if (choice.title === 'View') {
				// Focus the update view
				await vscode.commands.executeCommand(Commands.ShowUpdatesView);
			}
		}),

		vscode.commands.registerCommand(Commands.SelectUpdates, async (updateInfo: UpdateInfo[]) => {
			try {
				if (!updateInfo) {
					updateInfo = updateExplorer.updates;
				}

				const updatesToInstall = await selectUpdates(updateInfo);
				vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium Updates', cancellable: false }, async progress => {
					const totalUpdates = updatesToInstall.length;
					await installUpdates(updatesToInstall, progress);
					if (updateInfo.length === totalUpdates) {
						ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, false);
						vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, false);
					}
					vscode.commands.executeCommand(Commands.RefreshUpdates);
					vscode.commands.executeCommand(Commands.RefreshExplorer);
					await vscode.window.showInformationMessage(`Installed ${totalUpdates} ${totalUpdates > 1 ? 'updates' : 'update'}`);
					return Promise.resolve();
				});
			} catch (error) {
				// TODO: add some sort of error reporting
			}
		}),

		vscode.commands.registerCommand(Commands.InstallAllUpdates, async updateInfo => {
			try {
				if (!updateInfo) {
					updateInfo = updateExplorer.updates;
				}
				vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium Updates', cancellable: false }, async progress => {
					const totalUpdates = updateInfo.length;
					await installUpdates(updateInfo, progress);
					ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, false);
					vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, false);
					vscode.commands.executeCommand(Commands.RefreshUpdates);
					vscode.commands.executeCommand(Commands.RefreshExplorer);
					await vscode.window.showInformationMessage(`Installed ${totalUpdates} ${totalUpdates > 1 ? 'updates' : 'update'}`);
					return Promise.resolve();
				});
			} catch (error) {
				// TODO: add some sort of error reporting
			}
		}),

		vscode.commands.registerCommand(Commands.InstallUpdate, async updateInfo => {
			try {
				vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium Updates', cancellable: false }, async progress => {
					await installUpdates([ updateInfo.update ], progress);
					ExtensionContainer.context.globalState.update(GlobalState.HasUpdates, false);
					vscode.commands.executeCommand('setContext', GlobalState.HasUpdates, false);
					vscode.commands.executeCommand(Commands.RefreshUpdates);
					vscode.commands.executeCommand(Commands.RefreshExplorer);
					await vscode.window.showInformationMessage('Installed 1 update');
					return Promise.resolve();
				});
			} catch (error) {
				// TODO: add some sort of error reporting
			}
		}),

		vscode.commands.registerCommand(Commands.Clean, cleanApplication),

		vscode.commands.registerCommand(Commands.Debug, async (node: DeviceNode) => {
			const debugConfig: vscode.DebugConfiguration = {
				type: 'titanium',
				name: 'Debug Titanium App',
				request: 'launch',
				platform: node.platform
			};

			debugSessionInformation.set(DEBUG_SESSION_VALUE, node);

			await vscode.debug.startDebugging(vscode.workspace.workspaceFolders![0], debugConfig);
		})
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

			appc.getInfo(error => {
				if (error) {
					vscode.window.showErrorMessage('Error fetching Appcelerator environment');
					return Promise.reject();
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
		});
	}

}

/**
 * Set project name and link to dashboard in status bar
 */
function setStatusBar (): void {
	if (!project.isValid()) {
		return;
	}
	if (!projectStatusBarItem) {
		projectStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
	}
	if (project.isTitaniumApp) {
		projectStatusBarItem.text = `$(device-mobile)  ${project.appName()} (${project.sdk()})`;
		if (project.dashboardUrl()) {
			projectStatusBarItem.command = Commands.OpenAppOnDashboard;
			projectStatusBarItem.tooltip = 'Open Axway Dashboard';
		} else {
			projectStatusBarItem.command = undefined;
			projectStatusBarItem.tooltip = undefined;
		}
		projectStatusBarItem.show();
	} else if (project.isTitaniumModule) {
		projectStatusBarItem.text = `$(package) ${project.appName()}`;
	}
	projectStatusBarItem.show();
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
			completion.generateSDKCompletions(force, sdkVersion, sdkPath, completion.CompletionsFormat.v2)
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
							appc.getInfo(() => {
								generateCompletions(force);
								return Promise.resolve();
							});
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

async function installUpdates (updateInfo: UpdateChoice[] | UpdateInfo[], progress: vscode.Progress<{ message?: string, increment?: number }>, incrementProgress = true): Promise<void> {
	const totalUpdates = updateInfo.length;
	let counter = 1;

	// sort prior to running
	updateInfo.sort((curr: UpdateChoice|UpdateInfo, prev: UpdateChoice|UpdateInfo) => curr.priority - prev.priority);

	for (const update of updateInfo) {
		const label = (update as UpdateChoice).label || `${update.productName}: ${update.latestVersion}`;
		progress.report({
			message: `Installing ${label} (${counter}/${totalUpdates})`
		});
		try {
			await update.action(update.latestVersion);
			progress.report({
				message: `Installed ${label} (${counter}/${totalUpdates})`
			});
			if (incrementProgress) {
				progress.report({
					increment: 100 / totalUpdates
				});
			}
		} catch (error) {
			progress.report({
				message: `Failed to install ${label} (${counter}/${totalUpdates})`
			});
			if (incrementProgress) {
				progress.report({
					increment: 100 / totalUpdates
				});
			}
			if (error.metadata) {
				const { metadata } = error;
				if ((update.productName === updates.ProductNames.AppcInstaller || update.productName === updates.ProductNames.Node) && metadata.errorCode === 'EACCES') {
					const runWithSudo = await vscode.window.showErrorMessage(`Failed to update to ${label} as it must be ran with sudo`, {
						title: 'Install with Sudo'
					});
					if (runWithSudo) {
						await executeAsTask(metadata.command, update.productName);
					}
				}
			} else {
				// TODO should we show the error that we got passed?
				await vscode.window.showErrorMessage(`Failed to update to ${label}`);
			}
		}
		counter++;
	}
}
