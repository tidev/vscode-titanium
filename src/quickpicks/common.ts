import * as path from 'path';
import appc from '../appc';
import * as utils from '../utils';

import { pathExists, ensureDir } from 'fs-extra';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { InputBoxOptions, QuickPickItem, QuickPickOptions, Uri, window, workspace } from 'vscode';
import { InteractionError, UserCancellation } from '../commands/common';
import { ExtensionContainer } from '../container';
import { IosCertificateType, UpdateChoice, KeystoreInfo } from '../types/common';

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

export function selectBuildTarget (platform: string): Promise<CustomQuickPick>  {
	const targets = utils.targetsForPlatform(platform)
		.filter(target => !/^dist/.test(target))
		.map(target => ({ label: utils.nameForTarget(target), id: target }));
	return quickPick(targets);
}

export function selectDistributionTarget (platform: string): Promise<CustomQuickPick>  {
	const targets = utils.targetsForPlatform(platform)
		.filter(target => /^dist/.test(target))
		.map(target => ({ label: utils.nameForTarget(target), id: target }));
	return quickPick(targets);
}

export function selectAndroidDevice (): Promise<CustomQuickPick & { udid: string }> {
	const devices = appc.androidDevices().map(({ id, name }: { id: string; name: string }) => ({ id, label: name, udid: id }));
	return quickPick(devices)  as Promise<CustomQuickPick & { udid: string }>;
}

export function selectAndroidEmulator (): Promise<CustomQuickPick & { udid: string }>  {
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

	return quickPick(options, { placeHolder: 'Select emulator' })  as Promise<CustomQuickPick & { udid: string }>;
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

export function selectiOSCertificate (buildType: string): Promise<CustomQuickPick> {
	const certificateType: IosCertificateType = buildType === 'run' ? IosCertificateType.developer : IosCertificateType.distribution;
	const certificates = appc.iOSCertificates(certificateType).map(cert => ({
		description: `Expires: ${new Date(cert.after).toLocaleString('en-US')}`,
		label: cert.fullname,
		pem: cert.pem,
		id: cert.fullname
	}));
	return quickPick(certificates, { placeHolder: 'Select certificate' });
}

export function selectiOSProvisioningProfile (certificate: any, target: string, appId: string): Promise<CustomQuickPick> {
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

export async function selectiOSCodeSigning (buildType: string, target: string, appId: string): Promise<{ certificate: CustomQuickPick; provisioningProfile: CustomQuickPick & { uuid: string } }> {
	const certificate = await selectiOSCertificate(buildType);

	const provisioningProfile = await selectiOSProvisioningProfile(certificate, target, appId) as CustomQuickPick & { uuid: string };
	return {
		certificate,
		provisioningProfile
	};
}

export function selectiOSDevice (): Promise<CustomQuickPick & { udid: string }> {
	const devices = appc.iOSDevices().map(device => ({ id: device.udid, label: device.name, udid: device.udid }));
	return quickPick(devices, { placeHolder: 'Select device' }) as Promise<CustomQuickPick & { udid: string }>;
}

export function selectiOSSimulatorVersion (): Promise<CustomQuickPick> {
	const versions = appc.iOSSimulatorVersions().map(version => ({ id: version, label: version }));
	return quickPick(versions, { placeHolder: 'Select simulator version' });
}

export async function selectiOSSimulator (iOSVersion?: string): Promise<CustomQuickPick & { udid: string }> {
	if (!iOSVersion) {
		iOSVersion = (await selectiOSSimulatorVersion()).label; // eslint-disable-line require-atomic-updates
	}
	if (!appc.iOSSimulatorVersions().includes(iOSVersion)) {
		throw new Error(`iOS Version ${iOSVersion} does not exist`);
	}
	const simulators = appc.iOSSimulators()[iOSVersion].map(({ name, udid }) => ({ label: `${name} (${iOSVersion})`, id: udid, udid, version: iOSVersion }));
	return quickPick(simulators, { placeHolder: 'Select simulator' }) as Promise<CustomQuickPick & { udid: string }>;
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

export async function selectDevice (platform: string, target: string): Promise<CustomQuickPick> {
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
