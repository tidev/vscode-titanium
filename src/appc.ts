import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';

import { spawn } from 'child_process';
import { homedir } from 'os';
import { ExtensionContainer } from './container';
import { IosCert, IosCertificateType, ProvisioningProfile } from './types/common';
import { AndroidEmulator, AppcInfo, IosDevice, IosSimulator, TitaniumSDK, AndroidDevice } from './types/environment-info';
import { iOSProvisioningProfileMatchesAppId } from './utils';
import { GlobalState } from './constants';

export interface AlloyGenerateOptions {
	adapterType?: string;
	cwd: string;
	force?: boolean;
	type: string;
	name: string;
}

export class Appc {

	public info: AppcInfo|undefined;

	/**
	 * Returns true if user has active session
	 *
	 * @returns {Boolean}
	 */
	public isUserLoggedIn (): boolean {
		const session = this.session();
		if (session && Object.prototype.hasOwnProperty.call(session, 'session') && Object.prototype.hasOwnProperty.call(session, 'expiry')) {
			return (session.expiry - +new Date() > 0);
		} else {
			return false;
		}
	}

	/**
	 * Get info
	 *
	 * @param {Function} callback	callback function
	 */
	public getInfo (callback: (error: Error|null, info?: AppcInfo) => void): void {
		ExtensionContainer.context.globalState.update(GlobalState.RefreshEnvironment, true);
		let result = '';
		const proc = spawn('appc', [ 'info', '-o', 'json' ], { shell: true });
		proc.stdout.on('data', data => result += data);
		proc.on('close', () => {
			ExtensionContainer.context.globalState.update(GlobalState.RefreshEnvironment, false);
			if (result && result.length) {
				try {
					this.info = JSON.parse(result);
					return callback(null, this.info);
				} catch (error) {
					return callback(error);
				}
			} else {
				callback(new Error('Failed to get environment information'));
			}
		});
	}

	/**
	 * SDKs
	 *
	 * @param {Boolean} isGA    limit to only GA releases, default false
	 * @returns {Array}
	 */
	public sdks (isGA = false): TitaniumSDK[] {
		const sdks: TitaniumSDK[] = [];

		if (!this.info?.titanium) {
			return sdks;
		}

		let sdkVersions = Object.keys(this.info.titanium);
		for (const key of sdkVersions) {
			this.info.titanium[key].fullversion = key;
		}

		sdkVersions.sort((a, b) => {
			const aVersion = a.substr(0, a.lastIndexOf('.'));
			const aSuffix = a.substr(a.lastIndexOf('.') + 1);
			const bVersion = b.substr(0, b.lastIndexOf('.'));
			const bSuffix = b.substr(b.lastIndexOf('.') + 1);

			if (aVersion < bVersion) {
				return 1;
			} else if (aVersion > bVersion) {
				return -1;
			} else {
				if (aSuffix === bSuffix) {
					return 0;
				} else if (aSuffix === 'GA') {
					return -1;
				} else if (bSuffix === 'GA') {
					return 1;
				} else if (aSuffix === 'RC') {
					return -1;
				} else if (bSuffix === 'RC') {
					return 1;
				} else if (aSuffix < bSuffix) {
					return 1;
				} else if (aSuffix > bSuffix) {
					return -1;
				}
				return 0;
			}
		});

		if (isGA) {
			sdkVersions = sdkVersions.filter(key => key.indexOf('GA') > 0);
		}

		for (const key of sdkVersions) {
			sdks.push(this.info.titanium[key]);
		}

		return sdks;
	}

	/**
	 * Latest SDKs
	 *
	 * @param {Boolean} isGA    limit to only GA releases, default false
	 * @param {Object} SDK      latest SDK based on version number
	 * @returns {Object}
	 */
	public latestSdk (isGA = true): TitaniumSDK|undefined {
		const sdks = this.sdks(isGA);
		if (sdks.length > 0) {
			return sdks[0];
		}
	}

	/**
	 * Selected SDK
	 *
	 * @returns {Object}
	 */
	public selectedSdk (): TitaniumSDK|undefined {
		if (this.info?.titaniumCLI) {
			const selectedVersion = this.info.titaniumCLI.selectedSDK;
			let sdk;
			if (selectedVersion) {
				sdk = this.info.titanium[selectedVersion];
				sdk.fullversion = selectedVersion;
			}
			if (!sdk) {
				sdk = this.latestSdk();
				if (!sdk) {
					sdk = this.latestSdk(false);
				}
			}
			return sdk;
		}
	}

	public sdkInfo (version: string): TitaniumSDK|undefined {
		if (this.info?.titanium) {
			return this.info.titanium[version];
		}
	}

	/**
	 * iOS simulators
	 *
	 * @returns {Object}
	 */
	public iOSSimulators (): { [key: string]: IosSimulator[] } {
		if (this.info?.ios.simulators) {
			return this.info.ios.simulators.ios;
		}
		return {};
	}

	public iOSSimulatorVersions (): string[] {
		const sims = this.iOSSimulators();
		return Object.keys(sims).sort((a, b) => semver.compare(semver.coerce(a)!, semver.coerce(b)!)).reverse();
	}

	/**
	 * iOS devices
	 *
	 * @returns {Array}
	 */
	public iOSDevices (): IosDevice[] {
		if (this.info?.ios?.devices) {
			return this.info.ios.devices;
		}
		return [];
	}

	/**
	 * iOS targets
	 *
	 * @returns {Object}
	 */
	public iOSTargets (): { devices: IosDevice[]; simulators: { [key: string]: IosSimulator[] } } {
		return {
			devices: this.iOSDevices(),
			simulators: this.iOSSimulators()
		};
	}

	/**
	 * Android emulators
	 *
	 * @returns {Object}
	 */
	public androidEmulators (): { AVDs: AndroidEmulator[]; Genymotion: AndroidEmulator[] } {
		if (this.info?.android?.emulators?.length) {
			const emulators: { AVDs: AndroidEmulator[]; Genymotion: AndroidEmulator[] } = {
				AVDs: [],
				Genymotion: []
			};
			for (const emulator of this.info.android.emulators) {
				if (emulator.type === 'avd') {
					emulators.AVDs.push(emulator);
				} else if (emulator.type === 'genymotion') {
					emulators.Genymotion.push(emulator);
				}
			}
			return emulators;
		}
		return {
			AVDs: [],
			Genymotion: []
		};
	}

	/**
	 * Android devices
	 *
	 * @returns {Array}
	 */
	public androidDevices (): AndroidDevice[] {
		if (this.info?.android?.devices) {
			return this.info.android.devices;
		}
		return [];
	}

	/**
	 * Android targets
	 *
	 * @returns {Object}
	 */
	public androidTargets (): { devices: AndroidDevice[]; emulators: { AVDs: AndroidEmulator[]; Genymotion: AndroidEmulator[] }} {
		return {
			devices: this.androidDevices(),
			emulators: this.androidEmulators()
		};
	}

	/**
	 * iOS certificates
	 *
	 * @param {String} type     developer (default), distribution
	 * @returns {Array}
	 */
	public iOSCertificates (type: IosCertificateType = IosCertificateType.developer): IosCert[] {
		const certificates = [];
		if (this.info?.ios?.certs) {
			for (const keychain of Object.values(this.info.ios.certs.keychains)) {
				certificates.push(...keychain[type]);
			}
		}
		return certificates;
	}

	/**
	 * iOS provisioning profiles
	 *
	 * @param {String} deployment   development (default), distribution, appstore
	 * @param {Object} certificate  enable by matching certificate
	 * @param {String} appId        enable by matching app ID
	 * @returns {Array}
	 */
	public iOSProvisioningProfiles (deployment = 'development', certificate: IosCert, appId: string): ProvisioningProfile[] {
		let pem: string|undefined;
		if (certificate.pem) {
			pem = certificate.pem.replace('-----BEGIN CERTIFICATE-----', '');
			pem = pem.replace('-----END CERTIFICATE-----', '');
			pem = pem.replace(/[\n\r]/g, '');
		}
		const profiles = [];
		if (this.info?.ios?.provisioning) {

			let deploymentProfiles: ProvisioningProfile[] = [];
			if (deployment === 'development') {
				deploymentProfiles = this.info.ios.provisioning.development;
			} else if (deployment === 'distribution') {
				deploymentProfiles = this.info.ios.provisioning.adhoc;
				deploymentProfiles = deploymentProfiles.concat(this.info.ios.provisioning.enterprise);
			} else if (deployment === 'appstore') {
				deploymentProfiles = this.info.ios.provisioning.distribution;
			}

			for (const profile of deploymentProfiles) {
				if (profile.managed) {
					continue;
				} else if (pem && profile.certs.indexOf(pem) === -1) {
					continue;
				} else if (appId && !iOSProvisioningProfileMatchesAppId(profile.appId, appId)) {
					continue;
				}
				profiles.push(profile);
			}
		}
		return profiles;
	}

	/**
	 * Run `appc alloy generate` command
	 *
	 * @param {Object} opts - arguments.
	 * @param {String} [opts.adapterType] - Adapter to use for Alloy model
	 * @param {String} opts.cwd - Directory of the app.
	 * @param {Boolean} opts.force - Force creation of the component, will overwrite existing component.
	 * @param {String} opts.name -  Name of the component.
	 * @param {String} opts.type - Type to generate.
	 * @returns {Promise}
	 */
	public generate ({ adapterType, cwd, force, name, type }: AlloyGenerateOptions): Promise<void> {
		return new Promise((resolve, reject) => {
			const args = [ 'alloy', 'generate', type, name ];
			if (type === 'model') {
				args.push(adapterType!);
			}
			if (force) {
				args.push('--force');
			}
			const proc = spawn('appc', args, { cwd, shell: true });

			proc.on('close', code => {
				if (code) {
					// handle error
					return reject();
				}
				return resolve();
			});
		});
	}

	public getAdbPath (): string|undefined {
		if (this.info?.android?.sdk?.executables) {
			return this.info.android.sdk.executables.adb;
		}
	}

	/**
	 * Returns appc CLI session for current user.
	 *
	 * @returns {Object}
	 */
	private session (): { expiry: number }|undefined {
		const sessionPath = path.join(homedir(), '.appcelerator/appc-cli.json');
		if (fs.existsSync(sessionPath)) {
			return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
		}
	}
}

export default new Appc();
