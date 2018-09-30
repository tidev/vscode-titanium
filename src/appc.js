const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const { homedir } = require('os');

const Appc = {

	info: {},
	proc: null,

	/**
	 * Returns appc CLI session for current user
	 *
	 * @returns {Object}
	 */
	session() {
		const sessionPath = path.join(homedir(), '.appcelerator/appc-cli.json');
		if (fs.existsSync(sessionPath)) {
			return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
		}
	},

	/**
	 * Returns true if user has active session
	 *
	 * @returns {Boolean}
	 */
	isUserLoggedIn() {
		const session = this.session();
		if (session && session.hasOwnProperty('session') && session.hasOwnProperty('expiry')) {
			return (session.expiry - +new Date() > 0);
		}
	},

	/**
	 * Get info
	 *
	 * @param {Function} callback	callback function
	 */
	getInfo(callback) {
		let result = '';
		const proc = spawn('appc', [ 'info', '-o', 'json' ]);
		proc.stdout.on('data', data => result += data);
		// proc.stderr.on('data', data => console.log(data));
		proc.on('close', () => {
			if (result && result.length) {
				Appc.info = JSON.parse(result);
				callback && callback(Appc.info);
			} else {
				callback && callback({});
			}
		});
	},

	/**
	 * Returns OS name for current platform
	 *
	 * @returns {String}
	*/
	os () {
		const name = Appc.info.os.name;
		if (/mac/i.test(name)) {
			return 'darwin';
		} else if (/win/i.test(name)) {
			return 'win32';
		}
		return 'linux';
	},

	/**
	 * SDKs
	 *
	 * @param {Boolean} isGA    limit to only GA releases, default false
	 * @returns {Array}
	 */
	sdks(isGA = false) {
		if (Appc.info.titanium) {
			let keys = Object.keys(Appc.info.titanium);
			for (const key of keys) {
				Appc.info.titanium[key].fullversion = key;
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

			return keys.map(key => Appc.info.titanium[key]);
		}
		return [];
	},

	/**
	 * Latest SDKs
	 *
	 * @param {Boolean} isGA    limit to only GA releases, default false
	 * @param {Object} SDK      latest SDK based on version number
	 * @returns {Object}
	 */
	latestSdk(isGA = true) {
		const sdks = Appc.sdks(isGA);
		if (sdks.length > 0) {
			return sdks[0];
		}
	},

	/**
	 * Selected SDK
	 *
	 * @returns {Object}
	 */
	selectedSdk() {
		if (Appc.info.titaniumCLI) {
			const selectedVersion = Appc.info.titaniumCLI.selectedSDK;
			let sdk;
			if (selectedVersion) {
				sdk = Appc.info.titanium[selectedVersion];
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
	},

	/**
	 * iOS simulators
	 *
	 * @returns {Object}
	 */
	iOSSimulators() {
		if (Appc.info.ios && Appc.info.ios.simulators) {
			return Appc.info.ios.simulators.ios;
		}
		return {};
	},

	/**
	 * iOS devices
	 *
	 * @returns {Array}
	 */
	iOSDevices() {
		if (Appc.info.ios && Appc.info.ios.devices) {
			return Appc.info.ios.devices;
		}
		return [];
	},

	/**
	 * iOS targets
	 *
	 * @returns {Object}
	 */
	iOSTargets() {
		return {
			devices: this.iOSDevices(),
			simulators: this.iOSSimulators()
		};
	},

	/**
	 * Android emulators
	 *
	 * @returns {Object}
	 */
	androidEmulators() {
		if (Appc.info.android && Appc.info.android.emulators.length) {
			var emulators = {
				AVDs: [],
				Genymotion: []
			};
			for (const emulator of Appc.info.android.emulators) {
				if (emulator.type === 'avd') {
					emulators.AVDs.push(emulator);
				} else if (emulator.type === 'genymotion') {
					emulators.Genymotion.push(emulator);
				}
			}
			return emulators;
		}
		return {};
	},

	/**
	 * Android devices
	 *
	 * @returns {Array}
	 */
	androidDevices() {
		if (Appc.info.android && Appc.info.android.devices) {
			return Appc.info.android.devices;
		}
		return [];
	},

	/**
	 * Android targets
	 *
	 * @returns {Object}
	 */
	androidTargets() {
		return {
			devices: this.androidDevices(),
			emulators: this.androidEmulators()
		};
	},

	/**
	 * Windows devices
	 *
	 * @returns {Array}
	 */
	windowsDevices() {
		if (Appc.info.windows && Appc.info.windows.devices) {
			return Appc.info.windows.devices;
		}
		return [];
	},

	/**
	 * Windows emulators
	 *
	 * @returns {Array}
	 */
	windowsEmulators() {
		if (Appc.info.windows && Appc.info.windows.emulators) {
			return Appc.info.windows.emulators;
		}
		return [];
	},

	/**
	 * Windows targets
	 *
	 * @returns {Object}
	 */
	windowsTargets() {
		return {
			devices: this.windowsDevices(),
			emulators: this.windowsEmulators()
		};
	},

	/**
	 * iOS certificates
	 *
	 * @param {String} type     developer (default), distribution
	 * @returns {Array}
	 */
	iOSCertificates(type = 'developer') {
		var certificates = [];
		if (Appc.info.ios && Appc.info.ios.certs) {
			for (let keychain in Appc.info.ios.certs.keychains) {
				certificates = certificates.concat(Appc.info.ios.certs.keychains[keychain][type]);
			}
		}
		return certificates;
	},

	/**
	 * iOS provisioning profiles
	 *
	 * @param {String} deployment   development (default), distribution, appstore
	 * @param {Object} certificate  enable by matching certificate
	 * @param {String} appId        enable by matching app ID
	 * @returns {Array}
	 */
	iOSProvisioningProfiles(deployment = 'development', certificate = {}, appId) {
		var pem;
		if (certificate.pem) {
			pem = certificate.pem.replace('-----BEGIN CERTIFICATE-----', '');
			pem = pem.replace('-----END CERTIFICATE-----', '');
			pem = pem.replace(/[\n\r]/g, '');
		}
		var profiles = [];
		if (Appc.info.ios && Appc.info.ios.provisioning) {

			var deploymentProfiles = [];
			if (deployment === 'development') {
				deploymentProfiles = Appc.info.ios.provisioning.development;
			} else if (deployment === 'distribution') {
				deploymentProfiles = Appc.info.ios.provisioning.adhoc;
				deploymentProfiles = deploymentProfiles.concat(Appc.info.ios.provisioning.enterprise);
			} else if (deployment === 'appstore') {
				deploymentProfiles = Appc.info.ios.provisioning.distribution;
			}

			for (const profile of deploymentProfiles) {
				profile.disabled = false;
				if (profile.managed) {
					profile.disabled = true;
				} else if (pem && profile.certs.indexOf(pem) === -1) {
					profile.disabled = true;
				} else if (appId && !utils.iOSProvisioinngProfileMatchesAppId(profile.appId, appId)) {
					profile.disabled = true;
				}
				profiles.push(profile);
			}
		}
		return profiles;
	},

	buildInProgress() {
		return (this.proc !== null);
	},

	/**
	 * Run `appc run` command
	 *
	 * @param {Object} opts arguments
	 */
	run(opts) {
		if (this.proc) {
			return;
		}
		let channel = vscode.window.createOutputChannel('Appcelerator');
		const cmd = vscode.workspace.getConfiguration('appcelerator-titanium.general').get('appcCommandPath');
		if (vscode.workspace.getConfiguration('appcelerator-titanium.general').get('displayBuildCommandInConsole')) {
			channel.append(`${cmd} run ${opts.args.join(' ')}\n\n`);
		}
		this.killed = false;
		this.proc = spawn(cmd, [ 'run' ].concat(opts.args));
		this.proc.stdout.on('data', data => {
			if (!this.killed) {
				let message = data.toString();
				channel.append(message);
			}
		});
		this.proc.stderr.on('data', data => {
			if (this.killed) {
				let message = data.toString();
				channel.append(message);
				opts.error && opts.error(message);
			}
		});
		this.proc.on('close', (code) => {
			// console.log(`Exited with code ${code}`);
			opts.exit && opts.exit(code);
			this.proc = null;
		});
		this.proc.on('exit', (code) => {
			// console.log(`Exited with code ${code}`);
			opts.exit && opts.exit(code);
			this.proc = null;
		});

		channel.show();
	},

	stop() {
		if (this.proc) {
			this.proc.kill('SIGKILL');
			this.proc = null;
			this.killed = true;
		}
	},

	/**
	 * Run `appc alloy generate` command
	 *
	 * @param {Object} opts				arguments
	 * @param {String} opts.type        what to generate (controller)
	 * @param {Array} opts.args         arguments to pass to alloy generate command
	 * @param {Function} opts.error		error callback function
	 */
	generate(opts) { // eslint-disable-line no-unused-vars
		// var args = [ 'alloy', 'generate', opts.type ];
		// if (opts.args && opts.args.length) {
		// 	args = args.concat(opts.args);
		// }
		// new BufferedProcess({
		// 	command: 'appc',
		// 	args,
		// 	options: {
		// 		cwd: atom.project.getPaths()[0]
		// 	},
		// 	stderr: output => {
		// 		output = output.replace(/\[[0-9]+m/g, '');
		// 		output = output.replace(/\[ERROR]/g, '');
		// 		output = output.replace(/^\W+/g, '');
		// 		output = output.charAt(0).toUpperCase() + output.slice(1);
		// 		opts.error && opts.error({
		// 			message: `Error generating ${opts.type} '${opts.name}'`,
		// 			detail: output
		// 		});
		// 	},
		// 	exit: code => {
		// 		if (code !== 0) {
		// 			return;
		// 		}
		// 		const name = opts.args[0];
		// 		let files = [];
		// 		switch (opts.type) {
		// 			case 'controller':
		// 				files = [ `views/${name}.xml`, `styles/${name}.tss`, `controllers/${name}.js` ];
		// 				break;
		// 			case 'view':
		// 				files = [ `views/${name}.xml` ];
		// 				break;
		// 			case 'style':
		// 				files = [ `styles/${name}.tss` ];
		// 				break;
		// 			case 'model':
		// 				files = [ `models/${name}.js` ];
		// 				break;
		// 			case 'widget':
		// 				files = [ `widgets/${name}/views/widget.xml`, `widgets/${name}/styles/widget.tss`, `widgets/${name}/controllers/widget.js` ];
		// 				break;
		// 			case 'jmk':
		// 				files = [ 'alloy.jmk' ];
		// 		}
		// 		for (const file of files) {
		// 			atom.workspace.open(path.join(atom.project.getPaths()[0], 'app', file));
		// 		}
		// 	}
		// });
	}
};

module.exports = Appc;
