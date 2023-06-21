import * as path from 'path';
import * as vscode from 'vscode';
import { enterPassword, inputBox, quickPick, yesNoQuestion } from '../common';
import { UserCancellation } from '../../commands';
import { pathExists } from 'fs-extra';
import { ExtensionContainer } from '../../container';
import { KeystoreInfo } from '../../types/common';
import { deviceQuickPick, DeviceQuickPickItem } from './common';
import { WorkspaceState } from '../../constants';
import { createKeystore } from '../../commands/createKeystore';

export function selectAndroidDevice (): Promise<DeviceQuickPickItem> {
	const devices = ExtensionContainer.environment.androidDevices().map(({ id, name }: { id: string; name: string }) => ({ id, label: name, udid: id }));
	return deviceQuickPick(devices, { placeHolder: vscode.l10n.t('Select Android device') });
}

export function selectAndroidEmulator (): Promise<DeviceQuickPickItem>  {
	const emulators = ExtensionContainer.environment.androidEmulators();
	const options = [];

	for (const emulator of emulators.AVDs) {
		options.push({
			id: emulator.id,
			udid: emulator.id,
			label: emulator.name
		});
	}

	for (const emulator of emulators.Genymotion) {
		options.push({
			id: emulator.id,
			udid: emulator.id,
			label: emulator.name
		});
	}

	return deviceQuickPick(options, { placeHolder: vscode.l10n.t('Select emulator') });
}

export async function selectAndroidKeystore (workspaceFolder: vscode.WorkspaceFolder, lastUsed?: string, savedKeystorePath?: string): Promise<string|KeystoreInfo> {
	const items = [
		{
			label: vscode.l10n.t('Browse for keystore'),
			id: 'browse'
		},
		{
			label: vscode.l10n.t('Create keystore'),
			id: 'create'
		}
	];
	if (lastUsed) {
		items.push({
			label: vscode.l10n.t('Last used {0}', lastUsed),
			id: 'last'
		});
	}
	if (savedKeystorePath) {
		items.push({
			label: vscode.l10n.t('Saved {0}', savedKeystorePath),
			id: 'saved'
		});
	}
	const keystoreAction = await quickPick(items, { placeHolder: vscode.l10n.t('Browse, create, or use last keystore') });
	if (keystoreAction.id === 'browse') {
		const uri = await vscode.window.showOpenDialog({ canSelectFolders: false, canSelectMany: false });
		if (!uri) {
			throw new UserCancellation();
		}
		return uri[0].path;
	} else if (savedKeystorePath && keystoreAction.id === 'saved') {
		if (!path.isAbsolute(savedKeystorePath)) {
			savedKeystorePath = path.resolve(workspaceFolder.uri.fsPath, savedKeystorePath);
		}
		return savedKeystorePath;
	} else if (keystoreAction.id === 'create') {
		return createKeystore();
	} else if (lastUsed) {
		return lastUsed;
	} else {
		throw new Error(vscode.l10n.t('No keystore was selected'));
	}
}

/**
 * Verifies whether there is a keystore at the provided path, if the provided path is not absolute
 * (i.e it may have come from a user defined task) then it will be resolved based on the chosen
 * workspace folder
 *
 * @param {string} keystorePath - The keystore path
 * @param {vscode.WorkspaceFolder} folder - The Workspace folder for the projecy
 * @returns {Promise<string>}
 */
async function resolveKeystorePath (keystorePath: string, folder: vscode.WorkspaceFolder): Promise<string> {
	if (path.isAbsolute(keystorePath) && await pathExists(keystorePath)) {
		return keystorePath;
	}

	const resolvedPath = path.resolve(folder.uri.fsPath, keystorePath);

	if (await pathExists(resolvedPath)) {
		return resolvedPath;
	}

	throw new Error(vscode.l10n.t('Provided keystorePath value "{0}" does not exist', keystorePath));
}

/**
 * Checks to see whether there is information stored for the provided keystore location
 *
 * @param {string} location - The location of the keystore
 * @returns {(Promise<KeystoreInfo|undefined>)}
 */
async function lookupStoredInformation(location: string): Promise<KeystoreInfo|undefined> {
	const information = await ExtensionContainer.context.secrets.get(location);
	if (information) {
		return JSON.parse(information);
	}
}

export async function enterAndroidKeystoreInfo (workspaceFolder: vscode.WorkspaceFolder, keystoreInfo: Partial<KeystoreInfo> = {}): Promise<KeystoreInfo> {

	const lastUsed = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastKeystorePath);
	const savedKeystorePath = ExtensionContainer.config.android.keystorePath;

	if (!keystoreInfo.location) {
		const selectedKeystore = await selectAndroidKeystore(workspaceFolder, lastUsed, savedKeystorePath);
		if (typeof selectedKeystore === 'string') {
			keystoreInfo.location = selectedKeystore;
		} else {
			Object.assign(keystoreInfo, selectedKeystore);
		}
	}

	if (!keystoreInfo.location) {
		throw new Error('No keystore was selected');
	}

	await resolveKeystorePath(keystoreInfo.location, workspaceFolder);

	const storedInformation = await lookupStoredInformation(keystoreInfo.location);

	if (storedInformation) {
		// eslint-disable-next-line promise/catch-or-return
		vscode.window.showInformationMessage(vscode.l10n.t('Using stored information for {0}. If this is unexpected or your build errors, clear this information using the button below', keystoreInfo.location), vscode.l10n.t('Delete Information'))
			.then(async del => {
				if (del) {
					if (!keystoreInfo.location) {
						return vscode.window.showErrorMessage(vscode.l10n.t('No keystore location was provided, so could not delete'));
					}
					await ExtensionContainer.context.secrets.delete(keystoreInfo.location);
					await vscode.window.showInformationMessage(vscode.l10n.t('Deleted stored information for {0}', keystoreInfo.location));
				}
				return;
			});

		Object.assign(keystoreInfo, storedInformation);
	}

	if (!keystoreInfo.alias) {
		keystoreInfo.alias = await inputBox({ placeHolder: vscode.l10n.t('Enter your keystore alias'), value: ExtensionContainer.config.android.keystoreAlias || '' });
	}

	if (!keystoreInfo.password) {
		keystoreInfo.password = await enterPassword({ placeHolder: vscode.l10n.t('Enter your keystore password') });
	}

	if (!keystoreInfo.privateKeyPassword) {
		keystoreInfo.privateKeyPassword = await enterPassword({ placeHolder: vscode.l10n.t('Enter your keystore private key password (optional)') });
	}

	if (!storedInformation) {
		const store = await yesNoQuestion({ placeHolder: vscode.l10n.t('Would you like to store this information?') });

		if (store) {
			ExtensionContainer.context.secrets.store(keystoreInfo.location, JSON.stringify(keystoreInfo));
		}
	}

	ExtensionContainer.context.workspaceState.update(WorkspaceState.LastKeystorePath, keystoreInfo.location);

	return keystoreInfo as KeystoreInfo;
}
