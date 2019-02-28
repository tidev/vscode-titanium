
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
	Commands,
	createApplication,
	createModule,
	generateComponent,
	generateModel,
	packageApplication
} from './commands';
import { GlobalState, VSCodeCommands } from './constants';
import { ExtensionContainer } from './container';

import * as completionItemProviderHelper from './providers/completion/completionItemProviderHelper';
import { ControllerCompletionItemProvider } from './providers/completion/controllerCompletionItemProvider';
import { StyleCompletionItemProvider } from './providers/completion/styleCompletionItemProvider';
import { TiappCompletionItemProvider } from './providers/completion/tiappCompletionItemProvider';
import { ViewCompletionItemProvider } from './providers/completion/viewCompletionItemProvider';

import { Config, Configuration, configuration } from './configuration';
import { ControllerDefinitionProvider } from './providers/definition/controllerDefinitionProvider';
import * as definitionProviderHelper from './providers/definition/definitionProviderHelper';
import { StyleDefinitionProvider } from './providers/definition/styleDefinitionProvider';
import { ViewCodeActionProvider } from './providers/definition/viewCodeActionProvider';
import { ViewDefinitionProvider } from './providers/definition/viewDefinitionProvider';
import { ViewHoverProvider } from './providers/definition/viewHoverProvider';

let projectStatusBarItem;
/**
 * Activate
 *
 * @param {Object} context 	extension context
 */
function activate (context) {

	Configuration.configure(context);

	const config = configuration.get<Config>();

	ExtensionContainer.inititalize(context, config);
	project.load();
	// definitionProviderHelper.activate(context.subscriptions);

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
	context.subscriptions.push(
		// register completion providers
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewCompletionItemProvider(), '.', '\'', '"'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: styleFilePattern }, new StyleCompletionItemProvider()),
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
		vscode.commands.registerCommand(Commands.BuildApp, node => {

			if (project.isTitaniumApp) {
				return buildApplication(node);
			} else if (project.isTitaniumModule) {
				return buildModule(node);
			}
		}),

		// register distribute command
		vscode.commands.registerCommand(Commands.PackageApp, packageApplication),

		// register stop command
		vscode.commands.registerCommand(Commands.StopBuild, () => {
			if (vscode.workspace.getConfiguration('titanium.general').get('useTerminalForBuild')) {
				ExtensionContainer.terminal.clear();
			} else {
				appc.stop();
			}
		}),

		// register set log level command
		vscode.commands.registerCommand(Commands.SetLogLevel, async () => {
			const level = await vscode.window.showQuickPick([ 'Trace', 'Debug', 'Info', 'Warn', 'Error' ], { placeHolder: 'Select log level' });
			if (level) {
				ExtensionContainer.context.globalState.update('logLevel', level.toLowerCase());
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
			await generateCompletions({ force: true });
		}),

		vscode.commands.registerCommand(Commands.OpenAppOnDashboard, () => {
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(project.dashboardUrl()));
		}),

		vscode.window.registerTreeDataProvider('titaniumExplorer', deviceExplorer),

		vscode.commands.registerCommand(Commands.RefreshExplorer, () => {
			deviceExplorer.refresh();
		}),

		vscode.commands.registerCommand(Commands.EnableLiveView, async () => {
			await ExtensionContainer.context.globalState.update('titanium:liveview', true);
			await vscode.commands.executeCommand('setContext', 'titanium:liveview', true);
			vscode.window.showInformationMessage('Enabled LiveView');
		}),

		vscode.commands.registerCommand(Commands.DisableLiveView, async () => {
			await ExtensionContainer.context.globalState.update('titanium:liveview', false);
			await vscode.commands.executeCommand('setContext', 'titanium:liveview', false);
			vscode.window.showInformationMessage('Disabled LiveView');
		}),

		vscode.commands.registerCommand(Commands.GenerateAlloyController, () => generateComponent(AlloyComponentType.Controller, AlloyComponentFolder.Controller, AlloyComponentExtension.Controller)),

		vscode.commands.registerCommand(Commands.GenerateAlloyMigration, () => generateComponent(AlloyComponentType.Migration, AlloyComponentFolder.Migration, AlloyComponentExtension.Migration)),

		vscode.commands.registerCommand(Commands.GenerateAlloyModel, generateModel),

		vscode.commands.registerCommand(Commands.GenerateAlloyStyle, () => generateComponent(AlloyComponentType.Style, AlloyComponentFolder.Style, AlloyComponentExtension.Style)),

		vscode.commands.registerCommand(Commands.GenerateAlloyView, () => generateComponent(AlloyComponentType.View, AlloyComponentFolder.View, AlloyComponentExtension.View)),

		vscode.commands.registerCommand(Commands.GenerateAlloyWidget, () => generateComponent(AlloyComponentType.Widget, AlloyComponentFolder.Widget, AlloyComponentExtension.Widget)),

		vscode.commands.registerCommand(Commands.CreateApp, createApplication),

		vscode.commands.registerCommand(Commands.CreateModule, createModule)

	);

	return init();
}
exports.activate = activate; // eslint-disable-line no-undef

/**
 * Deactivate
 */
function deactivate () {
	project.dispose();
}
exports.deactivate = deactivate;  // eslint-disable-line no-undef

/**
 * Initialise extension - fetch appc info
 */
async function init () {
	const isEnabled = await ExtensionContainer.context.globalState.get<boolean>(GlobalState.Enabled);
	if (isEnabled) {
		vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Reading Appcelerator environment ...' }, async progress => {
			if (await ExtensionContainer.context.globalState.get('titanium:liveview')) {
				await vscode.commands.executeCommand('setContext', 'titanium:liveview', true);
			}
			appc.getInfo(async (error, info) => {
				if (error) {
					vscode.window.showErrorMessage('Error fetching Appcelerator environment');
					return;
				}
				if (project.isTitaniumApp) {
					await generateCompletions({ progress });
				}
				// Call refresh incase the Titanium Explorer activity pane became active before info
				await vscode.commands.executeCommand(Commands.RefreshExplorer);

			});
		});
	}

}

/**
 * Set project name and link to dashboard in status bar
 */
function setStatusBar () {
	if (!projectStatusBarItem) {
		projectStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
	}
	if (project.isTitaniumApp) {
		projectStatusBarItem.text = `$(device-mobile)  ${project.appName()} (${project.sdk()})`;
		if (project.dashboardUrl()) {
			projectStatusBarItem.command = Commands.OpenAppOnDashboard;
			projectStatusBarItem.tooltip = 'Open Axway Dashboard';
		} else {
			projectStatusBarItem.comand = null;
			projectStatusBarItem.tooltip = null;
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
 * @param {Object} opts - Options
 * @param {Object} progress - Progress reporter.
 */
async function generateCompletions ({ force = false, progress = null } = {}) {
	try {
		const sdkVersion = project.sdk()[0];
		if (!sdkVersion) {
			// handle?
		}
		// Generate the completions
		const [ alloy, sdk ] = await Promise.all([
			completionItemProviderHelper.generateAlloyCompletions({ force, progress }),
			completionItemProviderHelper.generateSDKCompletions({ force, progress, sdkVersion })
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
		vscode.window.showErrorMessage(`Error generating autocomplete suggestions. ${error.message}`);
	}
}
