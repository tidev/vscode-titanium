import * as utils from '../utils';

import { pathExists, ensureDir } from 'fs-extra';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { InputBoxOptions, QuickPickItem, QuickPickOptions, Uri, window } from 'vscode';
import { UserCancellation } from '../commands/common';
import { ExtensionContainer } from '../container';
import { UpdateChoice } from '../types/common';

export interface CustomQuickPick extends QuickPickItem {
	label: string;
	id: string;
	udid?: string;
	version?: string;
	uuid?: string;
}

export async function inputBox (options: InputBoxOptions): Promise<string> {
	const input = await window.showInputBox(options);

	if (input !== undefined) {
		return input;
	}
	throw new UserCancellation();
}

export async function enterPassword (options: InputBoxOptions): Promise<string> {
	if (!options.password) {
		options.password = true;
	}

	if (!options.placeHolder) {
		options.placeHolder = 'Enter your password';
	}
	return inputBox(options);
}

export async function yesNoQuestion (options: QuickPickOptions, shouldThrow = false, itemChoices: string[] = [ 'Yes', 'No' ]): Promise<boolean> {
	const response = await window.showQuickPick(itemChoices, options);
	if (response?.toLowerCase() !== 'yes' && response?.toLowerCase() !== 'y') {
		if (shouldThrow) {
			throw new UserCancellation();
		} else {
			return false;
		}
	} else {
		return true;
	}
}

export async function quickPick (items: CustomQuickPick[], quickPickOptions: QuickPickOptions & { canPickMany: true }, customQuickPickOptions?: { forceShow: boolean }): Promise<CustomQuickPick[]>;
export async function quickPick (items: CustomQuickPick[], quickPickOptions?: QuickPickOptions, customQuickPickOptions?: { forceShow: boolean }): Promise<CustomQuickPick>;
export async function quickPick (items: string[], quickPickOptions?: QuickPickOptions, customQuickPickOptions?: { forceShow: boolean }): Promise<string>;
export async function quickPick<T extends QuickPickItem> (items: T[], quickPickOptions?: QuickPickOptions, { forceShow = false } = {}): Promise<T> {
	if (items.length === 1 && !forceShow) {
		return items[0];
	}
	const result = await window.showQuickPick(items, quickPickOptions);
	if (!result) {
		throw new UserCancellation();
	}
	return result;
}

export function selectPlatform (lastBuildDescription?: string, filter?: (platform: string) => boolean): Promise<{id: string; label: string}> {
	const platforms = utils.platforms().filter(filter ? filter : (): boolean => true).map(platform => ({ label: utils.nameForPlatform(platform) as string, id: platform }));
	if (lastBuildDescription) {
		platforms.unshift({
			label: `Last: ${lastBuildDescription}`,
			id: 'last'
		});
	}
	return quickPick(platforms);
}

export async function selectCreationLocation (lastUsed?: string): Promise<Uri> {
	const defaultPath = await ExtensionContainer.config.general.defaultCreationDirectory;
	const items = [
		{
			label: 'Browse for directory',
			id: 'browse'
		}
	];

	if (defaultPath) {
		items.push({
			label: `Use default ${defaultPath}`,
			id: 'default'
		});
	}

	if (lastUsed && lastUsed !== defaultPath) {
		items.push({
			label: `Last used ${lastUsed}`,
			id: 'last'
		});
	}

	const directory = await quickPick(items, { placeHolder: 'Select where to create your project' }, { forceShow: true });

	if (directory.id === 'browse') {
		const filePath = await window.showOpenDialog({ canSelectMany: false, canSelectFolders: true });
		if (!filePath) {
			throw new UserCancellation();
		}
		return filePath[0];
	} else if (lastUsed && directory.id === 'last') {
		return Uri.file(lastUsed);
	} else if (defaultPath && directory.id === 'default') {
		if (!await pathExists(defaultPath)) {
			await ensureDir(defaultPath);
		}
		return Uri.file(defaultPath);
	} else if (directory.id === 'enter') {
		const directory = await inputBox({ placeHolder: 'Enter your path' });
		if (!await pathExists(directory)) {
			throw new Error(`${directory} does not exist`);
		}
		return Uri.file(directory);
	} else {
		throw new Error('No directory was selected');
	}
}

export async function selectUpdates (updates: UpdateInfo[]): Promise<UpdateChoice[]> {
	const choices: UpdateChoice[] = updates
		.map(update => ({
			label: `${update.productName}: ${update.latestVersion}`,
			action: update.action,
			latestVersion: update.latestVersion,
			priority: update.priority,
			picked: true,
			productName: update.productName,
			id: update.productName,
			currentVersion: update.currentVersion
		})
		);

	const selected = await quickPick(choices, {
		canPickMany: true,
		placeHolder: 'Which updates would you like to install?'
	}, {
		forceShow: true
	});

	if (!selected) {
		throw new UserCancellation();
	}

	return choices as UpdateChoice[];
}
