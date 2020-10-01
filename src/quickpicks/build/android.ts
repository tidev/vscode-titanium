import * as path from 'path';
import * as vscode from 'vscode';
import appc from '../../appc';
import { enterPassword, inputBox, quickPick } from '../common';
import { UserCancellation } from '../../commands';
import { pathExists } from 'fs-extra';
import { ExtensionContainer } from '../../container';
import { KeystoreInfo } from '../../types/common';
import { deviceQuickPick, DeviceQuickPickItem } from './common';
import { WorkspaceState } from '../../constants';

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

async function resolveKeystorePath (keystorePath: string, folder: vscode.WorkspaceFolder): Promise<string> {
	if (path.isAbsolute(keystorePath) && await pathExists(keystorePath)) {
		return keystorePath;
	}

	const resolvedPath = path.resolve(folder.uri.fsPath, keystorePath);

	if (await pathExists(resolvedPath)) {
		return resolvedPath;
	}

	throw new Error(`Provided keystorePath value "${keystorePath}" does not exist`);
}

async function verifyKeystorePath (keystorePath: string|undefined, folder: vscode.WorkspaceFolder): Promise<string> {
	if (!keystorePath) {
		throw new Error('Expected a value for keystorePath');
	}

	const resolvedPath = await resolveKeystorePath(keystorePath, folder);

	return resolvedPath;
}

export async function enterAndroidKeystoreInfo (workspaceFolder: vscode.WorkspaceFolder, keystoreInfo: Partial<KeystoreInfo> = {}): Promise<KeystoreInfo> {

	const lastUsed = ExtensionContainer.context.workspaceState.get<string>(WorkspaceState.LastKeystorePath);
	const savedKeystorePath = ExtensionContainer.config.android.keystorePath;

	if (!keystoreInfo?.location) {
		keystoreInfo.location = await selectAndroidKeystore(lastUsed, savedKeystorePath);
	}

	await verifyKeystorePath(keystoreInfo.location, workspaceFolder);

	if (!keystoreInfo.alias) {
		keystoreInfo.alias = await inputBox({ placeHolder: 'Enter your keystore alias', value: ExtensionContainer.config.android.keystoreAlias || '' });
	}

	if (!keystoreInfo.password) {
		keystoreInfo.password = await enterPassword({ placeHolder: 'Enter your keystore password' });
	}

	if (!keystoreInfo.privateKeyPassword) {
		keystoreInfo.privateKeyPassword = await enterPassword({ placeHolder: 'Enter your keystore private key password (optional)' });
	}

	ExtensionContainer.context.workspaceState.update(WorkspaceState.LastKeystorePath, keystoreInfo.location);

	return keystoreInfo as KeystoreInfo;
}
