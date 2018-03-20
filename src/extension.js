const vscode = require('vscode');
const moment = require('moment');
const Appc = require('./appc');
const utils = require('./utils');
const related = require('./related');
const viewCompletionItemProvider = require('./providers/viewCompletionItemProvider');
const styleCompletionItemProvider = require('./providers/styleCompletionItemProvider');
const controllerCompletionItemProvider = require('./providers/controllerCompletionItemProvider');
const tiappCompletionItemProvider = require('./providers/tiappCompletionItemProvider');
const viewDefinitionProvider = require('./providers/viewDefinitionProvider');
const styleDefinitionProvider = require('./providers/styleDefinitionProvider');
const controllerDefinitionProvider = require('./providers/controllerDefinitionProvider');
const definitionProviderHelper = require('./providers/definitionProviderHelper');
const completionItemProviderHelper = require('./providers/completionItemProviderHelper');

let runOptions = {};
let extensionContext = {};

/**
 * Activate
 *
 * @param {Object} context 	extension context
 */
function activate(context) {

	extensionContext = context;

	definitionProviderHelper.activate(context.subscriptions);

	const viewFilePattern = '**/app/{views,widgets}/**/*.xml';
	const styleFilePattern = '**/*.tss';
	const controllerFilePattern = '{**/app/controllers/**/*.js,**/app/lib/**/*.js,**/app/widgets/**/*.js,**/app/alloy.js}';

	context.subscriptions.push(
		// register completion providers
		vscode.languages.registerCompletionItemProvider({ pattern: viewFilePattern }, viewCompletionItemProvider),
		vscode.languages.registerCompletionItemProvider({ pattern: styleFilePattern }, styleCompletionItemProvider),
		vscode.languages.registerCompletionItemProvider({ pattern: controllerFilePattern }, controllerCompletionItemProvider, '.'),
		vscode.languages.registerCompletionItemProvider({ pattern: '**/tiapp.xml' }, tiappCompletionItemProvider),

		// register hover providers
		vscode.languages.registerHoverProvider({ pattern: '**/{*.xml,*.tss,*.js}' }, definitionProviderHelper),

		// register definition providers
		vscode.languages.registerDefinitionProvider({ pattern: viewFilePattern }, viewDefinitionProvider),
		vscode.languages.registerDefinitionProvider({ pattern: styleFilePattern }, styleDefinitionProvider),
		vscode.languages.registerDefinitionProvider({ pattern: controllerFilePattern }, controllerDefinitionProvider),

		// register code action providers
		vscode.languages.registerCodeActionsProvider({ pattern: viewFilePattern }, viewDefinitionProvider),

		// register commands
		vscode.commands.registerCommand('appcelerator-titanium.init', () => {
			init();
		}),
		vscode.commands.registerCommand('appcelerator-titanium.run', () => {
			if (Appc.buildInProgress()) {
				vscode.window.showErrorMessage('Build in progress');
				return;
			}

			runOptions = {
				buildCommand: 'run'
			};

			selectPlatform()
				.then(platform => {
					if (platform) {
						if (platform.id === 'lastRun') {
							runOptions = extensionContext.workspaceState.get('lastRunOptions');
							run(runOptions);
						} else {
							runOptions.platform = platform;
							return selectTarget();
						}
					}
				})
				.then(targetType => {
					if (!targetType) {
						return;
					}
					runOptions.targetType = targetType;
					if (runOptions.platform.id === 'ios') {
						if (targetType.id === 'simulator') {
							selectiOSSimulator()
								.then(target => {
									if (target) {
										runOptions.target = target;
										run(runOptions);
									}
								});
						} else if (targetType.id === 'device') {
							selectiOSDevice()
								.then(target => {
									if (target) {
										runOptions.target = target;
										return selectiOSCodeSigning();
									}
								})
								.then(profile => {
									if (profile) {
										runOptions.provisioningProfile = profile;
										run(runOptions);
									}
								});
						}
					} else if (runOptions.platform.id === 'android') {
						if (targetType.id === 'emulator') {
							selectAndroidEmulator()
								.then(target => {
									if (target) {
										runOptions.target = target;
										run(runOptions);
									}
								});
						} else if (targetType.id === 'device') {
							selectAndroidDevice()
								.then(target => {
									if (target) {
										runOptions.target = target;
										run(runOptions);
									}
								});
						}
					}
				});
		}),
		vscode.commands.registerCommand('appcelerator-titanium.dist', () => {
			if (Appc.buildInProgress()) {
				vscode.window.showErrorMessage('Build in progress');
				return;
			}

			runOptions = {
				buildCommand: 'dist-appstore'
			};

			selectPlatform()
				.then(platform => {
					if (platform) {
						runOptions.platform = platform;
						if (runOptions.platform.id === 'ios') {
							selectiOSDistribution()
								.then(target => {
									if (target) {
										runOptions.target = target;
										runOptions.buildCommand = target.id;
										return selectiOSCodeSigning();
									}
								})
								.then(profile => {
									if (profile) {
										runOptions.provisioningProfile = profile;
										run(runOptions);
									}
								});
						} else if (runOptions.platform.id === 'android') {

						}
					}
				});
		}),
		vscode.commands.registerCommand('appcelerator-titanium.stop', () => {
			Appc.stop();
		}),
		vscode.commands.registerCommand('appcelerator-titanium.set-log-level', () => {
			vscode.window.showQuickPick([ 'Trace', 'Debug', 'Info', 'Warn', 'Error' ], {placeHolder: 'Select log level'}).then(level => {
				if (level) {
					extensionContext.globalState.update('logLevel', level.toLowerCase());
				}
			});
		}),
		vscode.commands.registerCommand('appcelerator-titanium.open-related-view', () => {
			related.openRelatedFile('xml');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.open-related-style', () => {
			related.openRelatedFile('tss');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.open-related-controller', () => {
			related.openRelatedFile('js');
		}),
		vscode.commands.registerCommand('appcelerator-titanium.toggle-related-files', () => {
			related.openAllFiles();
		}),
		vscode.commands.registerCommand('appcelerator-titanium.generate-autocomplete-suggestions', () => {
			vscode.workspace.getConfiguration('appcelerator-titanium.general').update('generateAutoCompleteSuggestions', true, true).then(() => {
				completionItemProviderHelper.generateCompletions(null, (success) => {
					if (success) {
						delete require.cache[require.resolve('./providers/completions')];
						viewCompletionItemProvider.loadCompletions();
						styleCompletionItemProvider.loadCompletions();
						controllerCompletionItemProvider.loadCompletions();
					}
				});
				
			});
		})
	);

	init();
}
exports.activate = activate;

/**
 * Deactivate
*/
function deactivate() {
}
exports.deactivate = deactivate;

/**
 * Initialise extension - fetch appc info
*/
function init() {
	vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Fetching Appcelerator envionment...' }, p => {
		return new Promise((resolve, reject) => {
			Appc.getInfo((info) => {
				if (info) {
					completionItemProviderHelper.generateCompletions(p, (success) => {
						if (success) {
							resolve();
						} else {
							vscode.window.showErrorMessage('Error fetching Appcelerator environment');
							reject();
						}
					});
				} else {
					vscode.window.showErrorMessage('Error fetching Appcelerator environment');
					reject();
				}
			});
		});
	});
}

/**
 * Select platform
 *
 * @returns {Thenable}
*/
function selectPlatform() {
	const items = [
		{
			label: 'iOS',
			id: 'ios'
		},
		{
			label: 'Android',
			id: 'android'
		}
	];

	const opts = {placeHolder: 'Select platform'};

	const lastRunOptions = extensionContext.workspaceState.get('lastRunOptions');
	if (lastRunOptions) {
		items.splice(0, 0, { 
			label: 'Last run',
			description: lastRunDescription(lastRunOptions),
			id: 'lastRun' 
		});
		opts.placeHolder = 'Select platform or last run destination';
	}
	return vscode.window.showQuickPick(items, opts);
}

/**
 * Returns description for last run
 *
 * @param {Object} opts run options
 */
function lastRunDescription(opts) {
	if (opts.platform.id === 'ios' && opts.targetType.id === 'device') {
		return `${opts.target.label} (${opts.certificate.name} | ${opts.provisioningProfile.label})`;
	} else {
		return `${opts.platform.label} ${opts.targetType.id} ${opts.target.label}`;
	} 
}

/**
 * Select target: simulator/emulator or device
 *
 * @returns {Thenable}
*/
function selectTarget() {
	return vscode.window.showQuickPick([ {
		label: (runOptions.platform.id === 'android') ? 'Emulator' : 'Simulator',
		id: (runOptions.platform.id === 'android') ? 'emulator' : 'simulator'
	},
	{
		label: 'Device',
		id: 'device'
	} ], {placeHolder: 'Select target'});
}

/**
 * Select iOS simulator
 *
 * @returns {Thenable}
*/
function selectiOSSimulator() {
	return vscode.window.showQuickPick(Object.keys(Appc.iOSSimulators()), {placeHolder: 'Select iOS version'}).then(version => {
		const simulators = Appc.iOSSimulators()[version].map(simulator => {
			return {
				udid: simulator.udid,
				label: `${simulator.name} (${version})`,
				version: version
			};
		});
		return vscode.window.showQuickPick(simulators, {placeHolder: 'Select simulator'});
	});
}

/**
 * Select iOS device
 *
 * @returns {Thenable}
*/
function selectiOSDevice() {
	const devices = Appc.iOSDevices().map(device => {
		return {
			udid: device.udid,
			label: device.name
		};
	});
	return vscode.window.showQuickPick(devices, {placeHolder: 'Select device'});
}

/**
 * Select iOS code signing: certificate and provisioning profile
 *
 * @returns {Thenable}
*/
function selectiOSCodeSigning() {
	return selectiOSCertificate()
		.then(selectedCertificate => {
			if (!selectedCertificate) {
				return;
			}

			const certificate = Appc.iOSCertificates(runOptions.buildCommand === 'run' ? 'developer' : 'distribution').find(cert => cert.pem === selectedCertificate.pem);
			runOptions.certificate = certificate;
			return selectiOSProvisioningProfile();
		});
}

/**
 * Select iOS certificate
 *
 * @returns {Thenable}
 */
function selectiOSCertificate() {
	const certificates = Appc.iOSCertificates(runOptions.buildCommand === 'run' ? 'developer' : 'distribution').map(certificate => {
		return {
			label: `${certificate.name}`,
			description: `expires ${moment(certificate.after).format('D MMM YYYY HH:mm')}`,
			pem: certificate.pem
		};
	});
	return vscode.window.showQuickPick(certificates, {placeHolder: 'Select certificate'});
}

/**
 * Select iOS provisioning profile
 *
 * @returns {Thenable}
*/
function selectiOSProvisioningProfile() {
	const profiles = [];
	let deployment = 'development';
	if (runOptions.buildCommand === 'dist-adhoc') {
		deployment = 'distribution';
	} else if (runOptions.buildCommand === 'dist-appstore') {
		deployment = 'appstore';
	}
	Appc.iOSProvisioningProfiles(deployment, runOptions.certificate).forEach(profile => {
		if (!profile.disabled) {
			const item = {
				label: profile.name,
				description: profile.uuid,
				uuid: profile.uuid
			};
			if (vscode.workspace.getConfiguration('appcelerator-titanium.iOS').get('showProvisioningProfileDetail')) {
				item.detail = `expires ${moment(profile.expirationDate).format('D MMM YYYY HH:mm')} | ${profile.appId}`;
			}
			profiles.push(item);
		}
	});
	return vscode.window.showQuickPick(profiles, {placeHolder: 'Select provisioning profile'});
}

/**
 * Select Android emulator
 *
 * @returns {Thenable}
*/
function selectAndroidEmulator() {
	const emulators = Appc.androidEmulators();
	let options = [];
	if (emulators.AVDs.length > 0) {
		emulators.AVDs.forEach(emulator => {
			options.push({
				udid: emulator.id,
				label: emulator.name
			});
		});
	}
	if (emulators.Genymotion.length > 0) {
		emulators.Genymotion.forEach(emulator => {
			options.push({
				udid: emulator.id,
				label: emulator.name
			});
		});
	}
	return vscode.window.showQuickPick(options, {placeHolder: 'Select emulator'});
}

/**
 * Select Android device
 *
 * @returns {Thenable}
*/
function selectAndroidDevice() {
	const devices = Appc.androidDevices().map(device => {
		return {
			udid: device.udid,
			label: device.name
		};
	});
	return vscode.window.showQuickPick(devices, {placeHolder: 'Select device'});
}

/**
 * Select iOS distribution
 *
 * @returns {Thenable}
*/
function selectiOSDistribution() {
	return vscode.window.showQuickPick([ {
		label: 'App Store',
		id: 'dist-appstore'
	},
	{
		label: 'Ad-Hoc',
		id: 'dist-adhoc'
	} ]);
}

/**
 * Run
 *
 * @param {Object} opts 	run options
 */
function run(opts) {
	// console.log(JSON.stringify(opts, null, 4));
	let args = [ '-p', opts.platform.id, '--project-dir', vscode.workspace.rootPath, '--log-level', extensionContext.globalState.get('logLevel', 'info') ];

	if (opts.buildCommand === 'run') {
		extensionContext.workspaceState.update('lastRunOptions', opts);
		args = args.concat([ '--target', opts.targetType.id, '--device-id', opts.target.udid ]);

		if (opts.targetType.id === 'device' && opts.platform.id === 'ios') {
			args = args.concat([
				'--developer-name', opts.certificate.name,
				'--pp-uuid', opts.provisioningProfile.uuid
			]);
		}
	} else if (opts.buildCommand) {
		args = args.concat([ '--target', opts.buildCommand, '--output-dir', utils.distributionOutputDirectory() ]);
		if (opts.platform.id === 'ios') {
			args = args.concat([
				'--distribution-name', opts.certificate.name,
				'--pp-uuid', opts.provisioningProfile.uuid
			]);
		}
	}

	// console.log(JSON.stringify(args, null, 4));

	// return;

	if (opts.platform && opts.target) {
		vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: `Building for ${opts.platform.label} ${opts.target.label}...` }, p => {
			return new Promise((resolve) => {
				Appc.run({
					args,
					error: () => {
						resolve();
					},
					exit: () => {
						resolve();
					}
				});
			});
		});
	}
}
