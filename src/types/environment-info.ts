import { IosCert, ProvisioningProfile } from './common';

export interface AndroidDevice {
	id: string;
	device: string;
	name: string;
}

export interface AndroidEmulator {
	type: string;
	id: string;
	name: string;
}

export interface IosDevice {
	buildVersion: string;
	cpuArchitecture: string;
	deviceClass: string;
	deviceColor: string;
	hardwareModel: string;
	name: string;
	productType: string;
	productVersion: string;
	serialNumber: string;
	udid: string;
}

export interface IosSimulator {
	udid: string;
	name: string;
	version: string;
	type: string;
}

export interface TitaniumSDK {
	version: string;
	path: string;
	platforms: string[];
	githash: string;
	timestamp: string;
	fullversion?: string;
}

export interface WindowsEmulator {
	udid: string;
	name: string;
	uapVersion: string;
}

export interface WindowsDevice {
	udid: string;
	name: string;
}

export interface AppcInfo {
	android: {
		devices: AndroidDevice[];
		emulators: AndroidEmulator[];
		sdk: {
			executables: {
				adb: string;
			}
		}
	};
	ios: {
		certs: {
			keychains: {
				[key: string]: {
					developer: IosCert[];
					distribution: IosCert[];
				}
			}
		}
		devices: IosDevice[];
		simulators: {
			ios: {
				[key: string]: IosSimulator[]
			};
		};
		provisioning: {
			adhoc: ProvisioningProfile[];
			development: ProvisioningProfile[];
			distribution: ProvisioningProfile[];
			enterprise: ProvisioningProfile[];
		}
	};
	titanium: {
		[key: string]: TitaniumSDK
	};
	titaniumCLI: {
		version: string;
		selectedSDK: string;
	};
	windows: {
		devices: WindowsDevice[];
		emulators: {
			[key: string]: WindowsEmulator[];
		};
	};
}
