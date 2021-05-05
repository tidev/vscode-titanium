import { handleInteractionError, InteractionChoice, InteractionError, registerCommand } from '../commands';
import * as vscode from 'vscode';
import { Project } from '../project';
import { completion, updates } from 'titanium-editor-commons';
import appc from '../appc';
import * as path from 'path';

// Import the various providers
import { CompletionsFormat } from './completion/baseCompletionItemProvider';
import { ControllerCompletionItemProvider } from './completion/controllerCompletionItemProvider';
import { StyleCompletionItemProvider } from './completion/styleCompletionItemProvider';
import { TiappCompletionItemProvider } from './completion/tiappCompletionItemProvider';
import { ViewCompletionItemProvider } from './completion/viewCompletionItemProvider';
import { ControllerDefinitionProvider } from './definition/controllerDefinitionProvider';
import { insert, insertCommandId, insertI18nString, insertI18nStringCommandId } from './definition/definitionProviderHelper';
import { StyleDefinitionProvider } from './definition/styleDefinitionProvider';
import { ViewCodeActionProvider } from './definition/viewCodeActionProvider';
import { ViewDefinitionProvider } from './definition/viewDefinitionProvider';
import { ViewHoverProvider } from './definition/viewHoverProvider';

const viewFilePattern = '**/app/{views,widgets}/**/*.xml';
const styleFilePattern = '**/*.tss';
const controllerFilePattern = '{**/app/controllers/**/*.js,**/app/lib/**/*.js,**/app/widgets/**/*.js,**/app/alloy.js}';

export function registerProviders(context: vscode.ExtensionContext): void {

	// register completion providers
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewCompletionItemProvider(), '.', '\'', '"'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: styleFilePattern }, new StyleCompletionItemProvider(), '.', '\'', '"'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: controllerFilePattern }, new ControllerCompletionItemProvider(), '.', '\'', '"', '/'),
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: '**/tiapp.xml' }, new TiappCompletionItemProvider(), '.')
	);

	// register hover providers
	context.subscriptions.push(
		vscode.languages.registerHoverProvider({ scheme: 'file', pattern: '**/{*.xml,*.tss,*.js}' }, new ViewHoverProvider()),
	);

	// register definition providers
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewDefinitionProvider()),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: styleFilePattern }, new StyleDefinitionProvider()),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', pattern: controllerFilePattern }, new ControllerDefinitionProvider())
	);

	// register code action providers
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewCodeActionProvider())
	);

	// register code action commands
	registerCommand(insertCommandId, insert);
	registerCommand(insertI18nStringCommandId, insertI18nString);
}

/**
* Generate Alloy and Titanium SDK Completion files
*
* @param {boolean} [force=false] generate the completions even if they exist
* @param {Project} project - The Titanium project instance
*/
export async function generateCompletions (force = false, project: Project): Promise<void> {
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
					const file = path.join(project.filePath, 'tiapp.xml');
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
					const file = path.join(project.filePath, 'tiapp.xml');
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
			completion.generateAlloyCompletions(force, CompletionsFormat),
			completion.generateSDKCompletions(force, sdkVersion, sdkPath, CompletionsFormat)
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
							await generateCompletions(force, project);
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
