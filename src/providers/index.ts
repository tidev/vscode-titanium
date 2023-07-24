import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { Commands, handleInteractionError, InteractionChoice, InteractionError, registerCommand } from '../commands';
import { Project } from '../project';
import { completion, updates, Errors } from 'titanium-editor-commons';

// Import the various providers
import { CompletionsFormat } from './completion/baseCompletionItemProvider';
import { ControllerCompletionItemProvider } from './completion/controllerCompletionItemProvider';
import { StyleCompletionItemProvider } from './completion/styleCompletionItemProvider';
import { TiappCompletionItemProvider } from './completion/tiappCompletionItemProvider';
import { ViewCompletionItemProvider } from './completion/viewCompletionItemProvider';
import { ControllerDefinitionProvider } from './definition/controllerDefinitionProvider';
import { StyleDefinitionProvider } from './definition/styleDefinitionProvider';
import { ViewCodeActionProvider } from './code-action/viewCodeActionProvider';
import { ViewDefinitionProvider } from './definition/viewDefinitionProvider';
import { ViewHoverProvider } from './hover/viewHoverProvider';
import { ExtensionContainer } from '../container';
import { TiTerminalLinkProvider } from './terminalLinkProvider';

const viewFilePattern = '**/app/{views,widgets}/**/*.xml';
const styleFilePattern = '**/*.tss';
const controllerFilePattern = '{**/app/controllers/**/*.js,**/app/lib/**/*.js,**/app/widgets/**/*.js,**/app/alloy.js}';

export function registerProviders(context: vscode.ExtensionContext): void {

	// register completion providers
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider({ scheme: 'file', pattern: viewFilePattern }, new ViewCompletionItemProvider(), '.', '\'', '"', '/'),
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

	// register our TerminalLink provider
	context.subscriptions.push(
		vscode.window.registerTerminalLinkProvider(new TiTerminalLinkProvider())
	);

	// register code action commands
	registerCommand(Commands.InsertCommandId, async (text: string, filePath: string) => {
		const document = await vscode.workspace.openTextDocument(filePath);
		const position = new vscode.Position(document.lineCount, 0);
		if (document.lineAt(position.line - 1).text.trim().length) {
			text = `\n${text}`;
		}
		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscode.Uri.file(filePath), position, text);
		vscode.workspace.applyEdit(edit);
	});

	registerCommand(Commands.InsertI18nStringCommandId, async (text: string, project: Project) => {
		const defaultLang = ExtensionContainer.config.project.defaultI18nLanguage;
		const i18nPath = await project.getI18NPath();
		if (!i18nPath) {
			return;
		}
		const i18nStringPath = path.join(i18nPath, defaultLang, 'strings.xml');
		if (!await fs.pathExists(i18nStringPath)) {
			fs.ensureDirSync(path.join(i18nPath, defaultLang));
			fs.writeFileSync(i18nStringPath, '<?xml version="1.0" encoding="UTF-8"?>\n<resources>\n</resources>');
		}
		const document = await vscode.workspace.openTextDocument(i18nStringPath);
		const insertText = `\t<string name="${text}"></string>\n`;
		const index = document.getText().indexOf('<\/resources>'); // eslint-disable-line no-useless-escape
		if (index !== -1) {
			const position = document.positionAt(index);
			const edit = new vscode.WorkspaceEdit();
			edit.insert(vscode.Uri.file(i18nStringPath), position, insertText);
			vscode.workspace.applyEdit(edit);
		}
	});
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
		const sdkInfo = ExtensionContainer.environment.sdkInfo(sdkVersion);
		if (!sdkInfo) {
			// TODO
			return;
		}
		const sdkPath = sdkInfo.path;
		// Generate the completions
		await Promise.all([
			completion.generateAlloyCompletions(force, CompletionsFormat),
			completion.generateSDKCompletions(force, sdkVersion, sdkPath, CompletionsFormat)
		]);
	} catch (error) {
		const actions: InteractionChoice[] = [];
		if (error instanceof Errors.CustomError && error.code === 'ESDKNOTINSTALLED') {
			actions.push({
				title: 'Install',
				run: () => {
					vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Titanium SDK Installation', cancellable: false }, async () => {
						try {
							await updates.titanium.sdk.installUpdate(sdkVersion as string);
							await ExtensionContainer.environment.getInfo();
							await generateCompletions(force, project);
						} catch (err) {
							return Promise.reject(err);
						}
					});
				}
			});
		}
		const message = error instanceof Error ? error.message : '';
		const install = await vscode.window.showErrorMessage(`Error generating autocomplete suggestions. ${message}`, ...actions);
		if (install) {
			await install.run();
		}
	}
}
