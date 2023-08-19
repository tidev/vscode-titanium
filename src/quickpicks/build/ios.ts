import { ExtensionContainer } from '../../container';
import { Target } from '../..//types/cli';
import { IosCert, IosCertificateType, IosProvisioningType, ProvisioningProfile } from '../../types/common';
import { quickPick, CustomQuickPick } from '../common';
import { deviceQuickPick, DeviceQuickPickItem } from './common';
import { l10n } from 'vscode';

export async function selectiOSCertificate (buildType: string): Promise<IosCert> {
	const certificateType: IosCertificateType = buildType === 'run' ? 'developer' : 'distribution';
	const certificates = ExtensionContainer.environment.iOSCertificates(certificateType).map(cert => ({
		description: l10n.t('Expires: {0}', new Date(cert.after).toLocaleString('en-US')),
		label: cert.fullname,
		pem: cert.pem,
		id: cert.fullname
	}));
	const choice = await quickPick(certificates, { placeHolder: l10n.t('Select certificate') });

	const certificate = ExtensionContainer.environment.iOSCertificates(certificateType).find(cert => cert.pem === choice.pem);

	if (!certificate) {
		throw new Error(l10n.t('Unable to resolve certificate {0}', choice.label));
	}

	return certificate;
}

export async function selectiOSProvisioningProfile (certificate: IosCert, target: Target, appId: string): Promise<ProvisioningProfile> {
	let deployment: IosProvisioningType = 'development';
	if (target === 'dist-adhoc') {
		deployment = 'distribution';
	} else if (target === 'dist-appstore') {
		deployment = 'appstore';
	}
	const profiles = ExtensionContainer.environment.iOSProvisioningProfiles(deployment, certificate, appId);
	const choices = profiles.map(({ expirationDate, name, uuid }) => ({
		description: uuid,
		detail: l10n.t('Expires: {0}', new Date(expirationDate).toLocaleString('en-US')),
		label: name,
		uuid,
		id: uuid
	}));
	const choice = await quickPick(choices, { placeHolder: l10n.t('Select provisioning profile') });

	const profile = profiles.find(p => p.uuid === choice.uuid);

	if (!profile) {
		throw new Error(l10n.t('Unable to resolve provisioning profile {0}', choice.label));
	}

	return profile;
}

export function selectiOSDevice (): Promise<DeviceQuickPickItem> {
	const devices = ExtensionContainer.environment.iOSDevices().map(device => ({ id: device.udid, label: device.name, udid: device.udid }));
	return deviceQuickPick(devices, { placeHolder: l10n.t('Select device') });
}

export function selectiOSSimulatorVersion (): Promise<CustomQuickPick> {
	const versions = ExtensionContainer.environment.iOSSimulatorVersions().map(version => ({ id: version, label: version }));
	return quickPick(versions, { placeHolder: l10n.t('Select simulator version') });
}

export async function selectiOSSimulator (iOSVersion?: string): Promise<DeviceQuickPickItem> {
	if (!iOSVersion) {
		iOSVersion = (await selectiOSSimulatorVersion()).label;
	}
	if (!ExtensionContainer.environment.iOSSimulatorVersions().includes(iOSVersion)) {
		throw new Error(l10n.t('iOS Version {0} does not exist', iOSVersion));
	}
	const simulators = ExtensionContainer.environment.iOSSimulators()[iOSVersion].map(({ name, udid }) => ({ label: `${name} (${iOSVersion})`, id: udid, udid, version: iOSVersion }));
	return deviceQuickPick(simulators, { placeHolder: l10n.t('Select simulator') });
}
