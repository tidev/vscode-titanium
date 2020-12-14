import { registerCommand } from '../commands';
import * as vscode from 'vscode';
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
