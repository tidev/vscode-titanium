import * as fs from 'fs-extra';
import * as path from 'path';
import * as semver from 'semver';

import { spawn } from 'child_process';
import { homedir } from 'os';
import { window } from 'vscode';
import { ExtensionContainer } from './container';
import { IosCert } from './types/common';
import { iOSProvisioinngProfileMatchesAppId } from './utils';

export interface AlloyGenerateOptions {
	adapterType?: string;
	cwd: string;
	force?: boolean;
	type: string;
	name: string;
}

export class Appc {

	private info: any;
	private proc: any;
	private killed: boolean;

	/**
	 * Returns true if user has active session
	 *
	 * @returns {Boolean}
	 */
	public isUserLoggedIn () {
		const session = this.session();
		if (session && session.hasOwnProperty('session') && session.hasOwnProperty('expiry')) {
			return (session.expiry - +new Date() > 0);
		}
	}

	/**
	 * Get info
	 *
	 * @param {Function} callback	callback function
	 */
	public getInfo (callback) {
		let result = '';
		const proc = spawn('appc', [ 'info', '-o', 'json' ], { shell: true });
		proc.stdout.on('data', data => result += data);
		proc.on('close', () => {
			if (result && result.length) {
				try {
					this.info = JSON.parse(result);
					return callback(null, this.info);
				} catch (error) {
					return callback(error);
				}
			} else {
				callback({});
			}
		});
	}

	/**
	 * SDKs
	 *
	 * @param {Boolean} isGA    limit to only GA releases, default false
	 * @returns {Array}
	 */
	public sdks (isGA = false) {
		if (this.info.titanium) {
			let keys = Object.keys(this.info.titanium);
			for (const key of keys) {
				this.info.titanium[key].fullversion = key;
			}

			keys.sort((a, b) => {
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
				keys = keys.filter(key => key.indexOf('GA') > 0);
			}

			return keys.map(key => this.info.titanium[key]);
		}
		return [];
	}

	/**
	 * Latest SDKs
	 *
	 * @param {Boolean} isGA    limit to only GA releases, default false
	 * @param {Object} SDK      latest SDK based on version number
	 * @returns {Object}
	 */
	public latestSdk (isGA = true) {
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
	public selectedSdk () {
		if (this.info.titaniumCLI) {
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

	public sdkInfo (version) {
		if (this.info.titanium) {
			return this.info.titanium[version];
		}
	}

	/**
	 * iOS simulators
	 *
	 * @returns {Object}
	 */
	public iOSSimulators () {
		if (this.info.ios && this.info.ios.simulators) {
			return this.info.ios.simulators.ios;
		}
		return {};
	}

	public iOSSimulatorVersions () {
		const sims = this.iOSSimulators();
		return Object.keys(sims).sort((a, b) => semver.compare(semver.coerce(a), semver.coerce(b))).reverse();
	}

	/**
	 * iOS devices
	 *
	 * @returns {Array}
	 */
	public iOSDevices () {
		if (this.info.ios && this.info.ios.devices) {
			return this.info.ios.devices;
		}
		return [];
	}

	/**
	 * iOS targets
	 *
	 * @returns {Object}
	 */
	public iOSTargets () {
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
	public androidEmulators () {
		if (this.info.android && this.info.android.emulators.length) {
			const emulators = {
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
		return {};
	}

	/**
	 * Android devices
	 *
	 * @returns {Array}
	 */
	public androidDevices () {
		if (this.info.android && this.info.android.devices) {
			return this.info.android.devices;
		}
		return [];
	}

	/**
	 * Android targets
	 *
	 * @returns {Object}
	 */
	public androidTargets () {
		return {
			devices: this.androidDevices(),
			emulators: this.androidEmulators()
		};
	}

	/**
	 * Windows devices
	 *
	 * @returns {Array}
	 */
	public windowsDevices () {
		if (this.info.windows && this.info.windows.devices) {
			return this.info.windows.devices;
		}
		return [];
	}

	/**
	 * Windows emulators
	 *
	 * @returns {Array}
	 */
	public windowsEmulators () {
		if (this.info.windows && this.info.windows.emulators) {
			return this.info.windows.emulators;
		}
		return [];
	}

	/**
	 * Windows targets
	 *
	 * @returns {Object}
	 */
	public windowsTargets () {
		return {
			devices: this.windowsDevices(),
			emulators: this.windowsEmulators()
		};
	}

	/**
	 * iOS certificates
	 *
	 * @param {String} type     developer (default), distribution
	 * @returns {Array}
	 */
	public iOSCertificates (type = 'developer') {
		const certificates = [];
		if (this.info.ios && this.info.ios.certs) {
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
	public iOSProvisioningProfiles (deployment = 'development', certificate: IosCert, appId) {
		let pem: string;
		if (certificate.pem) {
			pem = certificate.pem.replace('-----BEGIN CERTIFICATE-----', '');
			pem = pem.replace('-----END CERTIFICATE-----', '');
			pem = pem.replace(/[\n\r]/g, '');
		}
		const profiles = [];
		if (this.info.ios && this.info.ios.provisioning) {

			let deploymentProfiles = [];
			if (deployment === 'development') {
				deploymentProfiles = this.info.ios.provisioning.development;
			} else if (deployment === 'distribution') {
				deploymentProfiles = this.info.ios.provisioning.adhoc;
				deploymentProfiles = deploymentProfiles.concat(this.info.ios.provisioning.enterprise);
			} else if (deployment === 'appstore') {
				deploymentProfiles = this.info.ios.provisioning.distribution;
			}

			for (const profile of deploymentProfiles) {
				profile.disabled = false;
				if (profile.managed) {
					profile.disabled = true;
				} else if (pem && profile.certs.indexOf(pem) === -1) {
					profile.disabled = true;
				} else if (appId && !iOSProvisioinngProfileMatchesAppId(profile.appId, appId)) {
					profile.disabled = true;
				}
				if (!profile.disabled) {
					profiles.push(profile);
				}
			}
		}
		return profiles;
	}

	public buildInProgress () {
		return this.proc;
	}

	/**
	 * Run `appc run` command
	 *
	 * @param {Object} opts arguments
	 */
	public run (opts) {
		if (this.proc) {
			return;
		}
		const channel = window.createOutputChannel('Appcelerator');
		const cmd = ExtensionContainer.config.general.appcCommandPath;
		if (ExtensionContainer.config.general.displayBuildCommandInConsole) {
			channel.append(`${cmd} run ${opts.args.join(' ')}\n\n`);
		}
		this.killed = false;
		this.proc = spawn(cmd, [ 'run' ].concat(opts.args));
		this.proc.stdout.on('data', data => {
			if (!this.killed) {
				const message = data.toString();
				channel.append(message);
			}
		});
		this.proc.stderr.on('data', data => {
			if (this.killed) {
				const message = data.toString();
				channel.append(message);
				opts.error(message);
			}
		});
		this.proc.on('close', code => {
			// console.log(`Exited with code ${code}`);
			opts.exit(code);
			this.proc = null;
		});
		this.proc.on('exit', code => {
			// console.log(`Exited with code ${code}`);
			opts.exit(code);
			this.proc = null;
		});

		channel.show();
	}

	public stop () {
		if (this.proc) {
			this.proc.kill('SIGKILL');
			this.proc = null;
			this.killed = true;
		}
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
	public generate ({ adapterType, cwd, force, name, type }: AlloyGenerateOptions) {
		return new Promise((resolve, reject) => {
			const args = [ 'alloy', 'generate', type, name ];
			if (type === 'model') {
				args.push(adapterType);
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

	public async getAlloyVersion () {
		const appcPath = path.join(homedir(), '.appcelerator', 'install');
		const appcVersion = await fs.readFile(path.join(appcPath, '.version'), 'utf8');
		const alloyPath = path.join(appcPath, appcVersion, 'package', 'node_modules', 'alloy');
		const { version: alloyVersion } = await fs.readJSON(path.join(alloyPath, 'package.json'));
		return alloyVersion;
	}

	public getAdbPath () {
		if (this.info.android && this.info.android.sdk && this.info.android.sdk.executables) {
			return this.info.android.sdk.executables.adb;
		}
	}

	/**
	 * Returns appc CLI session for current user
	 *
	 * @returns {Object}
	 */
	private session () {
		const sessionPath = path.join(homedir(), '.appcelerator/appc-cli.json');
		if (fs.existsSync(sessionPath)) {
			return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
		}
	}
}

export default new Appc();
