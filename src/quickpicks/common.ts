import * as path from 'path';
import appc from '../appc';
import * as utils from '../utils';

import { pathExists } from 'fs-extra';
import { UpdateInfo } from 'titanium-editor-commons/updates';
import { InputBoxOptions, OpenDialogOptions, QuickPickOptions, Uri, window, workspace } from 'vscode';
import { InteractionError, UserCancellation } from '../commands/common';
import { ExtensionContainer } from '../container';

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
	const shouldDelete = await window.showQuickPick([ 'Yes', 'No' ], options);
	if (shouldDelete.toLowerCase() !== 'yes' || shouldDelete.toLowerCase() === 'y') {
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

export async function quickPick (items: any[], quickPickOptions?: QuickPickOptions, { forceShow = false } = {}) {
	if (items.length === 1 && !forceShow) {
		return items[0];
	}
	const result = await window.showQuickPick(items, quickPickOptions);
	if (!result) {
		throw new UserCancellation();
	}
	return result;
}

export function selectPlatform (lastBuildDescription?: any) {
	const platforms = utils.platforms().map(platform => ({ label: utils.nameForPlatform(platform), id: platform }));
	if (lastBuildDescription) {
		platforms.unshift({
			label: `Last: ${lastBuildDescription}`,
			id: 'last'
		});
	}
	return quickPick(platforms);
}

export async function selectCreationLocation (lastUsed?) {
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
	} else {
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
	const devices = appc.androidDevices().map(({ id, name }) => ({ label: name, udid: id }));
	return quickPick(devices);
}

export function selectAndroidEmulator () {
	const emulators: any = appc.androidEmulators();
	const options = [];

	for (const emulator of emulators.AVDs) {
		options.push({
			udid: emulator.id,
			label: emulator.name
		});
	}

	for (const emulator of emulators.Genymotion) {
		options.push({
			udid: emulator.id,
			label: emulator.name
		});
	}

	return quickPick(options, { placeHolder: 'Select emulator' });
}

export async function selectAndroidKeystore (lastUsed, savedKeystorePath) {
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
		return uri[0].path;
	} else if (keystoreAction.id === 'saved') {
		if (!path.isAbsolute(savedKeystorePath)) {
			savedKeystorePath = path.resolve(workspace.rootPath, savedKeystorePath);
		}
		return savedKeystorePath;
	} else {
		return lastUsed;
	}
}

export async function enterAndroidKeystoreInfo (lastUsed, savedKeystorePath) {
	const location = await selectAndroidKeystore(lastUsed, savedKeystorePath);

	if (!await pathExists(location)) {
		throw new InteractionError(`The Keystore file ${location} does not exist`);
	}
	const alias = await inputBox({ placeHolder: 'Enter your keystore alias', value: ExtensionContainer.config.android.keystoreAlias });
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
	const certificateType = buildType === 'run' ? 'developer' : 'distribution';
	const certificates = appc.iOSCertificates(certificateType).map(cert => ({
		description: `Expires: ${new Date(cert.after).toLocaleString('en-US')}`,
		label: cert.name,
		pem: cert.pem
	}));
	return quickPick(certificates, { placeHolder: 'Select certificate' });
}

export function selectiOSProvisioningProfile (certificate: any, target: string, appId) {
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
		uuid
	}));
	return quickPick(profiles, { placeHolder: 'Select provisioning profile' });
}

export async function selectiOSCodeSigning (buildType: string, target: string, appId: string) {
	const certificate = await selectiOSCertificate(buildType);

	const provisioningProfile = await selectiOSProvisioningProfile(certificate, target, appId);
	return {
		certificate,
		provisioningProfile
	};
}

export function selectiOSDevice () {
	const devices = appc.iOSDevices().map(device => ({ label: device.name, udid: device.udid }));
	return quickPick(devices, { placeHolder: 'Select device' });
}

export async function selectiOSSimulator (iOSVersion) {
	if (!iOSVersion) {
		iOSVersion = await selectiOSSimulatorVersion();
	}
	const simulators = appc.iOSSimulators()[iOSVersion].map(({ name, udid }) => ({ label: `${name} (${iOSVersion})`, udid, version: iOSVersion }));
	return quickPick(simulators, { placeHolder: 'Select simulator'});
}

export function selectiOSSimulatorVersion () {
	return quickPick(appc.iOSSimulatorVersions(), { placeHolder: 'Select simulator version' });
}

export function selectWindowsDevice () {
	const devices = appc.windowsDevices().map(({ name, udid}) => ({ label: name, udid }));
	return quickPick(devices, { placeHolder: 'Select device' });
}

export function selectWindowsEmulator () {
	const emulators = appc.windowsEmulators()['10.0'].map(({ name, udid }) => ({ label: name, udid }));
	return quickPick(emulators, { placeHolder: 'Select emulator' });
}

export async function selectUpdates (updates: UpdateInfo[]) {
	const choices = updates
		.map(update => ({
			label: `${update.productName}: ${update.latestVersion}`,
			action: update.action,
			latestVersion: update.latestVersion,
			priority: update.priority,
			picked: true,
			productName: update.productName
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

	return selected;
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
		return selectiOSSimulator(simVersion);
	}
}
