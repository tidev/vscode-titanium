import * as utils from '../utils';

import { pathExists, ensureDir } from 'fs-extra';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { InputBoxOptions, QuickPickItem, QuickPickOptions, Uri, window } from 'vscode';
import { UserCancellation } from '../commands/common';
import { ExtensionContainer } from '../container';

export interface CustomQuickPick extends QuickPickItem {
	label: string;
	id: string;
	udid?: string;
	version?: string;
	uuid?: string;
}

interface CustomQuickPickOptions {
	forceShow: boolean;
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

export async function quickPick(items: string[], quickPickOptions: QuickPickOptions & { canPickMany: true }, customQuickPickOptions?: CustomQuickPickOptions): Promise<string[]>;
export async function quickPick(items: CustomQuickPick[], quickPickOptions?: QuickPickOptions & { canPickMany: true }, customQuickPickOptions?: CustomQuickPickOptions): Promise<CustomQuickPick[]>;
export async function quickPick(items: string[], quickPickOptions?: QuickPickOptions, customQuickPickOptions?: CustomQuickPickOptions): Promise<string>;
export async function quickPick(items: CustomQuickPick[], quickPickOptions?: QuickPickOptions, customQuickPickOptions?: CustomQuickPickOptions): Promise<CustomQuickPick>;
export async function quickPick<T extends CustomQuickPick>(items: T[], quickPickOptions: QuickPickOptions & { canPickMany: true }, customQuickPickOptions?: CustomQuickPickOptions): Promise<T[]>;
export async function quickPick<T extends CustomQuickPick>(items: T[], quickPickOptions?: QuickPickOptions, customQuickPickOptions?: CustomQuickPickOptions): Promise<T>;
export async function quickPick<T extends CustomQuickPick> (items: T[], quickPickOptions?: QuickPickOptions, { forceShow = false } = {}): Promise<T|T[]> {
	if (items.length === 1 && !forceShow) {
		// If canPickMany is set to true then we should return the items array as the caller will
		// expect an array return type
		return  quickPickOptions?.canPickMany ? items : items[0];
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

export async function selectUpdates (updates: UpdateInfo[]): Promise<UpdateInfo[]> {
	const choices = updates
		.map(update => ({
			id: update.productName,
			label: `${update.productName}: ${update.latestVersion}`,
			picked: true
		}));

	const selected = await quickPick(choices, {
		canPickMany: true,
		placeHolder: 'Which updates would you like to install?'
	}, {
		forceShow: true,
	});

	if (!selected) {
		throw new UserCancellation();
	}

	const selectedProducts = selected.map(product => product.id);

	return updates.filter(update => {
		return selectedProducts.includes(update.productName);
	});
}
