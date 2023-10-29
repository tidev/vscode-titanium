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
import { inputBox, quickPick } from '../quickpicks';
import { getRelatedFiles } from './definition/common';

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

	registerCommand(Commands.ExtractStyle, async (document: vscode.TextDocument, selection: vscode.Range|vscode.Selection, project: Project) => {
		let contents;
		let isSelection = true;
		// First try and extract the selected text if its a selection
		if ((selection as vscode.Selection).anchor) {
			contents = document.getText(new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character));
		}

		if (!contents) {
			isSelection = false;
			contents = document.lineAt(selection.start.line).text;
		}

		const lineMatches = contents.match(/(\s+)?(?:<(\w+))?((?:\s*[\w.]+="(?:\$\.\args\.[\w./%]+|[\w./%]+)")+)\s*(?:(\/>|>(?:.*<\/\w+>)?)?)/);
		if (!lineMatches) {
			return;
		}
		const [ , spaces, tag, propertiesString, endingTag ] = lineMatches;

		const properties: Record<string, string|number|Record<string, string|number>> = {};
		const persistProperties: Record<string, string> = {};
		for (const property of propertiesString.replace(/\s+/g, ' ').trim().split(' ')) {
			const [ name, value ] = property.split('=');
			if (/^(?:on|id|class|platform|ns)/.test(name)) {
				persistProperties[name] = value;
				continue;
			}

			let cleanValue;
			if (!isNaN(Number(value))) {
				cleanValue = Number(value);
			} else {
				cleanValue = value.replaceAll('"', '');
			}

			if (name.includes('.')) {
				const [ parent, child ] = name.split('.');
				if (!properties[parent]) {
					properties[parent] = {};
				}

				(properties[parent] as Record<string, string|number>)[child] = cleanValue;
			} else {
				properties[name] = cleanValue;
			}

		}
		let styleName;
		const extractChoices = [ 'class', 'id' ];
		if (tag) {
			extractChoices.push('tag');
		}

		const tssFilePath = (await getRelatedFiles(project, 'tss', false))[0];
		const tssDocument = await vscode.workspace.openTextDocument(tssFilePath);
		const extractType = await quickPick(extractChoices, { placeHolder: 'Choose style' });
		if (extractType === 'class' || extractType === 'id') {
			const name = await inputBox({ prompt: `Enter the name for your ${extractType}`,
				validateInput: (value) => {
					const prefix = extractType === 'class' ? '.' : '#';
					if (tssDocument.getText().includes(`"${prefix}${value}"`)) {
						return `The ${extractType} value already exists in the tss`;
					}
				}
			});
			const prefix = extractType === 'class' ? '.' : '#';
			styleName = `${prefix}${name}`;

			// handle merging classes if one already exists
			if (extractType === 'class' && persistProperties.class) {
				persistProperties.class = `"${persistProperties.class.replaceAll('"', '')} ${name}"`;
			} else {
				persistProperties[extractType] = `"${name}"`;
			}
		} else {
			styleName = tag;
		}

		let quoteType = '"';
		if (tssDocument.getText().includes('\'')) {
			quoteType = '\'';
		}

		let styleString = `\n${quoteType}${styleName}${quoteType}: {`;
		for (const [ name, value ] of Object.entries(properties)) {
			if (typeof value === 'string') {
				styleString = `${styleString}\n\t${name}: ${wrapValue(value, quoteType)}`;
			} else {
				let subObject = `\n\t${name}: {`;
				for (const [ subName, subValue ] of Object.entries(value)) {
					subObject = `${subObject}\n\t\t${subName}: ${wrapValue(subValue, quoteType)}`;
				}
				subObject = `${subObject}\n\t}`;
				styleString = `${styleString}${subObject}`;
			}
		}

		styleString = `${styleString}\n}`;

		const position = new vscode.Position(tssDocument.lineCount, 0);
		if (tssDocument.lineAt(position.line - 1).text.trim().length) {
			styleString = `\n${styleString}`;
		}
		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscode.Uri.file(tssFilePath), position, styleString);

		const newPropertiesString = Object.entries(persistProperties).map(([ name, value ]) => `${name}=${value}`).join(' ');
		let newLine = '';
		if (tag) {
			newLine += `<${tag} `;
		}

		newLine += newPropertiesString;

		if (endingTag) {
			newLine += ` ${endingTag}`;
		}

		let replaceRange;
		if (isSelection) {
			replaceRange = new vscode.Range(selection.start.line, selection.start.character, selection.start.line, selection.end.character);
		} else {
			newLine = `${spaces}${newLine}`;
			replaceRange = new vscode.Range(selection.start.line, 0, selection.start.line, contents.length);
		}

		edit.replace(vscode.Uri.file(document.uri.fsPath), replaceRange, newLine);
		vscode.workspace.applyEdit(edit, { isRefactoring: true });
	});
}

function wrapValue(value: string|number, quote: string) {
	if (typeof value !== 'string' || (value.startsWith('Alloy.') || value.startsWith('Ti.') || value.startsWith('Titanium.') || value.startsWith('$.args.') || !isNaN(Number(value)))) {
		return value;
	} else {
		return `${quote}${value}${quote}`;
	}
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
