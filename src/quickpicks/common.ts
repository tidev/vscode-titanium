import appc from '../appc';
import * as utils from '../utils';

import { InputBoxOptions, OpenDialogOptions, QuickPickOptions, window } from 'vscode';
import { UserCancellation } from '../commands/common';

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

	if (!input) {
		throw new UserCancellation();
	}

	return input;
}

export async function quickPick (items: any[], options?: QuickPickOptions) {
	if (items.length === 1) {
		return items[0];
	}
	const result = await window.showQuickPick(items, options);
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

export async function selectAndroidKeystore (lastUsed) {
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
	const keystoreAction = await quickPick(items, { placeHolder: 'Browse for keystore or use last keystore' });
	if (keystoreAction.id === 'browse') {
		const uri = await window.showOpenDialog({ canSelectFolders: false, canSelectMany: false });
		return uri[0].path;
	} else {
		return lastUsed;
	}
}

export async function enterAndroidKeystoreInfo (lastUsed) {
	const location = await selectAndroidKeystore(lastUsed);
	const alias = await inputBox({ placeHolder: 'Enter your keystore alias' });
	const password = await enterPassword({ placeHolder: 'Enter your keystore password' });
	return {
		alias,
		location,
		password
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
	// TODO
}

export function selectWindowsEmulator () {
	// TODO
}
