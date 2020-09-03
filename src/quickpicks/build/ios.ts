import appc from '../../appc';
import { IosCertificateType } from '../../types/common';
import { quickPick, CustomQuickPick } from '../common';

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
