import * as path from 'path';
import appc from '../appc';
import * as utils from '../utils';

import { pathExists } from 'fs-extra';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { InputBoxOptions, OpenDialogOptions, QuickPickItem, QuickPickOptions, Uri, window, workspace } from 'vscode';
import { InteractionError, UserCancellation } from '../commands/common';
import { ExtensionContainer } from '../container';
import { IosCertificateType, UpdateChoice } from '../types/common';

export interface CustomQuickPick extends QuickPickItem {
	label: string;
	id: string;
	udid?: string;
	version?: string;
	uuid?: string;
}

export async function selectFromFileSystem (options: OpenDialogOptions) {
	if (!options.canSelectMany) {
		options.canSelectMany = false;
	}
	const filePath = await window.showOpenDialog(options);
	if (!filePath) {
		throw new UserCancellation();
	}
	return filePath;
}

export async function enterPassword (options: InputBoxOptions) {
	if (!options.password) {
		options.password = true;
	}

	if (!options.placeHolder) {
		options.placeHolder = 'Enter your password';
	}
	return inputBox(options);
}

export async function yesNoQuestion (options: QuickPickOptions, shouldThrow = false) {
	const response = await window.showQuickPick([ 'Yes', 'No' ], options);
	if (response?.toLowerCase() !== 'yes' || response?.toLowerCase() !== 'y') {
		if (shouldThrow) {
			throw new UserCancellation();
		} else {
			return false;
		}
	} else {
		return true;
	}
}

export async function inputBox (options: InputBoxOptions) {
	const input = await window.showInputBox(options);

	if (input !== undefined) {
		return input;
	}
	throw new UserCancellation();
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

export function selectPlatform (lastBuildDescription?: string, filter?: (platform: string) => boolean) {
	const platforms = utils.platforms().filter(filter ? filter : () => true).map(platform => ({ label: utils.nameForPlatform(platform) as string, id: platform }));
	if (lastBuildDescription) {
		platforms.unshift({
			label: `Last: ${lastBuildDescription}`,
			id: 'last'
		});
	}
	return quickPick(platforms);
}

export async function selectCreationLocation (lastUsed?: string) {
	const items = [{
		label: 'Browse for directory',
		id: 'browse'
	}];
	if (lastUsed) {
		items.push({
			label: `Last used ${lastUsed}`,
			id: 'last'
		});
	}
	const directory = await quickPick(items, { placeHolder: 'Browse for directory or use last directory' }, { forceShow: true });
	if (directory.id === 'browse') {
		const filePath = await window.showOpenDialog({ canSelectMany: false, canSelectFolders: true });
		if (!filePath) {
			throw new UserCancellation();
		}
		return filePath[0];
	} else if (lastUsed && directory.id === 'last') {
		return Uri.file(lastUsed);
	}
}

export function selectBuildTarget (platform: string) {
	const targets = utils.targetsForPlatform(platform)
		.filter(target => !/^dist/.test(target))
		.map(target => ({ label: utils.nameForTarget(target), id: target }));
	return quickPick(targets);
}

export function selectDistributionTarget (platform: string) {
	const targets = utils.targetsForPlatform(platform)
		.filter(target => /^dist/.test(target))
		.map(target => ({ label: utils.nameForTarget(target), id: target }));
	return quickPick(targets);
}

export function selectAndroidDevice () {
	const devices = appc.androidDevices().map(({ id, name }: { id: string; name: string }) => ({ id, label: name, udid: id }));
	return quickPick(devices);
}

export function selectAndroidEmulator () {
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

	return quickPick(options, { placeHolder: 'Select emulator' });
}

export async function selectAndroidKeystore (lastUsed?: string, savedKeystorePath?: string) {
	const items = [{
		label: 'Browse for keystore',
		id: 'browse'
	}];
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
		const uri = await window.showOpenDialog({ canSelectFolders: false, canSelectMany: false });
		if (!uri) {
			throw new UserCancellation();
		}
		return uri[0].path;
	} else if (savedKeystorePath && keystoreAction.id === 'saved') {
		if (!path.isAbsolute(savedKeystorePath)) {
			savedKeystorePath = path.resolve(workspace.rootPath!, savedKeystorePath);
		}
		return savedKeystorePath;
	} else {
		return lastUsed;
	}
}

export async function enterAndroidKeystoreInfo (lastUsed?: string, savedKeystorePath?: string) {
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

export function selectiOSCertificate (buildType: string) {
	const certificateType: IosCertificateType = buildType === 'run' ? IosCertificateType.developer : IosCertificateType.distribution;
	const certificates = appc.iOSCertificates(certificateType).map(cert => ({
		description: `Expires: ${new Date(cert.after).toLocaleString('en-US')}`,
		label: cert.fullname,
		pem: cert.pem,
		id: cert.fullname
	}));
	return quickPick(certificates, { placeHolder: 'Select certificate' });
}

export function selectiOSProvisioningProfile (certificate: any, target: string, appId: string) {
	let deployment = 'development';
	if (target === 'dist-adhoc') {
		deployment = 'distribution';
	} else if (target === 'dist-appstore') {
		deployment = 'appstore';
	}
	const profiles = appc.iOSProvisioningProfiles(deployment, certificate, appId).map(({ expirationDate, name, uuid }) => ({
		description: uuid,
		detail: `Expires: ${new Date(expirationDate).toLocaleString('en-US')}`,
		label: name,
		uuid,
		id: uuid
	}));
	return quickPick(profiles, { placeHolder: 'Select provisioning profile' });
}

export async function selectiOSCodeSigning (buildType: string, target: string, appId: string): Promise<{ certificate: CustomQuickPick, provisioningProfile: CustomQuickPick }> {
	const certificate = await selectiOSCertificate(buildType);

	const provisioningProfile = await selectiOSProvisioningProfile(certificate, target, appId);
	return {
		certificate,
		provisioningProfile
	};
}

export function selectiOSDevice () {
	const devices = appc.iOSDevices().map(device => ({ id: device.udid, label: device.name, udid: device.udid }));
	return quickPick(devices, { placeHolder: 'Select device' });
}

export async function selectiOSSimulator (iOSVersion: string) {
	if (!iOSVersion) {
		iOSVersion = (await selectiOSSimulatorVersion()).label;
	}
	const simulators = appc.iOSSimulators()[iOSVersion].map(({ name, udid }) => ({ label: `${name} (${iOSVersion})`, id: udid, udid, version: iOSVersion }));
	return quickPick(simulators, { placeHolder: 'Select simulator'});
}

export function selectiOSSimulatorVersion () {
	const versions = appc.iOSSimulatorVersions().map(version => ({ id: version, label: version }));
	return quickPick(versions, { placeHolder: 'Select simulator version' });
}

export function selectWindowsDevice () {
	const devices = appc.windowsDevices().map(({ name, udid }) => ({ id: udid, label: name, udid }));
	return quickPick(devices, { placeHolder: 'Select device' });
}

export function selectWindowsEmulator () {
	const emulators = appc.windowsEmulators()['10.0'].map(({ name, udid }) => ({ id: udid, label: name, udid }));
	return quickPick(emulators, { placeHolder: 'Select emulator' });
}

export async function selectUpdates (updates: UpdateInfo[]) {
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

export async function selectDevice (platform: string, target: string) {
	if (platform === 'android' && target === 'emulator') {
		return selectAndroidEmulator();
	} else if (platform === 'android' && target === 'device') {
		return selectAndroidDevice();
	} else if (platform === 'ios' && target === 'device') {
		return selectiOSDevice();
	} else if (platform === 'ios' && target === 'simulator') {
		const simVersion = await selectiOSSimulatorVersion();
		return selectiOSSimulator(simVersion.label);
	} else {
		throw new Error(`Unsupported platform and combination target ${platform} + ${target}`);
	}
}

export async function enterWindowsSigningInfo (lastUsed?: string, savedCertPath?: string) {
	const location = await selectWindowsCertificate(lastUsed, savedCertPath);

	if (location && !await pathExists(location)) {
		throw new InteractionError(`The certificate file ${location} does not exist`);
	}
	const password = await enterPassword({ placeHolder: 'Enter the certificate password' });

	return {
		location,
		password
	};
}

export async function selectWindowsCertificate (lastUsed?: string, savedCertPath?: string) {
	const items = [
		{
			label: 'Browse for certificate',
			id: 'browse'
		},
		{
			label: 'Create certificate',
			id: 'create'
		}
	];
	if (lastUsed) {
		items.push({
			label: `Last used ${lastUsed}`,
			id: 'last'
		});
	}
	if (savedCertPath) {
		items.push({
			label: `Saved ${savedCertPath}`,
			id: 'saved'
		});
	}
	const certificateAction = await quickPick(items, { placeHolder: 'Browse for certificate or use last certificate' });
	if (certificateAction.id === 'browse') {
		const uri = await window.showOpenDialog({ canSelectFolders: false, canSelectMany: false });
		if (!uri) {
			throw new UserCancellation();
		}
		return uri[0].path;
	} else if (certificateAction.id === 'create') {
		return undefined;
	} else if (savedCertPath && certificateAction.id === 'saved') {
		if (!path.isAbsolute(savedCertPath)) {
			savedCertPath = path.resolve(workspace.rootPath!, savedCertPath);
		}
		return savedCertPath;
	} else if (certificateAction.id === 'last' && lastUsed) {
		return lastUsed;
	}
}
