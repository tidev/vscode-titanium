import * as path from 'path';
import * as vscode from 'vscode';
import appc from '../../appc';
import { enterPassword, inputBox, quickPick } from '../common';
import { InteractionError, UserCancellation } from '../../commands';
import { pathExists } from 'fs-extra';
import { ExtensionContainer } from '../../container';
import { KeystoreInfo } from '../../types/common';
import { deviceQuickPick, DeviceQuickPickItem } from './common';

export function selectAndroidDevice (): Promise<DeviceQuickPickItem> {
	const devices = appc.androidDevices().map(({ id, name }: { id: string; name: string }) => ({ id, label: name, udid: id }));
	return deviceQuickPick(devices, { placeHolder: 'Select Android device' });
}

export function selectAndroidEmulator (): Promise<DeviceQuickPickItem>  {
	const emulators = appc.androidEmulators();
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

	return deviceQuickPick(options, { placeHolder: 'Select emulator' });
}

export async function selectAndroidKeystore (lastUsed?: string, savedKeystorePath?: string): Promise<string|undefined> {
	const items = [ {
		label: 'Browse for keystore',
		id: 'browse'
	} ];
	if (lastUsed) {
		items.push({
			label: `Last used ${lastUsed}`,
			id: 'last'
		});
	}
	if (savedKeystorePath) {
		items.push({
			label: `Saved ${savedKeystorePath}`,
			id: 'saved'
		});
	}
	const keystoreAction = await quickPick(items, { placeHolder: 'Browse for keystore or use last keystore' });
	if (keystoreAction.id === 'browse') {
		const uri = await vscode.window.showOpenDialog({ canSelectFolders: false, canSelectMany: false });
		if (!uri) {
			throw new UserCancellation();
		}
		return uri[0].path;
	} else if (savedKeystorePath && keystoreAction.id === 'saved') {
		if (!path.isAbsolute(savedKeystorePath)) {
			savedKeystorePath = path.resolve(vscode.workspace.rootPath!, savedKeystorePath);
		}
		return savedKeystorePath;
	} else if (lastUsed) {
		return lastUsed;
	}
}

export async function enterAndroidKeystoreInfo (lastUsed?: string, savedKeystorePath?: string): Promise<KeystoreInfo> {
	const location = await selectAndroidKeystore(lastUsed, savedKeystorePath);

	if (!location || !await pathExists(location)) {
		throw new InteractionError(`The Keystore file ${location} does not exist`);
	}
	const alias = await inputBox({ placeHolder: 'Enter your keystore alias', value: ExtensionContainer.config.android.keystoreAlias || '' });
	const password = await enterPassword({ placeHolder: 'Enter your keystore password' });
	const privateKeyPassword = await enterPassword({ placeHolder: 'Enter your keystore private key password (optional)' });

	return {
		alias,
		location,
		password,
		privateKeyPassword
	};
}
