import { MessageOptions, window } from 'vscode';
import { ExtensionContainer } from '../container';

export interface InteractionChoice {
	title: string;
	run (): void;
}

export enum Commands {
	Build = 'titanium.build.run',
	CheckForUpdates = 'titanium.updates.checkAll',
	Clean = 'titanium.clean',
	CreateApp = 'titanium.create.application',
	CreateModule = 'titanium.create.module',
	Debug = 'titanium.build.debug',
	DisableLiveView = 'titanium.build.setLiveViewDisabled',
	EnableLiveView = 'titanium.build.setLiveViewEnabled',
	GenerateAlloyController = 'titanium.alloy.generate.controller',
	GenerateAlloyMigration = 'titanium.alloy.generate.migration',
	GenerateAlloyModel = 'titanium.alloy.generate.model',
	GenerateAlloyStyle = 'titanium.alloy.generate.style',
	GenerateAlloyView = 'titanium.alloy.generate.view',
	GenerateAlloyWidget = 'titanium.alloy.generate.widget',
	GenerateAutocomplete = 'titanium.generate.autocompleteSuggestions',
	InstallAllUpdates = 'titanium.updates.installAll',
	InstallUpdate = 'titanium.updates.install',
	OpenAllRelatedFiles = 'titanium.alloy.open.allRelatedFiles',
	OpenRelatedController = 'titanium.alloy.open.relatedController',
	OpenRelatedStyle = 'titanium.alloy.open.relatedStyle',
	OpenRelatedView = 'titanium.alloy.open.relatedView',
	OpenReleaseNotes = 'titanium.updates.openReleaseNotes',
	OpenUrl = 'titanium.openUrl',
	Package = 'titanium.package.run',
	RefreshExplorer = 'titanium.explorer.refresh',
	RefreshUpdates = 'titanium.updateExplorer.refresh',
	SelectUpdates = 'titanium.updates.select',
	SetLogLevel = 'titanium.build.setLogLevel',
	StopBuild = 'titanium.build.stop',
	ShowUpdatesView = 'titanium.view.updateExplorer.focus',
}

export class UserCancellation extends Error {
	constructor () {
		super('User cancelled');
	}
}

export class InteractionError extends Error {
	public messageOptions: MessageOptions = { modal: false };
	public interactionChoices: InteractionChoice[] = [];
}

/**
 * Check Appcelerator login and prompt if necessary.
 */
export function checkLogin (): void {
	if (!ExtensionContainer.appc.isUserLoggedIn()) {
		window.showInformationMessage('Please log in to the Appcelerator platform');
		const error = new InteractionError('You are not logged in. Please log in to continue');
		error.messageOptions = {
			modal: true
		};
		error.interactionChoices.push({
			title: 'Login',
			run: () => {
				ExtensionContainer.terminal.runCommand([ 'login' ], { forceTerminal: true });
			}
		});
		throw error;
	}
}

export async function handleInteractionError (error: InteractionError): Promise<void> {
	const actionToTake = await window.showErrorMessage(error.message, error.messageOptions, ...error.interactionChoices);
	if (actionToTake) {
		actionToTake.run();
	}
}
